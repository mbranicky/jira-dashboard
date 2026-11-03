import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {PaseoApi} from '@getpaseo/client';
import {startIssue,workIdentity,entryPrompt} from '../server/work';
import type {Mapping} from '../shared/contracts';
const config={boardUrl:'https://example.atlassian.net/boards/51',envPath:'/unused',refreshSeconds:60};
const mapping:Mapping={name:'Test mapping',jiraProjectKey:'TD',paseoProjectId:'p1',provider:'codex',model:'',entrySkill:'',isolation:'directory',autoUpdateJira:false};
async function fixture(){
 const home=await mkdtemp(join(tmpdir(),'jira-work-'));const calls:string[]=[];const creations:any[]=[];const assignedLabels:any[]=[];const existingLabels:any[]=[];const colorUpdates:any[]=[];let failSend=false,failLabel=false,failAgent=false;
 const agent={id:'agent-1',send:async(text:string)=>{calls.push('send:'+text);if(failSend)throw new Error('lost acknowledgement');},refresh:async()=>({agent:{archivedAt:null}})};
 const workspace={id:'workspace-1',directory:'/project',refresh:async()=>({id:'workspace-1',archivingAt:null}),agents:{create:async(options:any)=>{calls.push('agent:'+options.title);if(failAgent)throw new Error('Agent creation failed');if(options.config.modeId)calls.push('mode:'+options.config.modeId);assert.equal(options.prompt,undefined);return agent;}}};
 const paseo={providers:{listModes:async()=>({modes:[{id:'auto',label:'Auto mode'}]}),listModels:async()=>({models:[{id:'default-model',isDefault:true}]})},projects:{list:async()=>({projects:[{projectId:'p1',projectRootPath:'/project',projectKind:'git'}]})},workspaces:{create:async(options:any)=>{creations.push(options);calls.push('workspace:'+options.title);assert.equal(options.source.projectId,'p1');return workspace;},ref:()=>workspace},agents:{ref:()=>agent}} as unknown as PaseoApi;
 const deps={checkedOutBase:async()=>'refs/heads/release/6.8',issueBranches:async()=>[],connectLocalHost:async()=>({home,serverId:'server-test',client:{close:async()=>{},listWorkspaceLabels:async()=>({labels:existingLabels}),updateWorkspaceLabel:async(options:any)=>{colorUpdates.push(options);return {};},setWorkspaceLabel:async(options:any)=>{calls.push('label');assignedLabels.push(options.label);if(failLabel)throw new Error('label failed');return {};}}}),issueSession:async()=>({workflow:async()=>({alreadyInProgress:false,transitions:[{id:'7',name:'Start'}]}),transition:async()=>{calls.push('transition');return null;}})} as unknown as Parameters<typeof startIssue>[5];
 return {paseo,deps,calls,creations,assignedLabels,existingLabels,colorUpdates,cleanup:()=>rm(home,{recursive:true,force:true}),failAgent:(value:boolean)=>{failAgent=value;},failSend:()=>{failSend=true;},failLabel:(value:boolean)=>{failLabel=value;}};
}
test('blank skill creates named workspace and agent, labels it, and sends no prompt; repeated start reuses',async()=>{
 const f=await fixture();try{
  await Promise.all([startIssue(f.paseo,config,mapping,'TD-1',undefined,f.deps),startIssue(f.paseo,config,mapping,'TD-1',undefined,f.deps)]);
  await startIssue(f.paseo,config,mapping,'TD-1',undefined,f.deps);
  assert.equal(f.calls.filter(c=>c==='workspace:TD-1').length,1);assert.equal(f.calls.filter(c=>c==='agent:TD-1').length,1);assert.equal(f.calls.some(c=>c.startsWith('send:')),false);assert.equal(f.calls.includes('label'),true);
 }finally{await f.cleanup();}
});
test('configured skill is sent once and uncertain delivery is not automatically retried',async()=>{
 const f=await fixture();try{f.failSend();const m={...mapping,entrySkill:'init-bugfix'};
 const result=await startIssue(f.paseo,config,m,'TD-2',undefined,f.deps);assert.ok(result.warning);
 await startIssue(f.paseo,config,m,'TD-2',undefined,f.deps);
 assert.equal(f.calls.filter(c=>c.startsWith('send:')).length,1);assert.match(f.calls.find(c=>c.startsWith('send:'))!,/init-bugfix.*TD-2/);
 }finally{await f.cleanup();}
});
test('Play never updates Jira even with a legacy automatic-update setting',async()=>{
 const f=await fixture();try{
  await startIssue(f.paseo,config,{...mapping,autoUpdateJira:true},'TD-3',undefined,f.deps);
  assert.equal(f.calls.includes('transition'),false);
  assert.equal(f.calls.includes('workspace:TD-3'),true);
 }finally{await f.cleanup();}
});
test('partial label failure resumes the existing workspace rather than creating another',async()=>{
 const f=await fixture();try{f.failLabel(true);await assert.rejects(startIssue(f.paseo,config,mapping,'TD-4',undefined,f.deps));f.failLabel(false);await startIssue(f.paseo,config,mapping,'TD-4',undefined,f.deps);assert.equal(f.calls.filter(c=>c==='workspace:TD-4').length,1);
 }finally{await f.cleanup();}
});
test('identity is site scoped and blank skill has no prompt',()=>{
 assert.notEqual(workIdentity('https://a.atlassian.net','TD-1').key,workIdentity('https://b.atlassian.net','TD-1').key);assert.equal(entryPrompt('  ','TD-1'),undefined);
});

test('new worktree uses the issue branch without a suffix',async()=>{
 const f=await fixture();try{
  await startIssue(f.paseo,config,{...mapping,isolation:'worktree'},'TD-5',undefined,f.deps);
  assert.equal(f.creations[0].source.branchName,'TD-5');
  assert.equal(f.creations[0].source.refName,'refs/heads/release/6.8');
 }finally{await f.cleanup();}
});
test('existing worktree is reused and multiple branches require a choice',async()=>{
 const f=await fixture();try{
  const options=[{id:'a',branch:'td-6',path:'/existing'},{id:'b',branch:'fix/td-6',path:'/other'}];
  const deps={...f.deps,issueBranches:async()=>options};
  await assert.rejects(startIssue(f.paseo,config,{...mapping,isolation:'worktree'},'TD-6',undefined,deps),/Multiple/);
  assert.equal(f.creations.length,0);
  await startIssue(f.paseo,config,{...mapping,isolation:'worktree'},'TD-6','a',deps);
  assert.equal(f.creations[0].source.kind,'directory');
  assert.equal(f.creations[0].source.path,'/existing');
 }finally{await f.cleanup();}
});

test('selected provider mode is passed to new agents and invalid modes fail before creation',async()=>{
 const f=await fixture();try{
  await assert.rejects(startIssue(f.paseo,config,{...mapping,modeId:'missing'},'TD-7',undefined,f.deps),/mode is unavailable/);
  assert.equal(f.creations.length,0);
  await startIssue(f.paseo,config,{...mapping,modeId:'auto'},'TD-7',undefined,f.deps);
  assert.ok(f.calls.includes('mode:auto'));
 }finally{await f.cleanup();}
});

test('entry prompt uses the slash skill command and issue key only',()=>{
 for(const skill of ['init-issue',' /init-issue '])assert.equal(entryPrompt(skill,'APP-4225'),'/init-issue APP-4225');
 assert.equal(entryPrompt('','APP-4225'),undefined);
});

test('workspaces receive issue-type labels with the requested colors and no extra labels for other types',async()=>{
 for(const [type,label] of [['User Story',{name:'Story',color:'emerald'}],['Story',{name:'Story',color:'emerald'}],['Bug',{name:'Bug',color:'red'}],['Problem',{name:'Bug',color:'red'}],['Task',undefined]] as const){
  const f=await fixture();try{
   await startIssue(f.paseo,config,mapping,'TD-8',undefined,f.deps,type);
   assert.deepEqual(f.assignedLabels,[{name:'In Progress',color:'sky'},...(label?[label]:[])]);
   assert.equal(f.calls.filter(c=>c.startsWith('agent:')).length,1);
  }finally{await f.cleanup();}
 }
});
test('existing type labels are reused and their colors corrected while unrelated label colors are preserved',async()=>{
 const f=await fixture();try{
  f.existingLabels.push({name:'Story',color:'blue'},{name:'In Progress',color:'violet'});
  await startIssue(f.paseo,config,mapping,'TD-9',undefined,f.deps,'Story');
  assert.deepEqual(f.colorUpdates,[{name:'Story',color:'emerald'}]);
  assert.deepEqual(f.assignedLabels,[{name:'In Progress',color:'violet'},{name:'Story',color:'emerald'}]);
 }finally{await f.cleanup();}
});

test('agent creation failure retries the same workspace and sends the entry skill only after success',async()=>{
 const f=await fixture();try{
  f.failAgent(true);const m={...mapping,entrySkill:'init-issue'};
  await assert.rejects(startIssue(f.paseo,config,m,'TD-91',undefined,f.deps),/Agent creation failed/);
  assert.equal(f.calls.filter(c=>c.startsWith('send:')).length,0);
  f.failAgent(false);await startIssue(f.paseo,config,m,'TD-91',undefined,f.deps);
  assert.equal(f.creations.length,1);
  assert.equal(f.calls.filter(c=>c.startsWith('agent:')).length,2);
  assert.equal(f.calls.filter(c=>c.startsWith('send:')).length,1);
 }finally{await f.cleanup();}
});
