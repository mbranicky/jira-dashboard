import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionSchema,mappingSchema,mappingsSchema} from '../shared/contracts';
import {validateWork} from '../server/work';
import {availableMoves,performMove} from '../server/moves';
const first=mappingSchema.parse({name:'App',jiraProjectKey:'TEST',paseoProjectId:'app',provider:'claude',isolation:'directory',startWorkColumn:'Development'});
const second={...first,name:'Tests',paseoProjectId:'qa',provider:'codex',entrySkill:'test-issue'};
test('multiple destinations are valid but the same Jira/project pair is rejected',()=>{
 assert.equal(mappingsSchema.safeParse({items:[first,second]}).success,true);
 assert.equal(mappingsSchema.safeParse({items:[first,{...first,name:'Duplicate'}]}).success,false);
 assert.equal(mappingsSchema.safeParse({items:[first,{...first,jiraProjectKey:'OTHER'}]}).success,true);
});
for(const transport of ['rest','twg','mcp'] as const){
 const config=connectionSchema.parse({transport,boardUrl:'https://example.atlassian.net/boards/1'});
 const issue={key:'TEST-1',projectKey:'TEST',type:'Test',statusId:'1'};
 const read=async()=>({issues:[issue],columns:[{name:'Development',statusIds:['2']}]}) as any;
 test(`${transport}: explicit destination survives reordering; missing/stale/cross-project selections fail closed`,async()=>{
  assert.equal((await validateWork(config,[first,second],'TEST-1',1,read,'qa')).mapping,second);
  assert.equal((await validateWork(config,[second,first],'TEST-1',1,read,'qa')).mapping,second);
  assert.equal((await validateWork(config,[first],'TEST-1',1,read)).mapping,first);
  for(const project of [undefined,'removed'])await assert.rejects(validateWork(config,[first,second],'TEST-1',1,read,project),/Choose|no longer mapped/);
  await assert.rejects(validateWork(config,[first,{...second,jiraProjectKey:'OTHER'}],'TEST-1',1,read,'qa'),/no longer mapped/);
 });
 test(`${transport}: move destinations follow their own triggers and require a valid choice before any write`,async()=>{
  const calls:string[]=[];
  const session=async()=>({availableTransitions:async()=>[{id:'go',name:'Go',to:{id:'2'}}],transition:async()=>{calls.push('move');}}) as any;
  const result=await availableMoves(config,'TEST-1',1,[first,second],read,session);
  assert.deepEqual(result.options[0].destinations,[{projectId:'app',name:'App'},{projectId:'qa',name:'Tests'}]);
  const start=async()=>{calls.push('start');return {workspaceId:'w'};};
  for(const projectId of [undefined,'removed'])await assert.rejects(performMove({transitionId:'go',statusId:'2',projectId},result.options,result.jira.transition,start),/Choose|no longer available/);
  assert.deepEqual(calls,[]);
  await performMove({transitionId:'go',statusId:'2',projectId:'qa'},result.options,result.jira.transition,start);
  assert.deepEqual(calls,['move','start']);
  const one=await availableMoves(config,'TEST-1',1,[{...first,startWorkColumn:'Other'},second],read,session);
  assert.deepEqual(one.options[0].destinations,[{projectId:'qa',name:'Tests'}]);
 });
}
