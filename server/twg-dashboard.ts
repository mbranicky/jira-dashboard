import {TwgFailure} from './twg-errors';
import {decodeTwgIssue} from './twg-issue';
import {z} from 'zod';
import {TwgConnection} from './twg-client';
import {decodeTwgIdentity} from './twg-identity';
import {normalizeTwgBoard} from './twg-board';
import {parseBoardUrl,rawIssue} from './jira';
import type {Connection} from '../shared/contracts';

const sprint=z.object({id:z.number().int().positive(),name:z.string(),state:z.string()});
const paging={total:z.number().int().nonnegative().optional(),startAt:z.number().int().nonnegative().optional(),isLast:z.boolean().optional()};
export const sprintsPage=z.object({apiVersion:z.literal('v2'),command:z.literal('jira.board.sprints.query'),data:z.object({...paging,sprints:z.array(sprint)})});
export const issuesPage=z.object({apiVersion:z.literal('v2'),command:z.literal('jira.sprint.workitems.query'),data:z.object({...paging,issues:z.array(rawIssue)})});
/** Success-only, bounded metadata cache. Identity and issue content are never cached. */
export function createTwgDashboard(make=(path:string)=>new TwgConnection(path),now=Date.now){
 const cache=new Map<string,{until:number;value:Awaited<ReturnType<TwgConnection['boardColumns']>>}>();
 const active=new Set<TwgConnection>();
 async function fetchBoard(config:Connection,sprintId?:number,columnsOnly=false){
  const {site,id}=parseBoardUrl(config.boardUrl),target={site,profile:config.twgProfile};
  const cli=make(config.twgExecutable);active.add(cli);
  try{
   await cli.requireProfileSupport();
   const user=decodeTwgIdentity(await cli.readDashboard('identity',target));
   const key=JSON.stringify([config.twgExecutable,site,config.twgProfile,id,user.accountId]);
   let board=cache.get(key);
   if(!board||board.until<=now()){
    const value=await cli.boardColumns(target,id);
    board={until:now()+600_000,value};
    if(cache.size>=128)cache.delete(cache.keys().next().value!);
    cache.set(key,board);
   }
   if(columnsOnly)return normalizeTwgBoard({site,boardId:id,name:board.value.name,columns:board.value.columns,user,sprints:[],selectedSprintId:null,issues:[],complete:true},{site,boardId:id});
   const sprints=await pages(async start=>sprintsPage.parse(await cli.readDashboard('sprints',target,id,start)).data,'sprints');
   const available=sprints.filter(s=>s.state==='active'||s.state==='future');
   if(sprintId!==undefined&&!available.some(s=>s.id===sprintId))throw new Error('Selected sprint is no longer available on this board. Choose another sprint.');
   const running=available.filter(s=>s.state==='active');
   const selectedSprintId=sprintId??(running.length===1?running[0].id:null);
   const raw=selectedSprintId===null?[]:await pages(async start=>issuesPage.parse(await cli.readDashboard('issues',target,selectedSprintId,start)).data,'issues');
   const issues=raw.map(issue=>{
    const f=issue.fields;
    return {key:issue.key,summary:f.summary,parent:f.parent?{key:f.parent.key,summary:f.parent.fields.summary}:null,
     fixVersions:f.fixVersions?.map(v=>v.name)??[],labels:f.labels??[],statusId:f.status.id,status:f.status.name,
     statusCategory:f.status.statusCategory?.key,type:f.issuetype.name,priority:f.priority?.name??null,
     projectKey:f.project.key,assigneeAccountId:f.assignee?.accountId??null};
   });
   return normalizeTwgBoard({site,boardId:id,name:board.value.name,columns:board.value.columns,user,
    sprints:available,selectedSprintId,issues,complete:true},{site,boardId:id});
  }catch(error){
   if(error instanceof z.ZodError)throw new Error('Incomplete or unsupported TWG dashboard response.');
   throw error;
  }finally{cli.close();active.delete(cli);}
 }
 async function issue(config:Connection,key:string){
  const {site}=parseBoardUrl(config.boardUrl);const cli=make(config.twgExecutable);active.add(cli);
  try{await cli.requireProfileSupport();return await decodeTwgIssue(await cli.readIssue({site,profile:config.twgProfile},key),site,key);}
  catch(error){if(error instanceof TwgFailure&&error.kind==='not-found')return null;throw error;}
  finally{cli.close();active.delete(cli);}
 }
 return {fetchBoard,issue,columns:async(config:Connection,refresh=false)=>{if(refresh)cache.clear();return (await fetchBoard(config,undefined,true)).columns;},clear:()=>cache.clear(),close:()=>{cache.clear();for(const cli of active)cli.close();active.clear();}};
}
export async function pages<T,K extends string>(read:(start:number)=>Promise<{total?:number;startAt?:number;isLast?:boolean}&Record<K,T[]>>,key:K):Promise<T[]>{
 const output:T[]=[];const seen=new Set<string>();
 for(let page=0;page<100;page++){
  const data=await read(output.length),items=data[key];
  if(data.startAt!==undefined&&data.startAt!==output.length)throw new Error('TWG returned an unexpected page offset.');
  for(const item of items){const value=item as {id?:unknown;key?:unknown};const id=String(value.key??value.id);if(seen.has(id))throw new Error('TWG returned a repeated page or duplicate item.');seen.add(id);}
  output.push(...items);
  if(data.total!==undefined&&output.length>data.total)throw new Error('TWG returned inconsistent pagination totals.');
  if(data.isLast===true){if(data.total!==undefined&&output.length!==data.total)throw new Error('Incomplete TWG pagination.');return output;}
  if(data.total!==undefined&&output.length===data.total&&data.isLast!==false)return output;
  if(!items.length||data.total===undefined&&data.isLast===undefined)throw new Error('TWG did not confirm complete pagination.');
 }
 throw new Error('TWG pagination limit exceeded.');
}
