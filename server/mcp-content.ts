import {z} from 'zod';
import type {McpBinding} from './mcp-binding';
import type {McpContentTool} from './mcp-tools';
import type {AttachmentSession} from './attachments';
import {readCommentPage} from './comments';
import {descriptionDocument} from './jira-html';
import {TRANSFER_LIMIT} from '../shared/attachments';
export interface McpContentReader {verifiedBinding():McpBinding;readContentTool(name:McpContentTool,args:Record<string,unknown>):Promise<unknown>}
const unwrap=(v:unknown)=>v&&typeof v==='object'&&'data' in v?(v as {data:unknown}).data:v;
export function mcpContent(fetcher:typeof fetch=fetch){
 const cache=new Map<string,{bytes:Buffer;until:number}>();
 async function call(reader:McpContentReader,site:string,name:McpContentTool,args:Record<string,unknown>){
  const before=reader.verifiedBinding();if(before.siteUrl!==site)throw Error('MCP site binding does not match.');
  const data=unwrap(await reader.readContentTool(name,{cloudId:before.cloudId,...args}));
  const after=reader.verifiedBinding();if(after.accountId!==before.accountId||after.cloudId!==before.cloudId||after.siteUrl!==site)throw Error('MCP account or site changed.');return data;
 }
 async function files(reader:McpContentReader,site:string,key:string){
  const result=z.object({key:z.literal(key),fields:z.object({attachment:z.array(z.object({id:z.string().regex(/^\d+$/),filename:z.string(),size:z.number().int().nonnegative(),mimeType:z.string().optional(),created:z.string(),author:z.object({displayName:z.string()}).optional()}))})}).parse(await call(reader,site,'getJiraIssue',{issueIdOrKey:key,fields:['attachment'],view:'full'}));
  return result.fields.attachment;
 }
 async function bytes(reader:McpContentReader,site:string,key:string,id:string){
  const file=(await files(reader,site,key)).find(f=>f.id===id);if(!file)throw Error('Attachment no longer belongs to this issue.');
  if(file.size>TRANSFER_LIMIT)throw Error('Attachment exceeds the 25 MB preview limit.');
  const binding=reader.verifiedBinding();const cacheKey=JSON.stringify([binding.accountId,binding.cloudId,key,id,file.size,file.created]);
  for(const [k,v] of cache)if(v.until<Date.now())cache.delete(k);
  const cached=cache.get(cacheKey);if(cached)return cached.bytes;
  const result=z.object({downloadUrl:z.string().url()}).parse(await call(reader,site,'downloadJiraIssueAttachment',{attachmentId:id}));
  const url=new URL(result.downloadUrl);
  // Signed downloads require no OAuth headers. Never execute a returned downloadCommand.
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['atlassian.com','atl-paas.net'].some(d=>url.hostname===d||url.hostname.endsWith('.'+d)))throw Error('Unsupported MCP attachment download host. Open the issue in Jira.');
  const response=await fetcher(url,{redirect:'error',signal:downloadTimeout()});
  if(!response.ok||!response.body)throw Error('Attachment download failed. Refresh and try again.');
  const stream=response.body.getReader();const chunks:Uint8Array[]=[];let total=0;
  try{for(;;){const r=await stream.read();if(r.done)break;total+=r.value.length;if(total>file.size||total>TRANSFER_LIMIT)throw Error('Attachment size mismatch.');chunks.push(r.value);}}finally{await stream.cancel();}
  if(total!==file.size)throw Error('Incomplete attachment download.');
  const after=reader.verifiedBinding();if(after.accountId!==binding.accountId||after.cloudId!==binding.cloudId||after.siteUrl!==site)throw Error('MCP account or site changed.');
  const data=Buffer.concat(chunks);while(cache.size&&[...cache.values()].reduce((n,v)=>n+v.bytes.length,0)+data.length>50*1024*1024)cache.delete(cache.keys().next().value!);
  cache.set(cacheKey,{bytes:data,until:Date.now()+120000});return data;
 }
 return {
  comments:async(reader:McpContentReader,site:string,key:string,startAt:number)=>{let pages=0;return readCommentPage(async path=>{
   if(++pages>100)throw Error('MCP comment pagination limit exceeded.');
   const offset=Number(/startAt=(\d+)/.exec(path)?.[1]);
   const page=z.object({comments:z.array(z.record(z.string(),z.unknown())),startAt:z.number(),maxResults:z.number(),total:z.number()}).parse(await call(reader,site,'listJiraIssueComments',{issueIdOrKey:key,startAt:offset,maxResults:20,orderBy:'-created',view:'full',responseContentFormat:'html'}));
   return {...page,comments:page.comments.map(c=>({...c,body:descriptionDocument(c.body)}))};
  },site,key,startAt);},
  session(reader:McpContentReader,site:string,key:string):AttachmentSession{return {site,request:async(path,options={})=>{
   if(options.body||!key)throw Error('MCP attachments are read-only.');
   if(path===`/rest/api/3/issue/${key}?fields=attachment`)return Response.json({fields:{attachment:await files(reader,site,key)}});
   const id=/^\/rest\/api\/3\/attachment\/content\/(\d+)\?redirect=false$/.exec(path)?.[1];const range=/^bytes=(\d+)-(\d+)$/.exec(options.range??'');
   if(!id||!range)throw Error('Unsupported MCP attachment read.');
   const data=await bytes(reader,site,key,id),start=Number(range[1]),end=Number(range[2]);
   if(start>end||end>=data.length)throw Error('Invalid attachment range.');
   return new Response(new Uint8Array(data.subarray(start,end+1)),{status:206,headers:{'content-range':`bytes ${start}-${end}/${data.length}`}});
  }};},close(){cache.clear();}
 };
}

function downloadTimeout(){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);timer.unref();return controller.signal;}
