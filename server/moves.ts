import {fieldMetadata,transitionValues} from '../shared/transition-fields';
import type {Connection,Mapping} from '../shared/contracts';
import {startsWorkOnMove} from '../shared/moves';
import {fetchBoard,issueSession} from './jira';
export async function availableMoves(config:Connection,key:string,sprintId:number,mappings:Mapping[]=[],readBoard=fetchBoard,session:(config:Connection,key:string)=>Promise<Pick<Awaited<ReturnType<typeof issueSession>>,'availableTransitions'|'transition'>>=issueSession){
 const board=await readBoard(config,sprintId);
 const issue=board.issues.find(i=>i.key===key);
 if(!issue)throw new Error('This issue is no longer assigned to you in this sprint. Refresh the board.');
 const jira=await session(config,key);
 const transitions=await jira.availableTransitions();
 const mapping=mappings.find(m=>m.jiraProjectKey===issue.projectKey);
 const options=transitions.flatMap(t=>{
  const column=board.columns.find(c=>c.statusIds.includes(t.to.id));
  if(!column||column.statusIds.includes(issue.statusId))return [];
  return [{id:t.id,name:t.name,statusId:t.to.id,column:column.name,
   development:startsWorkOnMove(t.to.id,mapping?.startWorkStatusId,column,mapping?.startWorkColumn),
   fields:Object.entries(t.fields??{}).map(([id,f])=>fieldMetadata(id,f)),
   required:Object.entries(t.fields??{}).filter(([,f])=>f.required).map(([key,f])=>f.name??key)}];
 });
 return {jira,options,issue};
}
export async function performMove(input:{transitionId:string;statusId:string;fields?:Record<string,string>},options:Awaited<ReturnType<typeof availableMoves>>['options'],transition:(id:string,fields?:Record<string,unknown>)=>Promise<unknown>,start:()=>Promise<{workspaceId:string;warning?:string}>){
 const target=options.find(o=>o.id===input.transitionId&&o.statusId===input.statusId);
 if(!target)throw new Error('This transition is no longer available. Refresh and choose again.');
 const fields=transitionValues(target.fields??[],input.fields??{});
 await transition(target.id,fields);
 if(target.development){
  try{return await start();}
  catch(e){return {warning:'Jira status changed, but work could not start: '+(e instanceof Error?e.message:'Check Paseo and retry Start work.')};}
 }
 return {};
}
