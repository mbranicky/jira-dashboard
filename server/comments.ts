import {authorization} from './credentials';
import {metadataFetch} from './metadata-cache';
import {z} from 'zod';
import type {Connection} from '../shared/contracts';
import {newestComments,commentSchema,markdownToAdf,richBlocks,type JiraComment,type AdfNode} from '../shared/comments';
import {loadCredentials,parseBoardUrl} from './jira';
const numeric=z.union([z.string().regex(/^\d+$/),z.number().int().nonnegative()]).transform(String);
const rawComment=z.object({id:numeric,parentId:numeric.nullish(),author:z.object({displayName:z.string()}).nullish(),created:z.string(),updated:z.string().nullish(),body:z.unknown(),jsdPublic:z.boolean().optional(),visibility:z.object({type:z.enum(['group','role']),identifier:z.string().optional(),value:z.string().optional()}).nullish()});
export function normalizeComment(value:unknown):JiraComment{
 const c=rawComment.parse(value);return commentSchema.parse({id:c.id,parentId:c.parentId??null,author:c.author?.displayName??'Former user',created:c.created,updated:c.updated??null,blocks:richBlocks(c.body),restricted:!!c.visibility||c.jsdPublic===false});
}
export type CommentsTransport=(path:string,body?:unknown)=>Promise<unknown>;
export async function commentsSession(config:Connection,fetcher:typeof fetch=metadataFetch){
 const {site}=parseBoardUrl(config.boardUrl);
 let cloudId:string;
 try{const response=await fetcher(`${site}/_edge/tenant_info`,{redirect:'error',signal:timeoutSignal(15000)});if(!response.ok)throw new Error();cloudId=z.object({cloudId:z.string().uuid()}).parse(await response.json()).cloudId;}catch{throw new Error('Cannot resolve Jira. Check the connection settings.');}
 const request:CommentsTransport=async(path,body)=>{
  if(!/^\/rest\/api\/3\/issue\/[A-Z][A-Z0-9_]*-[1-9]\d*\/comment(?:\/\d+|\?startAt=\d+&maxResults=50&orderBy=-created)?$/.test(path))throw new Error('Unsupported comment endpoint.');
  if(body!==undefined&&!/\/comment$/.test(path))throw new Error('Unsupported comment write.');
  const auth=await loadCredentials(config.envPath);
  let response:Response;
  try{response=await fetcher(`https://api.atlassian.com/ex/jira/${cloudId}${path}`,{method:body===undefined?'GET':'POST',redirect:'error',signal:timeoutSignal(30000),headers:{Accept:'application/json',Authorization:authorization(auth),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw new Error(body===undefined?'Cannot reach Jira. Try refreshing comments.':'Comment delivery could not be confirmed. Refresh comments and check Jira before posting again.');}
  if(!response.ok){
   if(body!==undefined&&response.status>=500)throw new Error('Comment delivery could not be confirmed. Refresh comments and check Jira before posting again.');
   const messages:Record<number,string>={400:'Jira rejected the comment or its visibility settings.',401:'Jira rejected the token or comment scopes. Check the Jira setup guide.',403:'Jira denied comment access. Check project permissions and comment visibility.',404:'Issue or comment not found, or no longer visible.',429:'Jira rate limit reached. Wait before trying again.'};
   throw new Error(messages[response.status]??`Jira comments request failed (HTTP ${response.status}).`);
  }
  try{return await response.json();}catch{throw new Error(body===undefined?'Jira returned an invalid comments response.':'Comment delivery could not be confirmed. Refresh comments and check Jira before posting again.');}
 };
 return {site,request};
}
export async function readCommentPage(request:CommentsTransport,site:string,key:string,startAt:number){
 // Jira supports creation ordering only. Collect every page before ordering by edits,
 // otherwise an edited old comment could remain hidden on an unloaded page.
 const all:JiraComment[]=[];let offset=0;
 for(;;){
  const page=z.object({comments:z.array(z.unknown()),startAt:z.number().int(),maxResults:z.number().int(),total:z.number().int().nonnegative()}).parse(await request(`/rest/api/3/issue/${key}/comment?startAt=${offset}&maxResults=50&orderBy=-created`));
  if(page.startAt!==offset)throw new Error('Jira returned an unexpected comments page. Refresh comments.');
  all.push(...page.comments.map(normalizeComment));offset+=page.comments.length;
  if(offset>=page.total)break;
  if(!page.comments.length)throw new Error('Jira returned an incomplete comments page.');
 }
 const sorted=newestComments([...new Map(all.map(c=>[c.id,c])).values()]);
 const comments=sorted.slice(startAt,startAt+50);const next=startAt+comments.length;
 return {site,comments,nextStart:next<sorted.length?next:null,total:sorted.length};
}
export async function createComment(request:CommentsTransport,site:string,key:string,markdown:string,parentId?:string){
 const body=markdownToAdf(markdown);let visibility:unknown;
 if(parentId){
  const parent=rawComment.parse(await request(`/rest/api/3/issue/${key}/comment/${parentId}`));
  if(parent.jsdPublic===false)throw new Error('This is an internal service-management comment. Reply in Jira to preserve its audience.');
  visibility=parent.visibility??undefined;
  if(visibility&&!parent.visibility?.identifier&&!parent.visibility?.value)throw new Error('Cannot preserve this comment’s visibility restriction. Reply in Jira instead.');
  const heading:AdfNode={type:'paragraph',content:[{type:'text',text:`Linked reply to ${parent.author?.displayName??'Former user'}`,marks:[{type:'link',attrs:{href:`${site}/browse/${key}?focusedCommentId=${parent.id}`}}]}]};
  body.content=[heading,...(body.content??[])];
 }
 const result=await request(`/rest/api/3/issue/${key}/comment`,{body,...(visibility?{visibility}:{})});
 try{return normalizeComment(result);}catch{throw new Error('Comment was submitted, but its response could not be read. Refresh comments before posting again.');}
}
// Coalesce repeated clicks/RPC retries. Failed writes are never automatically repeated.
export function commentPoster(){
 const receipts=new Map<string,{payload:string;result:Promise<JiraComment>}>();
 return (identity:string,requestId:string,payload:string,post:()=>Promise<JiraComment>)=>{
  const id=`${identity}\n${requestId}`;const previous=receipts.get(id);
  if(previous){if(previous.payload!==payload)throw new Error('This comment request changed. Reopen the editor before posting.');return previous.result;}
  if(receipts.size>=1000)throw new Error('Comment submission limit reached for this plugin session. Reload the plugin after checking pending comments.');
  const result=post();receipts.set(id,{payload,result});return result;
 };
}

function timeoutSignal(ms:number){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);timer.unref();return controller.signal;}
