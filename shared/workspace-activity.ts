export type ActivityState='attention'|'working'|'needs-input'|'finished'|'failed'|'idle'|'unavailable';
export type WorkspaceActivity={state:ActivityState;source:'agent'|'workspace';updatedAt?:string;agentId?:string};
export type ActivityLink={workspaceId:string;agentId?:string};
type Agent={id:string;workspaceId?:string;status:string;pendingPermissions:unknown[];attentionReason?:string|null;updatedAt:string;archivedAt?:string|null};
type Workspace={id:string;status:string;activityAt:string|null;archivingAt?:string|null};
export type ActivityReader={agents:{ref:(id:string)=>{refresh:()=>Promise<{agent:Agent}|null>}};workspaces:{ref:(id:string)=>{refresh:()=>Promise<Workspace|null>}}};
export const activityKey=(link:ActivityLink)=>JSON.stringify([link.workspaceId,link.agentId??'']);
export function agentActivity(agent:Agent):WorkspaceActivity{
 const state=agent.pendingPermissions.length||agent.attentionReason==='permission'?'needs-input':agent.status==='error'||agent.attentionReason==='error'?'failed':agent.status==='running'||agent.status==='initializing'?'working':agent.attentionReason==='finished'?'finished':'idle';
 return {state,source:'agent',agentId:agent.id,updatedAt:agent.updatedAt};
}
// Read metadata only for linked workspaces. Bound concurrency and isolate failures;
// never read timelines, infer completion from idle, or propagate provider errors.
export async function readWorkspaceActivity(reader:ActivityReader,links:ActivityLink[]){
 const unique=[...new Map(links.map(link=>[activityKey(link),link])).values()];
 const result:Record<string,WorkspaceActivity>={};let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,unique.length)},async()=>{
  while(cursor<unique.length){const link=unique[cursor++];const source=link.agentId?'agent':'workspace';
   let value:WorkspaceActivity={state:'unavailable',source};
   try{if(link.agentId){const entry=await reader.agents.ref(link.agentId).refresh();
    if(entry&&entry.agent.id===link.agentId&&entry.agent.workspaceId===link.workspaceId&&!entry.agent.archivedAt)value=agentActivity(entry.agent);
   }else{const workspace=await reader.workspaces.ref(link.workspaceId).refresh();
    if(workspace&&workspace.id===link.workspaceId&&!workspace.archivingAt)value={source,state:workspace.status==='running'?'working':workspace.status==='needs_input'?'needs-input':workspace.status==='failed'?'failed':workspace.status==='attention'?'attention':'idle',updatedAt:workspace.activityAt??undefined};
   }}catch{/* Keep an explicit unavailable state, without leaking error text. */}
   result[activityKey(link)]=value;
  }
 }));return result;
}
export function activityLabel(value:WorkspaceActivity){
 const prefix=value.source==='agent'?'Agent':'Workspace';
 return `${prefix} ${({'attention':'needs attention','working':'working','needs-input':'needs input','finished':'finished','failed':'failed','idle':'idle','unavailable':'activity unavailable'} as const)[value.state]}`;
}
