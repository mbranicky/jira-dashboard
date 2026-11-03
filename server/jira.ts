import {createHash} from 'node:crypto';
import {metadataFetch} from './metadata-cache';
import {richBlocks} from '../shared/comments';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { boardSchema, issueSchema, issueDetailsSchema, type Board, type Connection } from '../shared/contracts';

const userSchema = z.object({ accountId: z.string(), displayName: z.string() });
const configSchema = z.object({ id: z.number(), name: z.string(), columnConfig: z.object({ columns: z.array(z.object({name:z.string(),statuses:z.array(z.object({id:z.string()}))})) }) });
const sprintSchema = z.object({id:z.number().int().positive(),name:z.string(),state:z.string()});
const rawIssue = z.object({key:z.string(),fields:z.object({parent:z.object({key:z.string(),fields:z.object({summary:z.string()})}).nullish(),fixVersions:z.array(z.object({name:z.string()})).nullish(),labels:z.array(z.string()).nullish(),summary:z.string(),status:z.object({id:z.string(),name:z.string(),statusCategory:z.object({key:z.string()}).optional()}),assignee:z.object({accountId:z.string()}).nullable(),issuetype:z.object({name:z.string()}),priority:z.object({name:z.string()}).nullish(),project:z.object({key:z.string()})})});
export function parseBoardUrl(value:string) {
  let url:URL;
  try { url=new URL(value); } catch { throw new Error('Enter a full Jira Cloud board URL in settings.'); }
  const match=url.pathname.match(/\/boards\/(\d+)\/?$/);
  if(url.protocol!=='https:' || !/^[a-z0-9-]+\.atlassian\.net$/.test(url.hostname) || url.port || url.username || url.password || !match) throw new Error('Use an HTTPS Jira Cloud URL ending in /boards/<number>.');
  const id=Number(match[1]);
  if(!Number.isSafeInteger(id)||id<1) throw new Error('Invalid board ID.');
  return {site:url.origin,id};
}
export async function loadCredentials(path:string) {
  if(!isAbsolute(path)) throw new Error('Set an absolute jira.env path on this Paseo host.');
  let info;
  try {info=await stat(path);} catch {throw new Error('Cannot read jira.env on this host. Check its path and permissions.');}
  if(!info.isFile() || info.size>65536) throw new Error('jira.env must be a small regular file.');
  if(process.platform!=='win32' && (info.mode & 0o077)) throw new Error('Protect jira.env with owner-only permissions (chmod 600).');
  let values:Record<string,string|undefined>;
  try {values=parseEnv(await readFile(path,'utf8'));} catch {throw new Error('Could not parse jira.env.');}
  const email=values.JIRA_EMAIL?.trim(); const token=values.JIRA_API_TOKEN?.trim();
  if(!email||!token||!/^[^\s:]+@[^\s]+$/.test(email)||/[\r\n]/.test(token)) throw new Error('jira.env needs valid JIRA_EMAIL and JIRA_API_TOKEN values.');
  return {email,token};
}
export function createReader(cloudId:string, auth:{email:string;token:string}, fetcher:typeof fetch=metadataFetch) {
  if(!/^[a-f0-9-]{36}$/i.test(cloudId)) throw new Error('Invalid Jira cloud ID.');
  return async(path:string,query:Record<string,string>={}) => {
    if(!/^\/rest\/api\/3\/(myself|status|search\/jql)$|^\/rest\/agile\/1\.0\/board\/\d+\/(configuration|sprint)$|^\/rest\/software\/1\.0\/board\/\d+\/sprint\/\d+\/issue$/.test(path)&&!/^\/rest\/api\/3\/project\/[A-Z][A-Z0-9_]*\/statuses$/.test(path)) throw new Error('Unsupported read endpoint.');
    const url=new URL(`https://api.atlassian.com/ex/jira/${cloudId}${path}`);url.search=new URLSearchParams(query).toString();
    let response:Response;
    try {response=await fetcher(url,{method:'GET',redirect:'error',signal:timeoutSignal(30000),headers:{Accept:'application/json',Authorization:`Basic ${Buffer.from(`${auth.email}:${auth.token}`).toString('base64')}`}});} catch {throw new Error('Cannot reach Jira. Check the host connection and try again.');}
    if(!response.ok){
      let scopeMismatch=false;
      if(response.status===401){try {const body=await response.json() as {message?:string};scopeMismatch=body.message==='Unauthorized; scope does not match';} catch {/* Never expose raw responses. */}}
      if(scopeMismatch && path==='/rest/api/3/search/jql') throw new Error('The Jira token needs these read scopes for workspace details: read:issue-details:jira, read:audit-log:jira, read:avatar:jira, read:field-configuration:jira, read:issue-meta:jira. Update jira.env, then refresh.');
      if(scopeMismatch) throw new Error(`Token scopes do not cover ${path}. Check the scopes in docs/JIRA_SETUP.md.`);
      const hints:Record<number,string>={401:'Jira rejected the credentials. Check email, token and expiry.',403:'Jira denied access. Check token scopes and account permissions.',404:'Board or sprint not found, or not visible to this account.',429:'Jira rate limit reached. Wait before refreshing.'};
      throw new Error(hints[response.status]??`Jira request failed (HTTP ${response.status}).`);
    }
    try {return await response.json() as unknown;}catch {throw new Error('Jira returned an invalid response.');}
  };
}
type Read = ReturnType<typeof createReader>;
export async function readSprints(get:Read,path:string) {
  const output:z.infer<typeof sprintSchema>[]=[];
  for(let start=0,page=0;page<1000;page++){
    const data=z.object({values:z.array(sprintSchema),isLast:z.boolean().optional(),total:z.number().optional()}).parse(await get(path,{state:'active,future',startAt:String(start),maxResults:'50'}));
    output.push(...data.values);
    if(data.isLast===true || (data.total!==undefined && output.length>=data.total)) return output;
    if(!data.values.length){if(data.isLast===false)throw new Error('Incomplete Jira sprint response.');return output;}
    start+=data.values.length;
  }
  throw new Error('Sprint pagination limit exceeded.');
}
export async function readIssues(get:Read,path:string,accountId:string) {
  const output:Board['issues']=[];let cursor:string|undefined;const seen=new Set<string>();
  for(let page=0;page<1000;page++){
    const data=z.object({issues:z.array(rawIssue),nextPageToken:z.string().optional(),isLast:z.boolean().optional()}).parse(await get(path,{jql:'assignee = currentUser()',fields:'summary,status,assignee,issuetype,priority,project,parent,fixVersions,labels',maxResults:'50',...(cursor?{nextPageToken:cursor}:{})}));
    for(const issue of data.issues){
      const f=issue.fields;
      if(f.assignee?.accountId!==accountId) throw new Error('Jira returned an issue assigned to another user. Please refresh.');
      output.push({key:issue.key,summary:f.summary,parent:f.parent?{key:f.parent.key,summary:f.parent.fields.summary}:null,fixVersions:f.fixVersions?.map(v=>v.name)??[],labels:f.labels??[],statusId:f.status.id,status:f.status.name,statusCategory:f.status.statusCategory?.key,type:f.issuetype.name,priority:f.priority?.name??null,projectKey:f.project.key});
    }
    if(data.isLast===true) return output;
    if(!data.nextPageToken){if(data.isLast===false)throw new Error('Missing Jira pagination cursor.');return output;}
    if(seen.has(data.nextPageToken))throw new Error('Repeated Jira pagination cursor.');
    cursor=data.nextPageToken;seen.add(cursor);
  }
  throw new Error('Issue pagination limit exceeded.');
}
const observedStatuses=new Map<string,{at:number;issues:Board['issues']}>();
function observationKey(site:string,id:number,auth:{email:string;token:string}){return createHash('sha256').update(JSON.stringify([site,id,auth.email,auth.token])).digest('hex');}
export async function fetchBoard(config:Connection,sprintId?:number):Promise<Board>{
  const {site,id}=parseBoardUrl(config.boardUrl);const auth=await loadCredentials(config.envPath);
  let cloudId:string;
  try {const response=await metadataFetch(`${site}/_edge/tenant_info`,{redirect:'error',signal:timeoutSignal(15000)});if(!response.ok)throw new Error();cloudId=z.object({cloudId:z.string()}).parse(await response.json()).cloudId;}catch {throw new Error('Cannot resolve this Jira site. Check the URL and network connection.');}
  const get=createReader(cloudId,auth);
  const user=userSchema.parse(await get('/rest/api/3/myself'));
  const board=configSchema.parse(await get(`/rest/agile/1.0/board/${id}/configuration`));
  if(board.id!==id) throw new Error('Jira returned a different board.');
  const sprints=await readSprints(get,`/rest/agile/1.0/board/${id}/sprint`);
  const active=sprints.filter(s=>s.state==='active');
  if(sprintId && !sprints.some(s=>s.id===sprintId))throw new Error('Selected sprint is no longer available on this board. Choose another sprint.');
  const selectedSprintId=sprintId??(active.length===1?active[0].id:null);
  const issues=selectedSprintId?await readIssues(get,`/rest/software/1.0/board/${id}/sprint/${selectedSprintId}/issue`,user.accountId):[];
  if(observedStatuses.size>=32)observedStatuses.delete(observedStatuses.keys().next().value!);
  observedStatuses.set(observationKey(site,id,auth),{at:Date.now(),issues});
  return boardSchema.parse({site,boardId:id,name:board.name,checkedAt:new Date().toISOString(),user:{displayName:user.displayName},columns:board.columnConfig.columns.map(c=>({name:c.name,statusIds:c.statuses.map(s=>s.id)})),sprints,selectedSprintId,issues});
}

function timeoutSignal(ms:number){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);timer.unref();return controller.signal;}

export async function issueSession(config:Connection,key:string){
  const {site}=parseBoardUrl(config.boardUrl);
  const auth=await loadCredentials(config.envPath);
  const tenant=await metadataFetch(`${site}/_edge/tenant_info`,{redirect:'error',signal:timeoutSignal(15000)});
  if(!tenant.ok)throw new Error('Cannot resolve Jira site.');
  const {cloudId}=z.object({cloudId:z.string().uuid()}).parse(await tenant.json());
  const base=`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${encodeURIComponent(key)}`;
  const headers={Accept:'application/json',Authorization:`Basic ${Buffer.from(`${auth.email}:${auth.token}`).toString('base64')}`};
  async function request(suffix:string,transitionId?:string,fields?:Record<string,unknown>){
    const response=await metadataFetch(base+suffix,{method:transitionId?'POST':'GET',redirect:'error',signal:timeoutSignal(30000),headers:{...headers,...(transitionId?{'Content-Type':'application/json'}:{})},...(transitionId?{body:JSON.stringify({transition:{id:transitionId},...(fields?{fields}:{})})}:{})});
    if(!response.ok){
      let reason='';
      try{const body=await response.json() as {errorMessages?:string[];errors?:Record<string,string>};reason=[...(body.errorMessages??[]),...Object.entries(body.errors??{}).map(([field,message])=>field+': '+message)].join(' ').slice(0,3000);}catch{}
      throw new Error(reason||`Jira ${transitionId?'status update':'workflow lookup'} failed (HTTP ${response.status}). Check token scopes, workflow requirements and permissions.`);
    }
    return transitionId?null:response.json();
  }
  return {
    async details(sprintId:number){
      const {id}=parseBoardUrl(config.boardUrl);
      const get=createReader(cloudId,auth);
      const response=z.object({issues:z.array(z.unknown())}).parse(await get(`/rest/software/1.0/board/${id}/sprint/${sprintId}/issue`,{jql:`assignee = currentUser() AND key = "${key}"`,fields:"description,assignee,reporter,duedate,created,updated",maxResults:"1"}));
      if(!response.issues.length)throw new Error("Issue details are no longer available in this sprint.");
      const result=z.object({fields:z.object({description:z.unknown().optional(),assignee:z.object({displayName:z.string()}).nullish(),reporter:z.object({displayName:z.string()}).nullish(),duedate:z.string().nullish(),created:z.string().nullish(),updated:z.string().nullish()})}).parse(response.issues[0]);
      const f=result.fields;
      return issueDetailsSchema.parse({richDescription:richBlocks(f.description),description:descriptionBlocks(f.description),assignee:f.assignee?.displayName??null,reporter:f.reporter?.displayName??null,dueDate:f.duedate??null,created:f.created??null,updated:f.updated??null});
    },
    async availableTransitions(){
      return z.object({transitions:z.array(z.object({
        id:z.string(),name:z.string(),to:z.object({id:z.string(),name:z.string(),statusCategory:z.object({key:z.string()})}),
        fields:z.record(z.string(),z.object({name:z.string().optional(),required:z.boolean().optional(),schema:z.object({type:z.string().optional(),custom:z.string().optional()}).optional(),operations:z.array(z.string()).optional(),allowedValues:z.array(z.unknown()).optional()})).optional()
      }))}).parse(await request('/transitions?expand=transitions.fields')).transitions;
    },
    async workflow(){
      const issue=z.object({fields:z.object({status:z.object({statusCategory:z.object({key:z.string()})})})}).parse(await request('?fields=status'));
      const result=z.object({transitions:z.array(z.object({id:z.string(),name:z.string(),to:z.object({name:z.string(),statusCategory:z.object({key:z.string()})})}))}).parse(await request('/transitions'));
      return {alreadyInProgress:issue.fields.status.statusCategory.key==='indeterminate',transitions:result.transitions.filter(t=>t.to.statusCategory.key==='indeterminate').map(t=>({id:t.id,name:`${t.name} → ${t.to.name}`}))};
    },
    transition:(id:string,fields?:Record<string,unknown>)=>request('/transitions',id,fields),
  };
}

// Convert Jira document structure to readable blocks without rendering remote HTML.
export function descriptionBlocks(value:unknown):{text:string;kind:'paragraph'|'heading'|'code'}[]{
 if(typeof value==='string'){
  let code=false;
  return value.split(/\r?\n/).filter(line=>line.trim()).flatMap(line=>{
   if(/^\{code(?::[^}]*)?\}$/.test(line.trim())){code=!code;return [];}
   const heading=/^h[1-6]\.\s+/.test(line);
   return [{text:code?line:line.replace(/^h[1-6]\.\s+/,'').replace(/^\*\s+/,'• ').replace(/\{\{(.*?)\}\}/g,'$1').replace(/\*([^*]+)\*/g,'$1'),kind:code?'code' as const:heading?'heading' as const:'paragraph' as const}];
  });
 }
 const blocks:{text:string;kind:'paragraph'|'heading'|'code'}[]=[];
 function inline(value:any):string{if(!value||typeof value!=='object')return '';if(value.type==='hardBreak')return '\n';if(typeof value.text==='string')return value.text;if(value.type==='mention')return value.attrs?.text??'';if(value.type==='inlineCard')return value.attrs?.url??'';return (Array.isArray(value.content)?value.content:[]).map(inline).join('');}
 function walk(node:any,prefix=''){if(!node||typeof node!=='object')return;const content=Array.isArray(node.content)?node.content:[];
 if(['paragraph','heading','codeBlock'].includes(node.type)){blocks.push({text:prefix+inline(node),kind:node.type==='heading'?'heading':node.type==='codeBlock'?'code':'paragraph'});return;}
 if(node.type==='media'||node.type==='mediaSingle'){blocks.push({text:'[Attachment — open in Jira to view]',kind:'paragraph'});return;}
 content.forEach((child:any,index:number)=>walk(child,node.type==='bulletList'?'• ':node.type==='orderedList'?`${index+1}. `:prefix));}
 walk(value);return blocks;
}


export async function fetchWorkspaceIssue(config:Connection,key:string){
 if(!/^[A-Z][A-Z0-9_]*-[1-9]\d*$/.test(key))throw new Error('Invalid Jira issue key.');
 const {site}=parseBoardUrl(config.boardUrl);const auth=await loadCredentials(config.envPath);
 let cloudId:string;
 try{const response=await metadataFetch(`${site}/_edge/tenant_info`,{redirect:'error',signal:timeoutSignal(15000)});if(!response.ok)throw new Error();cloudId=z.object({cloudId:z.string()}).parse(await response.json()).cloudId;}catch{throw new Error('Cannot resolve this Jira site. Check the connection settings.');}
 return readWorkspaceIssueByKey(createReader(cloudId,auth),site,key);
}
export async function readWorkspaceIssueByKey(get:Read,site:string,key:string){
 if(!/^[A-Z][A-Z0-9_]*-[1-9]\d*$/.test(key))throw new Error('Invalid Jira issue key.');
 const data=z.object({issues:z.array(z.unknown())}).parse(await get('/rest/api/3/search/jql',{jql:`key = "${key}"`,fields:'summary,status,issuetype,priority,project,parent,fixVersions,labels,description,assignee,reporter,duedate,created,updated',maxResults:'2'}));
 if(!data.issues.length)return null;
 if(data.issues.length!==1)throw new Error('Jira returned an ambiguous issue match.');
 const raw=rawIssue.parse(data.issues[0]);const f=raw.fields;
 const extra=z.object({fields:z.object({description:z.unknown().optional(),assignee:z.object({displayName:z.string()}).nullish(),reporter:z.object({displayName:z.string()}).nullish(),duedate:z.string().nullish(),created:z.string().nullish(),updated:z.string().nullish()})}).parse(data.issues[0]).fields;
 return {site,issue:issueSchema.parse({key:raw.key,summary:f.summary,statusId:f.status.id,status:f.status.name,statusCategory:f.status.statusCategory?.key,type:f.issuetype.name,priority:f.priority?.name??null,projectKey:f.project.key,parent:f.parent?{key:f.parent.key,summary:f.parent.fields.summary}:null,fixVersions:f.fixVersions?.map(v=>v.name)??[],labels:f.labels??[]}),details:issueDetailsSchema.parse({richDescription:richBlocks(extra.description),description:descriptionBlocks(extra.description),assignee:extra.assignee?.displayName??null,reporter:extra.reporter?.displayName??null,dueDate:extra.duedate??null,created:extra.created??null,updated:extra.updated??null})};
}

export function normalizeProjectStatuses(value:unknown){
 const types=z.array(z.object({name:z.string(),statuses:z.array(z.object({id:z.string(),name:z.string()}))})).parse(value);
 const result=new Map<string,{id:string;name:string;issueTypes:string[]}>();
 for(const type of types)for(const status of type.statuses){
  const item=result.get(status.id)??{...status,issueTypes:[]};
  if(!item.issueTypes.includes(type.name))item.issueTypes.push(type.name);
  result.set(status.id,item);
 }
 return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export async function fetchProjectStatuses(config:Connection,projectKey:string,refresh=false){
 if(!/^[A-Z][A-Z0-9_]*$/.test(projectKey))throw new Error('Enter a valid Jira project key.');
 const {site,id}=parseBoardUrl(config.boardUrl);const auth=await loadCredentials(config.envPath);
 const tenant=await metadataFetch(site+'/_edge/tenant_info',{redirect:'error',signal:timeoutSignal(15000)});
 if(!tenant.ok)throw new Error('Cannot resolve Jira site.');
 const {cloudId}=z.object({cloudId:z.string().uuid()}).parse(await tenant.json());
 const get=createReader(cloudId,auth,(input,init)=>metadataFetch(input,init,refresh));
 const board=configSchema.parse(await get('/rest/agile/1.0/board/'+id+'/configuration'));
 return boardColumnOptions(board.columnConfig.columns);
}
export function boardColumnOptions(columns:{name:string;statuses:{id:string}[]}[]){
 const unique=new Map<string,{id:string;name:string;statusIds:string[];issueTypes:string[]}>();
 for(const column of columns){
  const item=unique.get(column.name)??{id:column.name,name:column.name,statusIds:[],issueTypes:[]};
  item.statusIds=[...new Set([...item.statusIds,...column.statuses.map(s=>s.id)])];
  unique.set(column.name,item);
 }
 return [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

export function boardStatusOptions(columns:{name:string;statuses:{id:string}[]}[],issues:Board['issues'],projectKey:string,names:{id:string;name:string}[]=[]){
 const named=new Map(names.map(s=>[s.id,s.name.trim()]));
 const statuses=new Map<string,{id:string;name:string;issueTypes:string[]}>();
 for(const column of columns)for(const status of column.statuses){
  const observed=issues.find(i=>i.statusId===status.id&&i.projectKey===projectKey)??issues.find(i=>i.statusId===status.id);
  if(statuses.has(status.id))continue;
  statuses.set(status.id,{id:status.id,name:named.get(status.id)||observed?.status||column.name+' · status '+status.id,issueTypes:[]});
 }
 const result=[...statuses.values()];
 const counts=new Map<string,number>();
 for(const status of result){const key=status.name.toLocaleLowerCase();counts.set(key,(counts.get(key)??0)+1);}
 return result.map(status=>({...status,name:counts.get(status.name.toLocaleLowerCase())!>1?status.name+' · status '+status.id:status.name}));
}
