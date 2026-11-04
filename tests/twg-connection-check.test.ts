import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection} from '../server/twg-client';
import {checkTwgConnection} from '../server/twg-connection-check';
const input={site:'https://example.atlassian.net',profile:'work',boardId:7};
function harness(fail='',empty=false){
 const calls:string[][]=[];
 const cli=new TwgConnection('twg',async({args:a})=>{
  calls.push(a);if(a[0]==='--help')return '  --profile <name>';
  assert.equal(a[a.indexOf('--profile')+1],'work');assert.equal(a[a.indexOf('--site')+1],'example.atlassian.net');
  const cmd=a.slice(0,a[0]==='user'||a[2]==='query'?3:4).join('.');
  if(cmd===fail)throw Error('private diagnostic');
  const out=(data:unknown)=>JSON.stringify({apiVersion:'v2',command:cmd,data});
  if(a[0]==='user')return out({accountId:'user',name:'Synthetic User'});
  if(cmd==='jira.board.scope.query')return out({id:7,name:'Test board',columnConfig:{columns:[{name:'Open',statuses:[{id:'1'}]}]}});
  const offset=Number(a[a.indexOf('--start-at')+1]);
  if(cmd==='jira.board.sprints.query')return out({sprints:empty?[]:[{id:8+offset,name:'Sprint',state:'active'}],total:empty?0:2,startAt:offset});
  if(cmd==='jira.sprint.workitems.query')return out({issues:[{key:`TEST-${offset+1}`,fields:{summary:'Test',status:{id:'1',name:'Open'},issuetype:{name:'Bug'},project:{key:'TEST'},assignee:{accountId:'user'}}}],total:2,startAt:offset});
  if(cmd==='jira.workitem.query'){if(fail==='malformed')return out({unexpected:'private diagnostic'});assert.equal(a[a.indexOf('--limit')+1],'1');assert.equal(a[a.indexOf('--jql')+1],'assignee = currentUser()');return out({issues:[]});}
  throw Error('Unexpected read command');
 });return {cli,calls};
}
test('fresh TWG check validates identity, board, paginated sprints/issues and independent search',async()=>{
 const {cli,calls}=harness();try{
 const result=await checkTwgConnection(cli,input);assert.equal(result.ok,true);assert.deepEqual(result.steps.map(s=>s.label),['Board URL','CLI compatibility','Authentication','Board access','Sprint access','Sprint issues','Workspace issue search']);
 assert.ok(result.steps.every(s=>s.state==='passed'));assert.match(result.steps[2].message,/Synthetic User/);assert.match(result.steps[5].message,/2 assigned/);
 await checkTwgConnection(cli,input);assert.equal(calls.filter(a=>a.join(' ').includes('board scope query')).length,2);
 }finally{cli.close();}
});
test('no sprint skips sprint issues but still verifies independent search',async()=>{
 const {cli,calls}=harness('',true);try{const result=await checkTwgConnection(cli,input);assert.equal(result.ok,true);assert.equal(result.steps[5].state,'skipped');assert.equal(result.steps[6].state,'passed');assert.ok(!calls.some(a=>a.includes('--sprint-id')));}finally{cli.close();}
});
for(const [command,label] of [['user.get.me','Authentication'],['jira.board.scope.query','Board access'],['jira.board.sprints.query','Sprint access'],['jira.sprint.workitems.query','Sprint issues'],['jira.workitem.query','Workspace issue search']])test(`failure at ${label} preserves prior steps and redacts diagnostics`,async()=>{
 const {cli}=harness(command);try{const result=await checkTwgConnection(cli,input);assert.equal(result.ok,false);assert.equal(result.steps.at(-1)?.label,label);assert.equal(result.steps.at(-1)?.state,'failed');assert.ok(result.steps.slice(0,-1).every(s=>s.state==='passed'));assert.ok(!JSON.stringify(result).includes('private diagnostic'));}finally{cli.close();}
});

test('malformed search success cannot be reported as verified',async()=>{
 const {cli}=harness('malformed');try{const result=await checkTwgConnection(cli,input);assert.equal(result.ok,false);assert.equal(result.steps.at(-1)?.label,'Workspace issue search');assert.match(result.steps.at(-1)!.message,/unsupported/);assert.ok(!JSON.stringify(result).includes('private diagnostic'));}finally{cli.close();}
});
