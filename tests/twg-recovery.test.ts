import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection,runTwg} from '../server/twg-client';
import {TwgFailure} from '../server/twg-errors';
import {createTwgDashboard} from '../server/twg-dashboard';
import {connectionSchema} from '../shared/contracts';
import {validateWork} from '../server/work';
const config=connectionSchema.parse({transport:'twg',boardUrl:'https://example.atlassian.net/boards/1'});
test('structured failures produce fixed recovery guidance without raw diagnostics',async()=>{
 for(const [status,kind] of [[401,'auth'],[403,'forbidden'],[404,'not-found'],[429,'rate-limit']] as const){
  const output=JSON.stringify({error:{statusCode:status,message:'synthetic-secret',remediation:{command:'unsafe'}}});
  const cli=new TwgConnection('twg',async()=>output);
  await assert.rejects(cli.capabilities(),e=>e instanceof TwgFailure&&e.kind===kind&&!e.message.includes('synthetic-secret'));
  await assert.rejects(runTwg({executable:process.execPath,args:['-e',`process.stdout.write(${JSON.stringify(output)});process.exit(1)`]}),e=>e instanceof TwgFailure&&e.kind===kind);
 }
});
test('missing executable is not mislabeled as unsupported profile',async()=>{
 const cli=new TwgConnection('/nonexistent/twg');await assert.rejects(cli.requireProfileSupport(),e=>e instanceof TwgFailure&&e.kind==='missing-cli');
});
test('only not-found becomes a quiet workspace miss; auth and permissions remain errors',async()=>{
 for(const statusCode of [401,403,404,429]){
  const service=createTwgDashboard(path=>new TwgConnection(path,async r=>r.args[0]==='--help'?'  --profile <name>':JSON.stringify({error:{statusCode}})));
  try{if(statusCode===404)assert.equal(await service.issue(config,'TEST-1'),null);else await assert.rejects(service.issue(config,'TEST-1'),TwgFailure);}finally{service.close();}
 }
});
test('TWG Start work validation uses its selected reader and rejects issues outside the assigned sprint',async()=>{
 const mapping={name:'Test',jiraProjectKey:'TEST',paseoProjectId:'p1',provider:'codex',model:'',entrySkill:'init-issue',isolation:'directory' as const,autoUpdateJira:true};
 const issue={key:'TEST-1',projectKey:'TEST',type:'Bug'};
 let calls=0;
 const read=async(c:typeof config,sprint?:number)=>{assert.equal(c.transport,'twg');assert.equal(sprint,7);calls++;return {issues:[issue]} as any;};
 assert.equal((await validateWork(config,[mapping],'TEST-1',7,read)).issue.type,'Bug');
 await assert.rejects(validateWork(config,[mapping],'TEST-2',7,read),/no longer assigned/);assert.equal(calls,2);
});
