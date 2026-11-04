import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection,type TwgRequest} from '../server/twg-client';
import {createTwgDashboard} from '../server/twg-dashboard';
import {connectionSchema} from '../shared/contracts';
import {commentsSession} from '../server/comments';
import {attachmentsSession} from '../server/attachments';
import {fetchBoard,fetchWorkspaceIssue,issueSession,fetchProjectStatuses} from '../server/jira';
const config=connectionSchema.parse({transport:'twg',boardUrl:'https://example.atlassian.net/boards/7',envPath:'/must-not-read',twgProfile:'work'});
const issue=(key:string,assignee='user')=>({key,fields:{summary:'Synthetic issue',status:{id:'10',name:'Open'},assignee:{accountId:assignee},issuetype:{name:'Story'},project:{key:'TEST'}}});
function harness(){
 const calls:TwgRequest[]=[];let time=0;
 const state={bad:false,wrongUser:false,repeated:false,active:1};
 const service=createTwgDashboard(path=>new TwgConnection(path,async r=>{
  calls.push(r);const a=r.args,cmd=a.slice(0,4).join('.');
  if(a[0]==='--help')return '  --profile <name>';
  if(a[0]==='user')return JSON.stringify({data:{accountId:'user',name:'Synthetic User'}});
  if(cmd==='jira.board.scope.query'){
   if(state.bad)throw Error('private diagnostic');
   return JSON.stringify({apiVersion:'v2',command:cmd,data:{id:7,name:'Test',columnConfig:{columns:[{name:'Open',statuses:[{id:'10'}]}]}}});
  }
  const offset=Number(a[a.indexOf('--start-at')+1]);
  if(cmd==='jira.board.sprints.query')return JSON.stringify({apiVersion:'v2',command:cmd,data:{sprints:[{id:offset?9:8,name:'Sprint',state:offset&&state.active===1?'future':'active'}],total:2,isLast:offset>0}});
  if(cmd==='jira.sprint.workitems.query')return JSON.stringify({apiVersion:'v2',command:cmd,data:{issues:[issue(offset&&!state.repeated?'TEST-2':'TEST-1',state.wrongUser?'other':'user')],total:2,startAt:offset,maxResults:50}});
  throw Error('Unexpected command');
 }),()=>time);
 return {service,calls,state,advance:()=>{time+=600_001;}};
}
test('TWG dashboard paginates sprints and assigned issues, normalizes metadata, and caches only columns',async()=>{
 const h=harness();const result=await h.service.fetchBoard(config);
 assert.equal(result.selectedSprintId,8);assert.equal(result.issues.length,2);assert.equal(result.user.displayName,'Synthetic User');
 assert.deepEqual(result.columns,[{name:'Open',statusIds:['10']}]);
 assert.equal(JSON.stringify(result).includes('accountId'),false);
 await h.service.fetchBoard(config);
 const count=(part:string)=>h.calls.filter(r=>r.args.join(' ').includes(part)).length;
 assert.equal(count('scope query'),1);assert.equal(count('user get me'),2);assert.equal(count('workitems query'),4);
 h.advance();await h.service.fetchBoard(config);assert.equal(count('scope query'),2);
 await h.service.fetchBoard({...config,twgProfile:'other'});assert.equal(count('scope query'),3);
 assert.ok(h.calls.every(r=>r.args[0]==='--help'||r.args.includes('--profile')));
 h.service.close();
});
test('TWG multi-active sprints require selection and invalid saved sprint is rejected',async()=>{
 const h=harness();h.state.active=2;
 assert.equal((await h.service.fetchBoard(config)).selectedSprintId,null);
 assert.equal(h.calls.some(r=>r.args.includes('workitems')),false);
 assert.equal((await h.service.fetchBoard(config,9)).selectedSprintId,9);
 await assert.rejects(h.service.fetchBoard(config,999),/no longer available/);
});
test('failed metadata is not cached and duplicate/foreign-assignee issues fail closed',async()=>{
 const h=harness();h.state.bad=true;await assert.rejects(h.service.fetchBoard(config));h.state.bad=false;
 assert.equal((await h.service.fetchBoard(config)).issues.length,2);
 h.state.repeated=true;await assert.rejects(h.service.fetchBoard(config),/repeated/);
 h.state.repeated=false;h.state.wrongUser=true;await assert.rejects(h.service.fetchBoard(config),/another user/);
});
test('TWG preview cannot fall back to REST credentials or network for unsupported features',async()=>{
 let fetched=false;const fetcher=(async()=>{fetched=true;throw Error('unexpected network');}) as typeof fetch;
 for(const run of [()=>commentsSession(config,fetcher),()=>attachmentsSession(config,fetcher),()=>fetchBoard(config),()=>fetchWorkspaceIssue(config,'TEST-1'),()=>issueSession(config,'TEST-1',fetcher),()=>fetchProjectStatuses(config,'TEST')]){
  await assert.rejects(run(),/unavailable in TWG read-only mode/);
 }
 assert.equal(fetched,false);
});
test('mapping column choices share cache without fetching sprints or issues; refresh invalidates it',async()=>{
 const h=harness();
 await h.service.columns(config);await h.service.columns(config);
 assert.equal(h.calls.filter(r=>r.args.includes('scope')).length,1);
 assert.equal(h.calls.some(r=>r.args.includes('sprints')||r.args.includes('workitems')),false);
 await h.service.columns(config,true);
 assert.equal(h.calls.filter(r=>r.args.includes('scope')).length,2);
});
