import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import {checkMcpConnection} from '../server/mcp-connection-check';
const site='https://example.atlassian.net',input={hostId:'host',boardUrl:`${site}/boards/51`};
const binding={accountId:'user',displayName:'Example user',cloudId:'cloud',siteUrl:site,siteName:'Example'};
function fixture(){
 const calls:string[]=[];let failure='',empty=false,multiple=false;let tools:Tool[]=[
  {name:'getJiraBoardConfig',inputSchema:{type:'object',properties:{cloudId:{type:'string'},boardId:{type:'number'}}}},
  {name:'listJiraBoardSprints',inputSchema:{type:'object',properties:{cloudId:{type:'string'},boardId:{type:'number'},state:{type:'string'},startAt:{type:'number'},maxResults:{type:'number'}}}},
  {name:'getJiraBoardIssueData',inputSchema:{type:'object',properties:{cloudId:{type:'string'},boardId:{type:'number'},jql:{type:'string'},fields:{type:'array'},maxResults:{type:'number'},startAt:{type:'number'}}}},
  {name:'searchJiraIssuesUsingJql',inputSchema:{type:'object',properties:{cloudId:{type:'string'},jql:{type:'string'},fields:{type:'array'},maxResults:{type:'number'}}}},
 ];
 const step=(name:string)=>{calls.push(name);if(failure===name)throw Error('private token response');};
 const reader:Awaited<ReturnType<Parameters<typeof checkMcpConnection>[1]>>={
  verifiedBinding:()=>binding,
  checkReadAccess:async()=>{step('auth');return binding;},
  listTools:async()=>{step('tools');return tools;},
  boardTools:async()=>{throw Error('Do not use cached tools');},
  readIssueTool:async args=>{step('search');assert.equal(args.jql,'assignee = currentUser()');assert.equal(args.maxResults,1);return {data:{issues:[]}};},
  readBoardTool:async(name,args)=>{
   step(name);assert.equal(args.cloudId,'cloud');
   if(name==='getJiraBoardConfig')return {data:{id:51,name:'Example board',columnConfig:{columns:[{name:'Open',statuses:[{id:'1'}]}]}}};
   if(name==='listJiraBoardSprints')return {data:{values:empty?[]:[{id:7,name:'Current',state:'active'},...(multiple?[{id:8,name:'Other',state:'active'}]:[])],isLast:true}};
   assert.equal(args.jql,'sprint = 7 AND assignee = currentUser()');return {data:{issues:[],isLast:true}};
  },
 };
 return {calls,connect:async(target:{hostId:string;site:string})=>{assert.deepEqual(target,{hostId:'host',site});return reader;},fail:(name:string)=>{failure=name;},empty:()=>{empty=true;},multiple:()=>{multiple=true;},missing:()=>{tools=tools.slice(0,3);}};
}
test('MCP report checks every read stage with fresh tools/configuration on each invocation',async()=>{
 const f=fixture();const result=await checkMcpConnection(input,f.connect);
 assert.equal(result.ok,true);assert.deepEqual(result.steps.map(s=>[s.label,s.state]),['Board URL','Authentication','MCP compatibility','Board access','Sprint access','Sprint issues','Workspace issue search'].map(label=>[label,'passed']));
 assert.match(result.steps[3].message,/Example board: 1 columns/);assert.match(result.steps[5].message,/0 assigned issues.*Current/);
 await checkMcpConnection(input,f.connect);for(const name of ['auth','tools','getJiraBoardConfig'])assert.equal(f.calls.filter(n=>n===name).length,2);
 assert.ok(f.calls.every(n=>['auth','tools','getJiraBoardConfig','listJiraBoardSprints','getJiraBoardIssueData','search'].includes(n)));
});
test('MCP report attributes failures to the correct stage and excludes raw error data',async()=>{
 for(const [name,label] of [['auth','Authentication'],['tools','MCP compatibility'],['getJiraBoardConfig','Board access'],['listJiraBoardSprints','Sprint access'],['getJiraBoardIssueData','Sprint issues'],['search','Workspace issue search']]){
  const f=fixture();f.fail(name);const result=await checkMcpConnection(input,f.connect);assert.equal(result.ok,false);assert.equal(result.steps.at(-1)?.label,label);assert.equal(result.steps.at(-1)?.state,'failed');assert.ok(!JSON.stringify(result).includes('private'));assert.equal(f.calls.at(-1),name);
 }
});
test('no sprints skips issue check, while multiple active sprints sample one without saving selection',async()=>{
 const empty=fixture();empty.empty();const result=await checkMcpConnection(input,empty.connect);assert.equal(result.ok,true);assert.equal(result.steps.find(s=>s.label==='Sprint issues')?.state,'skipped');assert.ok(!empty.calls.includes('getJiraBoardIssueData'));assert.ok(empty.calls.includes('search'));
 const multi=fixture();multi.multiple();const checked=await checkMcpConnection(input,multi.connect);assert.equal(checked.ok,true);assert.equal(checked.steps.length,7);assert.equal(checked.steps.find(s=>s.label==='Sprint issues')?.state,'passed');assert.equal(multi.calls.filter(n=>n==='getJiraBoardIssueData').length,1);
});
test('invalid board URL never connects and missing tools stop before board reads',async()=>{
 const f=fixture();const invalid=await checkMcpConnection({...input,boardUrl:'https://evil.example/boards/1'},async()=>{throw Error('must not connect');});assert.equal(invalid.steps[0].label,'Board URL');assert.equal(invalid.ok,false);
 f.missing();const missing=await checkMcpConnection(input,f.connect);assert.equal(missing.steps.at(-1)?.label,'MCP compatibility');assert.deepEqual(f.calls,['auth','tools']);
});
