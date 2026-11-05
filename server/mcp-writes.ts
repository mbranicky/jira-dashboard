import {mcpFailure} from './mcp-diagnostics';
import {z} from 'zod';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import type {Connection} from '../shared/contracts';
import type {McpContentReader} from './mcp-content';
import type {McpWriteTool} from './mcp-tools';
import {writeTool} from './mcp-tools';
import {normalizeComment} from './comments';
import {descriptionDocument} from './jira-html';
import {TRANSFER_LIMIT} from '../shared/attachments';
import {uploadMedia} from './mcp-upload';
export interface McpWriter extends McpContentReader {hasWriteAccess():boolean;boardTools():Promise<Tool[]>;writeJiraTool(name:McpWriteTool,args:Record<string,unknown>):Promise<unknown>}
export function assertMcpWrites(config:Connection){if(config.transport!=='mcp'||!config.mcpWrites)throw Error('Enable Jira changes through MCP in Settings first.');}
const unwrap=(v:unknown)=>v&&typeof v==='object'&&'data' in v?(v as {data:unknown}).data:v;
const field=z.object({name:z.string().optional(),required:z.boolean().optional(),schema:z.object({type:z.string().optional(),custom:z.string().optional()}).optional(),operations:z.array(z.string()).optional(),allowedValues:z.array(z.unknown()).optional()});
const transition=z.object({id:z.string().min(1),name:z.string(),to:z.object({id:z.string().min(1).optional(),name:z.string().min(1),statusCategory:z.object({key:z.string()}).default({key:''})}),fields:z.record(z.string(),field).optional()});
const attachment=z.object({id:z.string(),filename:z.string(),size:z.number(),created:z.string(),mimeType:z.string().optional(),author:z.object({displayName:z.string()}).optional()});
/** A request-scoped, pinned writer. No operation retries a submitted mutation. */
export function mcpWrites(reader:McpWriter,site:string,fetcher:typeof fetch=fetch){
 const binding=reader.verifiedBinding();
 function check(){const current=reader.verifiedBinding();if(binding.siteUrl!==site||current.siteUrl!==site||current.cloudId!==binding.cloudId||current.accountId!==binding.accountId)throw Error('MCP account or site changed.');if(!reader.hasWriteAccess())throw Error('Authorize Jira changes through Reconnect MCP in Settings first.');}
 async function read(name:Parameters<McpContentReader['readContentTool']>[0],args:Record<string,unknown>){check();const data=unwrap(await reader.readContentTool(name,{cloudId:binding.cloudId,...args}));check();return data;}
 async function prepare(name:McpWriteTool,args:Record<string,unknown>){check();const input={cloudId:binding.cloudId,...args};writeTool(await reader.boardTools(),name,input);check();return input;}
 async function write(name:McpWriteTool,input:Record<string,unknown>){check();const result=unwrap(await reader.writeJiraTool(name,input));check();if(result&&typeof result==='object'&&(('success' in result&&result.success===false)||('error' in result&&result.error)))throw Error('Jira rejected the change.');return result;}
 async function uncertain<T>(label:string,run:()=>Promise<T>){try{return await run();}catch{throw Error(`${label} delivery could not be confirmed. Refresh the issue and check Jira before retrying.`);}}
 async function issue(key:string,fields:string[]){return z.object({key:z.literal(key),fields:z.record(z.string(),z.unknown())}).parse(await read('getJiraIssue',{issueIdOrKey:key,fields,view:'full'}));}
 async function files(key:string){return z.array(attachment).parse((await issue(key,['attachment'])).fields.attachment);}
 async function transitions(key:string){
  const response=await read('listJiraIssueTransitions',{issueIdOrKey:key,expand:'transitions.fields'});
  const parsed=z.object({transitions:z.array(transition)}).safeParse(response);
  const unavailable='MCP returned incomplete workflow destinations. The issue has not been moved. Open Jira to move it, or refresh and try again.';
  if(!parsed.success){mcpFailure('transitions.normalize.failed');throw Error(unavailable);}
  const resolved=new Map<string,string>();
  const result=[];
  for(const item of parsed.data.transitions){
   let id=item.to.id??resolved.get(item.to.name);
   if(!id){
    // Observed MCP transitions omit destination IDs. The advertised site search
    // returns status IDs/names; never use mode=status by name (it picks one of
    // potentially several matches), transition IDs, or board-column labels.
    let raw:unknown;
    try{raw=await read('listJiraStatuses',{mode:'site',nameContains:item.to.name});}
    catch{throw Error('MCP could not resolve workflow destinations. The issue has not been moved. Refresh or open Jira to move it.');}
    const known=z.object({statuses:z.array(z.object({id:z.string().min(1),name:z.string().min(1)})),total:z.number().int().nonnegative().optional(),isLast:z.boolean().optional(),hasMore:z.boolean().optional(),truncated:z.boolean().optional(),nextPageToken:z.string().nullish()}).safeParse(raw);
    if(!known.success||known.data.isLast===false||known.data.hasMore===true||known.data.truncated===true||known.data.nextPageToken||known.data.total!==undefined&&known.data.total!==known.data.statuses.length)throw Error(unavailable);
    const matches=known.data.statuses.filter(status=>status.name===item.to.name);
    if(matches.length!==1)throw Error('MCP could not identify one exact workflow destination. The issue has not been moved. Open Jira to move it safely.');
    id=matches[0].id;resolved.set(item.to.name,id);
   }
   result.push({...item,to:{...item.to,id}});
  }
  return result;
 }

 async function findComment(key:string,id:string){
  let offset=0;
    for(let page=0;page<100;page++){
     const result=z.object({comments:z.array(z.record(z.string(),z.unknown())),startAt:z.number().int(),total:z.number().int().nonnegative()}).parse(await read('listJiraIssueComments',{issueIdOrKey:key,startAt:offset,maxResults:50,view:'full',responseContentFormat:'html'}));
     if(result.startAt!==offset)throw Error('Incomplete MCP comment lookup.');
     const found=result.comments.find(c=>String(c.id)===id);if(found)return found;
     offset+=result.comments.length;if(offset>=result.total)break;if(!result.comments.length)throw Error('Incomplete MCP comment lookup.');
    }
  return undefined;
 }
 return {
  identity:JSON.stringify([site,'mcp',binding.accountId,binding.cloudId]),
  async uploadSettings(){check();await prepare('uploadAttachmentToJiraIssue',{issueIdOrKey:'CHECK-1',filePath:'attachment'});return {enabled:true,uploadLimit:TRANSFER_LIMIT,limitSource:'plugin' as const};},
  workflow(key:string){let offered:Awaited<ReturnType<typeof transitions>>|undefined;return {
   availableTransitions:async()=>offered=await transitions(key),
   transition:async(id:string,fields:Record<string,unknown>={})=>{
    const target=(await transitions(key)).find(t=>t.id===id);if(!target||offered&&offered.find(t=>t.id===id)?.to.id!==target.to.id)throw Error('This transition is no longer available. Refresh and choose again.');
    const input=await prepare('transitionJiraIssue',{issueIdOrKey:key,transitionId:id,...(Object.keys(fields).length?{fields}:{})});
    return uncertain('Status update',async()=>{
     await write('transitionJiraIssue',input);
     const after=await issue(key,['status']);
     if(z.object({id:z.string()}).parse(after.fields.status).id!==target.to.id)throw Error('Status was not confirmed.');
     return {success:true};
    });
   },
  };},
  async post(key:string,markdown:string,parentId?:string){
   check();await issue(key,['summary']);let visibility:unknown;
   if(parentId){
    const found=await findComment(key,parentId);
    if(!found)throw Error('Original comment is no longer visible. Refresh comments before replying.');
    if(found.jsdPublic===false)throw Error('Reply in Jira to preserve this internal comment’s audience.');
    if(found.visibility){const v=z.object({type:z.enum(['group','role']),value:z.string().trim().min(1)}).safeParse(found.visibility);if(!v.success)throw Error('Cannot preserve this comment’s visibility restriction through MCP. Reply in Jira.');visibility=v.data;}
    markdown=`[Linked reply to comment ${parentId}](${site}/browse/${key}?focusedCommentId=${parentId})\n\n${markdown}`;
   }
   const input=await prepare('addOrEditJiraIssueComment',{issueIdOrKey:key,commentBody:markdown,contentFormat:'markdown',responseContentFormat:'html',...(visibility?{commentVisibility:visibility}:{})});
   return uncertain('Comment',async()=>{
    const result=await write('addOrEditJiraIssueComment',input);
    let candidate=result&&typeof result==='object'&&'comment' in result?result.comment:result;
    // MCP v2 returns a receipt, not the full Jira comment. Read back the exact
    // returned ID to obtain authoritative timestamps, author and rendered body.
    if(result&&typeof result==='object'&&'commentId' in result){
     const id=z.string().regex(/^\d+$/).parse(result.commentId);
     candidate=await findComment(key,id);
     if(!candidate)throw Error('Saved comment was not readable.');
    }
    try{
     const raw=z.record(z.string(),z.unknown()).parse(candidate);
     return normalizeComment({...raw,body:descriptionDocument(raw.body)});
    }catch(error){mcpFailure('comment.normalize.failed');throw error;}
   });
  },
  async upload(key:string,filename:string,bytes:Buffer){
   if(!bytes.length||bytes.length>TRANSFER_LIMIT||!filename||filename==='.'||filename==='..'||/[\r\n\x00/\\]/.test(filename))throw Error('Invalid attachment filename or size.');
   const before=await files(key);const input=await prepare('uploadAttachmentToJiraIssue',{issueIdOrKey:key,filePath:filename});
   return uncertain('Upload',async()=>{
    const plan=z.object({uploadCommand:z.string()}).parse(await write('uploadAttachmentToJiraIssue',input));
    check();const fileId=await uploadMedia(fetcher,plan.uploadCommand,filename,bytes);check();
    const finish=await prepare('uploadAttachmentToJiraIssue',{issueIdOrKey:key,fileId});
    await write('uploadAttachmentToJiraIssue',finish);
    const added=(await files(key)).filter(f=>!before.some(old=>old.id===f.id)&&f.filename===filename&&f.size===bytes.length);
    if(added.length!==1)throw Error('Attachment was not confirmed.');return added;
   });
  },
 };
}
