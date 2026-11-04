import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';
import {TwgConnection} from './twg-client';
import {TwgFailure} from './twg-errors';
import {decodeTwgIssue} from './twg-issue';
import {parseBoardUrl} from './jira';
import {normalizeComment} from './comments';
import {TRANSFER_LIMIT} from '../shared/attachments';
import type {Connection} from '../shared/contracts';

const field=z.object({fieldId:z.string(),fieldName:z.string(),required:z.boolean(),schema:z.object({type:z.string().optional(),custom:z.string().optional()}).optional(),operations:z.array(z.string()).optional(),allowedValues:z.array(z.unknown()).optional()});
const transitions=z.object({transitions:z.array(z.object({id:z.string().regex(/^\d+$/),name:z.string(),toName:z.string(),fields:z.array(field).optional()}))});
const statuses=z.array(z.object({id:z.string(),name:z.string(),statusCategory:z.object({key:z.string()}).optional()}));
const comments=z.object({data:z.array(z.unknown()),pageInfo:z.object({hasNextPage:z.boolean(),nextCursor:z.string().nullable()})});
const parent=z.object({id:z.string(),jsdPublic:z.boolean().optional(),visibility:z.object({type:z.enum(['role','group']),value:z.string().optional(),identifier:z.string().optional()}).nullish()});
function data(value:unknown,command:string){return z.object({apiVersion:z.literal('v2'),command:z.literal(command),data:z.unknown()}).parse(value).data;}
export function assertTwgWrites(config:Connection){if(config.transport!=='twg'||!config.twgWrites)throw new Error('Enable Jira changes for TWG in connection settings first.');}
/** Explicit mutations only; never retry a write whose delivery is uncertain. */
export function twgWrites(make=(path:string)=>new TwgConnection(path)){
 const active=new Set<TwgConnection>();let closed=false;
 async function run<T>(config:Connection,fn:(cli:TwgConnection,target:{site:string;profile:string})=>Promise<T>){
  assertTwgWrites(config);if(closed)throw new Error('TWG connection closed.');
  const cli=make(config.twgExecutable);active.add(cli);
  try{await cli.requireProfileSupport();return await fn(cli,{site:parseBoardUrl(config.boardUrl).site,profile:config.twgProfile});}
  catch(e){if(e instanceof z.ZodError)throw new Error('Incomplete or unsupported TWG workflow response.');throw e;}
  finally{cli.close();active.delete(cli);}
 }
 async function mutate<T>(label:string,fn:()=>Promise<T>):Promise<T>{
  try{return await fn();}catch(e){
   if(e instanceof TwgFailure&&['auth','forbidden','not-found','rate-limit','missing-cli'].includes(e.kind))throw e;
   throw new Error(`${label} delivery could not be confirmed. Refresh the issue and check Jira before retrying.`);
  }
 }
 async function workflow(config:Connection,key:string,statusIds:string[]){
  return {
   availableTransitions:()=>run(config,async(cli,target)=>{
    const discovered=transitions.parse(data(await cli.readTransitions(target,key).catch(error=>{if(error instanceof TwgFailure&&error.kind==='not-found')throw new Error('Jira could not load transitions for this issue. Check issue access and workflow permissions in Jira.');throw error;}),'jira.workitem.transition')).transitions;
    const known=statuses.parse(data(await cli.readStatuses(target,[...new Set(statusIds)]).catch(error=>{if(error instanceof TwgFailure&&error.kind==='not-found')throw new Error('Jira workflow status lookup is unavailable through Teamwork Graph. The issue has not been moved.');throw error;}),'jira.workitem.statuses.query'));
    return discovered.flatMap(t=>{
     const matches=known.filter(s=>statusIds.includes(s.id)&&s.name===t.toName);
     if(matches.length>1)throw new Error('Jira has multiple board statuses with the same name. Move this issue in Jira to avoid choosing the wrong destination.');
     if(!matches.length)return [];
     const status=matches[0];
     return [{id:t.id,name:t.name,to:{id:status.id,name:status.name,statusCategory:{key:status.statusCategory?.key??''}},fields:Object.fromEntries((t.fields??[]).map(f=>[f.fieldId,{name:f.fieldName,required:f.required,schema:f.schema,operations:f.operations,allowedValues:f.allowedValues}]))}];
    });
   }),
   transition:(id:string,fields:Record<string,unknown>={})=>run(config,async(cli,target)=>mutate('Status update',async()=>{
    // The CLI re-reads current transitions and validates screen fields before POST.
    const result=z.object({success:z.literal(true),issueIdOrKey:z.literal(key),transition:z.object({id:z.literal(id)})}).parse(data(await cli.transition(target,key,id,fields),'jira.workitem.transition'));
    return result;
   })),
  };
 }
 async function post(config:Connection,key:string,markdown:string,parentId?:string){
  return run(config,async(cli,target)=>{
   await decodeTwgIssue(await cli.readIssue(target,key),target.site,key);
   let visibility:{type:'group'|'role';value:string}|undefined;
   if(parentId){
    let cursor:string|undefined;let found:z.infer<typeof parent>|undefined;const seen=new Set<string>();
    for(let page=0;page<100;page++){
     const response=await cli.readComments(target,key,cursor);data(response,'jira.workitem.comment.query');const list=comments.parse(response);
     const match=list.data.find(c=>c&&typeof c==='object'&&'id' in c&&String(c.id)===parentId);
     if(match){found=parent.parse(match);break;}
     if(!list.pageInfo.hasNextPage)break;
     const next=list.pageInfo.nextCursor;if(!next||seen.has(next)||!list.data.length)throw new Error('Incomplete TWG comment lookup.');seen.add(next);cursor=next;
    }
    if(!found)throw new Error('Original comment is no longer visible. Refresh comments before replying.');
    if(found.jsdPublic===false)throw new Error('Reply in Jira to preserve this internal comment’s audience.');
    if(found.visibility){const value=found.visibility.value?.trim();if(!value)throw new Error('Cannot preserve this comment’s visibility restriction through TWG. Reply in Jira.');visibility={type:found.visibility.type,value};}
    markdown=`[Linked reply to comment ${parentId}](${target.site}/browse/${key}?focusedCommentId=${parentId})\n\n${markdown}`;
   }
   return mutate('Comment',async()=>normalizeComment(data(await cli.createComment(target,key,markdown,visibility),'jira.workitem.comment.create')));
  });
 }
 async function upload(config:Connection,key:string,filename:string,bytes:Buffer){
  if(!bytes.length||bytes.length>TRANSFER_LIMIT||!filename||filename==='.'||filename==='..'||/[\r\n\x00/\\]/.test(filename))throw new Error('Invalid attachment filename or size.');
  return run(config,async(cli,target)=>{
   await decodeTwgIssue(await cli.readIssue(target,key),target.site,key);
   const directory=await mkdtemp(join(tmpdir(),'jira-twg-upload-'));
   try{
    const path=join(directory,filename);await writeFile(path,bytes,{mode:0o600,flag:'wx'});
    return await mutate('Upload',async()=>z.array(z.unknown()).min(1).parse(data(await cli.uploadAttachment(target,key,path),'jira.workitem.attachment.upload')));
   }finally{await rm(directory,{recursive:true,force:true});}
  });
 }
 return {workflow,post,upload,close(){closed=true;for(const cli of active)cli.close();active.clear();}};
}
