import {mkdtemp,open,rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';
import {TwgConnection} from './twg-client';
import {parseBoardUrl} from './jira';
import {normalizeComment} from './comments';
import {newestComments,type JiraComment} from '../shared/comments';
import {TRANSFER_LIMIT} from '../shared/attachments';
import type {Connection} from '../shared/contracts';
import type {AttachmentSession} from './attachments';
const commentPage=z.object({apiVersion:z.literal('v2'),command:z.literal('jira.workitem.comment.query'),data:z.array(z.unknown()),pageInfo:z.object({hasNextPage:z.boolean(),nextCursor:z.string().nullable()})});
const file=z.object({id:z.string().regex(/^\d+$/),filename:z.string(),size:z.number().int().nonnegative(),mimeType:z.string(),created:z.string(),author:z.object({displayName:z.string()}).optional()});
const attachmentPage=z.object({apiVersion:z.literal('v2'),command:z.literal('jira.workitem.attachment.query'),data:z.array(file)});
export function twgContent(make=(path:string)=>new TwgConnection(path)){
 const active=new Set<TwgConnection>();let closed=false;let reserved=0;
 const cache=new Map<string,{bytes:Buffer;expires:number}>();
 const clean=()=>{for(const [k,v] of cache)if(v.expires<=Date.now())cache.delete(k);};
 const timer=setInterval(clean,30000);timer.unref();
 async function run<T>(config:Connection,action:(cli:TwgConnection,target:{site:string;profile:string})=>Promise<T>){
  if(closed)throw new Error('TWG connection closed.');
  const cli=make(config.twgExecutable);active.add(cli);
  try{await cli.requireProfileSupport();return await action(cli,{site:parseBoardUrl(config.boardUrl).site,profile:config.twgProfile});}
  catch(e){if(e instanceof z.ZodError)throw new Error('Incomplete or unsupported TWG content response.');throw e;}
  finally{cli.close();active.delete(cli);}
 }
 async function comments(config:Connection,key:string,start:number){
  return run(config,async(cli,target)=>{
   const all:JiraComment[]=[];const cursors=new Set<string>();const ids=new Set<string>();let cursor:string|undefined;
   for(let page=0;page<100;page++){
    const data=commentPage.parse(await cli.readComments(target,key,cursor));
    for(const raw of data.data){const c=normalizeComment(raw);if(ids.has(c.id))throw new Error('TWG returned duplicate comments.');ids.add(c.id);all.push(c);}
    if(!data.pageInfo.hasNextPage){const sorted=newestComments(all);const slice=sorted.slice(start,start+50);return {site:target.site,comments:slice,total:sorted.length,nextStart:start+slice.length<sorted.length?start+slice.length:null};}
    const next=data.pageInfo.nextCursor;if(!next||cursors.has(next)||!data.data.length)throw new Error('Incomplete TWG comment pagination.');cursors.add(next);cursor=next;
   }
   throw new Error('TWG comment pagination limit exceeded.');
  });
 }
 async function files(config:Connection,key:string){return run(config,async(cli,target)=>attachmentPage.parse(await cli.readAttachments(target,key)).data);}
 async function bytes(config:Connection,key:string,id:string){
  const item=(await files(config,key)).find(f=>f.id===id);
  if(!item)throw new Error('Attachment no longer belongs to this issue or is unavailable.');
  if(item.size>TRANSFER_LIMIT)throw new Error('This attachment exceeds the 25 MB in-app limit.');
  clean();const cacheKey=JSON.stringify([config.twgExecutable,config.twgProfile,parseBoardUrl(config.boardUrl).site,key,id,item.size,item.created]);
  const cached=cache.get(cacheKey);if(cached)return cached.bytes;
  if(reserved+item.size>50*1024*1024)throw new Error('Too many attachment downloads. Try again shortly.');
  reserved+=item.size;
  try{return await run(config,async(cli,target)=>{
   const directory=await mkdtemp(join(tmpdir(),'jira-twg-attachment-'));const path=join(directory,'content');
   try{
    await cli.downloadAttachment(target,id,path);
    const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
    let data:Buffer;
    try{const stat=await handle.stat();if(!stat.isFile()||stat.size!==item.size||stat.size>TRANSFER_LIMIT)throw new Error('Attachment download size did not match its metadata.');
     data=Buffer.alloc(item.size);let offset=0;while(offset<data.length){const read=await handle.read(data,offset,data.length-offset,offset);if(!read.bytesRead)throw new Error('Incomplete attachment download.');offset+=read.bytesRead;}
    }finally{await handle.close();}
    if(closed)throw new Error('TWG connection closed.');
    while(cache.size&&[...cache.values()].reduce((n,v)=>n+v.bytes.length,0)+data.length>50*1024*1024)cache.delete(cache.keys().next().value!);
    if(cache.size>=32)cache.delete(cache.keys().next().value!);
    cache.set(cacheKey,{bytes:data,expires:Date.now()+120000});return data;
   }finally{await rm(directory,{recursive:true,force:true});}
  });}finally{reserved-=item.size;}
 }
 function session(config:Connection):AttachmentSession{
  const site=parseBoardUrl(config.boardUrl).site;
  return {site,request:async(path,options={})=>{
   if(options.body)throw new Error('TWG attachment uploads are disabled.');
   const list=/^\/rest\/api\/3\/issue\/([A-Z][A-Z0-9_]*-[1-9]\d*)\?fields=attachment$/.exec(path);
   if(list)return Response.json({fields:{attachment:await files(config,list[1])}});
   // Content reads use the key-bound session below; arbitrary paths are rejected.
   throw new Error('Unsupported TWG attachment read.');
  }};
 }
 function issueSession(config:Connection,key:string):AttachmentSession{
  const base=session(config);return {...base,request:async(path,options={})=>{
   const match=/^\/rest\/api\/3\/attachment\/content\/(\d+)\?redirect=false$/.exec(path);
   if(!match)return base.request(path,options);
   if(options.body)throw new Error('TWG attachment uploads are disabled.');
   const data=await bytes(config,key,match[1]);const range=/^bytes=(\d+)-(\d+)$/.exec(options.range??'');
   if(!range)throw new Error('Attachment range required.');const start=Number(range[1]),end=Number(range[2]);
   if(start>end||end>=data.length)throw new Error('Invalid attachment range.');
   return new Response(new Uint8Array(data.subarray(start,end+1)),{status:206,headers:{'content-range':`bytes ${start}-${end}/${data.length}`}});
  }};
 }
 return {comments,session:issueSession,close(){closed=true;clearInterval(timer);cache.clear();for(const cli of active)cli.close();active.clear();}};
}
