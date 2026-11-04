import {checkedOutBase,issueBranches,selectIssueBranch} from './issue-branches';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {PaseoApi} from '@getpaseo/client';
import type {Connection,Mapping} from '../shared/contracts';
import {fetchBoard,issueSession,parseBoardUrl} from './jira';
import {connectLocalHost} from './local-host';

export function workIdentity(site:string,key:string){
  const hex=createHash('sha256').update(`${site}\n${key}`).digest('hex');
  return {key:hex,agentId:`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`};
}
export function entryPrompt(skill:string,key:string){
  const name=skill.trim().replace(/^\/+/, '');
  return name?`/${name} ${key}`:undefined;
}
export function issueTypeLabel(type:string):{name:string;color:'emerald'|'red'}|undefined{
  switch(type.trim().toLowerCase()){
    case 'story':case 'user story':return {name:'Story',color:'emerald'};
    case 'bug':case 'problem':return {name:'Bug',color:'red'};
    default:return undefined;
  }
}
export async function validateWork(config:Connection,items:Mapping[],key:string,sprintId:number,readBoard=fetchBoard){
  const board=await readBoard(config,sprintId);
  const issue=board.issues.find(i=>i.key===key);
  if(!issue)throw new Error('This issue is no longer assigned to you in the selected sprint. Refresh the board.');
  const mapping=items.find(m=>m.jiraProjectKey===issue.projectKey);
  if(!mapping)throw new Error(`Configure a project mapping for ${issue.projectKey} in Settings first.`);
  if(!mapping.provider||!mapping.isolation)throw new Error('Choose an explicit provider and workspace isolation in this project mapping first.');
  return {mapping,issue};
}
type RecordState={site?:string;issueKey?:string;workspaceId?:string;agentId?:string;projectId:string;skillAttempted?:boolean;skillSent?:boolean;generation?:string;branchName?:string};
const active=new Map<string,Promise<{workspaceId:string;agentId:string;warning?:string}>>();
export function startIssue(paseo:PaseoApi,config:Connection,mapping:Mapping,key:string,selection?:string, dependencies={connectLocalHost,issueSession,issueBranches,checkedOutBase},issueType=''){
  const site=parseBoardUrl(config.boardUrl).site;const identity=workIdentity(site,key);
  const pending=active.get(identity.key);if(pending)return pending;
  const job=run();active.set(identity.key,job);void job.finally(()=>active.delete(identity.key)).catch(()=>{});return job;
  async function run(){
    const local=await dependencies.connectLocalHost(paseo);
    try {
      const dir=join(local.home,'plugin-data','jira-dashboard',local.serverId);
      await mkdir(dir,{recursive:true,mode:0o700});const file=join(dir,identity.key+'.json');
      let state:RecordState;
      try{state=JSON.parse(await readFile(file,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;state={projectId:mapping.paseoProjectId};}
      if(state.workspaceId&&!await activeWorkspace(paseo,state.workspaceId)){
        state={projectId:mapping.paseoProjectId,generation:randomUUID()};
      }
      const creationKey=identity.key+'-reuse-v1'+(state.generation?'-'+state.generation:'');
      state.site=site;state.issueKey=key;
      const save=async()=>{await writeFile(file+'.tmp',JSON.stringify(state),{mode:0o600});await rename(file+'.tmp',file);};
      await save();
      const projects=await paseo.projects.list();const project=projects.projects.find(p=>p.projectId===state.projectId);
      if(!project)throw new Error('The mapped Paseo project is unavailable. Check Settings.');
      let configProvider='';
      if(!state.agentId){
        if(!mapping.isolation)throw new Error('Choose workspace isolation in Settings.');
        if(mapping.isolation==='worktree'&&project.projectKind!=='git')throw new Error('This Paseo project is not a Git repository. Choose project-directory isolation.');
        const provider=mapping.provider.split('/')[0];
        const models=await paseo.providers.listModels(provider,{cwd:project.projectRootPath});
        if(models.error)throw new Error(`Cannot load models for ${provider}. Check the provider in Paseo.`);
        const selected=mapping.model||mapping.provider.split('/').slice(1).join('/')||models.models?.find(m=>m.isDefault&&m.isSelectable!==false)?.id;
        if(!selected)throw new Error('This provider has no advertised default model. Specify a model in the mapping.');
        if(!models.models?.some(m=>m.isSelectable!==false&&(m.id===selected||m.aliases?.includes(selected))))throw new Error('The configured model is unavailable. Check the mapping.');
        if(mapping.modeId){
          const modes=await paseo.providers.listModes(provider,{cwd:project.projectRootPath});
          if(modes.error||!modes.modes?.some(mode=>mode.id===mapping.modeId))throw new Error('The configured agent mode is unavailable. Check the project mapping.');
        }
        configProvider=`${provider}/${selected}`;
      }
      if(state.agentId){
        const existing=await paseo.agents.ref(state.agentId).refresh();
        if(!existing||existing.agent.archivedAt)throw new Error('The linked agent was removed or archived. Restore it in Paseo before starting again.');
      }
      if(!state.workspaceId){
        const chosen=mapping.isolation==='worktree'?selectIssueBranch(await dependencies.issueBranches(project.projectRootPath,key),selection):undefined;
        const source=mapping.isolation!=='worktree'?{kind:'directory' as const,projectId:project.projectId,path:project.projectRootPath}:chosen?.path?
          {kind:'directory' as const,projectId:project.projectId,path:chosen.path}:chosen?
          {kind:'worktree' as const,projectId:project.projectId,cwd:project.projectRootPath,action:'checkout' as const,refName:chosen.branch}:
          {kind:'worktree' as const,projectId:project.projectId,cwd:project.projectRootPath,action:'branch-off' as const,branchName:key,refName:await dependencies.checkedOutBase(project.projectRootPath)};
        const workspace=await paseo.workspaces.create({title:key,idempotencyKey:`jira-${creationKey}`,source});
        state.workspaceId=workspace.id;await save();
      }
      const labels=await local.client.listWorkspaceLabels();
      const typeLabel=issueTypeLabel(issueType);
      const desired=[{name:'In Progress',color:labels.labels.find(l=>l.name==='In Progress')?.color??'sky'},...(typeLabel?[typeLabel]:[])];
      for(const label of desired){
        const existing=labels.labels.find(l=>l.name===label.name);
        if(typeLabel&&label.name===typeLabel.name&&existing&&existing.color!==label.color){
          const updated=await local.client.updateWorkspaceLabel({name:label.name,color:label.color});
          if('error' in updated&&updated.error)throw new Error(`Could not update the ${label.name} workspace label color. Retry Start work.`);
        }
        const assigned=await local.client.setWorkspaceLabel({workspaceId:state.workspaceId,label,assigned:true});
        if('error' in assigned&&assigned.error)throw new Error(`Could not apply the ${label.name} workspace label. Retry Start work.`);
      }
      if(!state.agentId){
        const workspace=paseo.workspaces.ref(state.workspaceId);await workspace.refresh();
        if(!workspace.directory)throw new Error('Workspace directory is unavailable.');
        const agent=await workspace.agents.create({agentId:state.generation??identity.agentId,idempotencyKey:`jira-agent-${creationKey}`,title:key,config:{provider:configProvider,...(mapping.modeId?{modeId:mapping.modeId}:{})}});
        state.agentId=agent.id;await save();
      }
      const prompt=entryPrompt(mapping.entrySkill,key);
      let warning:string|undefined;
      if(prompt&&!state.skillAttempted){
        state.skillAttempted=true;await save();
        try{await paseo.agents.ref(state.agentId).send(prompt);state.skillSent=true;await save();}
        catch{warning='The workspace and agent are ready, but skill delivery could not be confirmed. Check the agent before sending the skill manually.';}
      }else if(prompt&&state.skillAttempted&&!state.skillSent){warning='Previous skill delivery could not be confirmed. Check the agent; it will not be sent again automatically.';}
      if(!state.skillAttempted){state.skillAttempted=true;state.skillSent=true;await save();}
      await save();
      return {workspaceId:state.workspaceId,agentId:state.agentId,warning};
    }finally{await local.client.close();}
  }
}

export async function hasExistingWork(paseo:PaseoApi,config:Connection,key:string){
  const local=await connectLocalHost(paseo);
  try{
    const identity=workIdentity(parseBoardUrl(config.boardUrl).site,key);
    try{const state=JSON.parse(await readFile(join(local.home,'plugin-data','jira-dashboard',local.serverId,identity.key+'.json'),'utf8')) as RecordState;return !!state.workspaceId&&await activeWorkspace(paseo,state.workspaceId);}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}
  }finally{await local.client.close();}
}

// Old records contain only a site/key hash. Recover those only from matching names.
export async function savedWorkspaceIssues(paseo:PaseoApi,config:Connection,workspaceId:string,candidates:string[]){
 const local=await connectLocalHost(paseo);
 try{return await readWorkspaceLinks(join(local.home,'plugin-data','jira-dashboard',local.serverId),parseBoardUrl(config.boardUrl).site,workspaceId,candidates);}
 finally{await local.client.close();}
}
export async function readWorkspaceLinks(dir:string,site:string,workspaceId:string,candidates:string[]){
 let files:string[];try{files=await readdir(dir);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
 const keys:string[]=[];
 for(const file of files.filter(f=>/^[a-f0-9]{64}\.json$/.test(f))){
  const state=JSON.parse(await readFile(join(dir,file),'utf8')) as RecordState;
  if(state.workspaceId!==workspaceId)continue;
  if(!state.site&&!state.issueKey){
   try{const link=JSON.parse(await readFile(join(dir,file+'.link'),'utf8'));state.site=link.site;state.issueKey=link.issueKey;}
   catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  if(state.site===site&&state.issueKey&&workIdentity(site,state.issueKey).key+'.json'===file)keys.push(state.issueKey);
  else if(!state.site&&!state.issueKey){const key=candidates.find(k=>workIdentity(site,k).key+'.json'===file);if(key){
   keys.push(key);
   // Persist recovered metadata so later workspace/agent renames retain the link.
   await writeFile(join(dir,file+'.link'),JSON.stringify({site,issueKey:key}),{mode:0o600});
  }}
 }
 return [...new Set(keys)];
}


export async function boardWorkspaceLinks(paseo:PaseoApi,config:Connection,keys:string[]){
  const local=await connectLocalHost(paseo);
  try{
    const links=await readBoardWorkspaceLinks(join(local.home,'plugin-data','jira-dashboard',local.serverId),parseBoardUrl(config.boardUrl).site,keys);
    await Promise.all(Object.entries(links).map(async([key,link])=>{
      if(!await activeWorkspace(paseo,link.workspaceId))delete links[key];
    }));
    return links;
  }
  finally{await local.client.close();}
}
export async function readBoardWorkspaceLinks(dir:string,site:string,keys:string[]){
  const links:Record<string,{workspaceId:string;agentId?:string}>={};
  await Promise.all(keys.map(async key=>{
    try{
      const state=JSON.parse(await readFile(join(dir,workIdentity(site,key).key+'.json'),'utf8')) as RecordState;
      if(typeof state.workspaceId==='string'&&state.workspaceId)
        links[key]={workspaceId:state.workspaceId,...(typeof state.agentId==='string'&&state.agentId?{agentId:state.agentId}:{})};
    }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }));
  return links;
}

export async function activeWorkspace(paseo:PaseoApi,id:string){
  const workspace=await paseo.workspaces.ref(id).refresh();
  return !!workspace&&!workspace.archivingAt;
}

export async function prepareIssueBranches(paseo:PaseoApi,mapping:Mapping,key:string){
 if(mapping.isolation!=='worktree')return [];
 const project=(await paseo.projects.list()).projects.find(p=>p.projectId===mapping.paseoProjectId);
 if(!project)throw Error('Mapped project is unavailable.');
 return issueBranches(project.projectRootPath,key);
}
