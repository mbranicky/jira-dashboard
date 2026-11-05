import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import {createMcpDashboard,type McpBoardReader} from '../server/mcp-dashboard';
import {boardTool,type McpBoardTool} from '../server/mcp-tools';
import {assertRestConnection} from '../shared/connection-mode';
import {connectionSchema} from '../shared/contracts';
const site='https://example.atlassian.net',url=`${site}/boards/51`;
const binding={accountId:'user',displayName:'Example',cloudId:'cloud',siteUrl:site,siteName:'Example'};
const issue=(key='TEST-1',assignee='user')=>({key,fields:{summary:'Example issue',status:{id:'1',name:'Open',statusCategory:{key:'new'}},assignee:{accountId:assignee},issuetype:{name:'Bug'},project:{key:'TEST'}}});
const board={id:51,name:'Example board',columnConfig:{columns:[{name:'OPEN',statuses:[{id:'1'},{id:'2'}]},{name:'DONE',statuses:[{id:'3'}]}]}};
const tools=(cursor=false):Tool[]=>[
 {name:'getJiraBoardConfig',inputSchema:{type:'object',properties:{cloudId:{type:'string'},boardId:{type:'number'}},required:['cloudId','boardId']}},
 {name:'listJiraBoardSprints',inputSchema:{type:'object',properties:{cloudId:{type:'string'},boardId:{type:'number'},state:{type:'string'},startAt:{type:'number'},maxResults:{type:'number'}},required:['cloudId','boardId']}},
 {name:'getJiraBoardIssueData',inputSchema:{type:'object',properties:{cloudId:{type:'string'},boardId:{type:'number'},jql:{type:'string'},fields:{type:'array',items:{type:'string'}},maxResults:{type:'number'},[cursor?'nextPageToken':'startAt']:{type:cursor?'string':'number'}},required:['cloudId','boardId','jql']}},
];
function fixture(cursor=false){
 const calls:Array<{name:McpBoardTool;args:Record<string,unknown>}>=[];
 let available=tools(cursor),config:unknown=board;
 let sprints:unknown={values:[{id:7,name:'Current',state:'active'},{id:8,name:'Future',state:'future'},{id:6,name:'Old',state:'closed'}],isLast:true};
 let pages:unknown[]=[{issues:[issue()],isLast:true}];let fail=false;
 const reader:McpBoardReader={verifiedBinding:()=>({...binding}),boardTools:async()=>available,readBoardTool:async(name,args)=>{
  boardTool(available,name,args);calls.push({name,args});if(fail)throw new Error('Read denied.');
  return name==='getJiraBoardConfig'?config:name==='listJiraBoardSprints'?sprints:pages[Math.min(calls.filter(c=>c.name==='getJiraBoardIssueData').length-1,pages.length-1)];
 }};
 return {reader,calls,setConfig:(v:unknown)=>config=v,setSprints:(v:unknown)=>sprints=v,setPages:(v:unknown[])=>pages=v,setTools:(v:Tool[])=>available=v,fail:(v:boolean)=>fail=v};
}
test('MCP preserves real columns, filters old sprints and requests only current-user sprint issues',async()=>{
 const f=fixture();const result=await createMcpDashboard(()=>0).fetchBoard(f.reader,url);
 assert.deepEqual(result.columns,[{name:'OPEN',statusIds:['1','2']},{name:'DONE',statusIds:['3']}]);
 assert.deepEqual(result.sprints.map(s=>s.id),[7,8]);assert.equal(result.selectedSprintId,7);assert.equal(result.issues.length,1);
 const args=f.calls.find(c=>c.name==='getJiraBoardIssueData')!.args;
 assert.equal(args.cloudId,'cloud');assert.equal(args.jql,'sprint = 7 AND assignee = currentUser()');assert.ok(Array.isArray(args.fields));
});
test('metadata alone is cached, expires and is cleared; identical simultaneous reads coalesce',async()=>{
 const f=fixture();let now=0;const adapter=createMcpDashboard(()=>now);
 const a=adapter.fetchBoard(f.reader,url),b=adapter.fetchBoard(f.reader,url);assert.equal(a,b);await a;
 await adapter.fetchBoard(f.reader,url);assert.equal(f.calls.filter(c=>c.name==='getJiraBoardConfig').length,1);assert.equal(f.calls.filter(c=>c.name==='getJiraBoardIssueData').length,2);
 now=600001;await adapter.fetchBoard(f.reader,url);assert.equal(f.calls.filter(c=>c.name==='getJiraBoardConfig').length,2);
 adapter.clear(f.reader);await adapter.fetchBoard(f.reader,url);assert.equal(f.calls.filter(c=>c.name==='getJiraBoardConfig').length,3);
 const other=fixture();await adapter.fetchBoard(other.reader,url);assert.equal(other.calls.filter(c=>c.name==='getJiraBoardConfig').length,1);
});
test('multiple active sprints require explicit selection and unavailable sprint is rejected',async()=>{
 const f=fixture();f.setSprints({values:[{id:7,name:'One',state:'active'},{id:8,name:'Two',state:'active'}],total:2});
 const adapter=createMcpDashboard();const auto=await adapter.fetchBoard(f.reader,url);assert.equal(auto.selectedSprintId,null);assert.equal(auto.issues.length,0);assert.ok(!f.calls.some(c=>c.name==='getJiraBoardIssueData'));
 assert.equal((await adapter.fetchBoard(f.reader,url,8)).selectedSprintId,8);
 await assert.rejects(adapter.fetchBoard(f.reader,url,999),/no longer available/);
});
test('cursor and offset pagination load every page and reject repeats or unconfirmed completion',async()=>{
 for(const cursor of [true,false]){
  const f=fixture(cursor);f.setPages([{issues:[issue()],...(cursor?{nextPageToken:'next',isLast:false}:{startAt:0,total:2})},{issues:[issue('TEST-2')],...(cursor?{isLast:true}:{startAt:1,total:2})}]);
  const data=await createMcpDashboard().fetchBoard(f.reader,url);assert.equal(data.issues.length,2);
  assert.equal(f.calls.at(-1)!.args[cursor?'nextPageToken':'startAt'],cursor?'next':1);
 }
 for(const page of [{issues:[issue()]},{issues:[issue()],isLast:false,nextPageToken:'same'},{issues:[],isLast:false}]){
  const f=fixture(true);f.setPages([page]);await assert.rejects(createMcpDashboard().fetchBoard(f.reader,url),/pagination|page|cursor/i);
 }
});
test('wrong board, ambiguous mappings, other assignees, unmapped statuses and missing tools fail closed',async()=>{
 for(const configure of [
  (f:ReturnType<typeof fixture>)=>f.setConfig({...board,id:52}),
  (f:ReturnType<typeof fixture>)=>f.setConfig({...board,columnConfig:{columns:[board.columnConfig.columns[0],board.columnConfig.columns[0]]}}),
  (f:ReturnType<typeof fixture>)=>f.setPages([{issues:[issue('TEST-2','another-user')],isLast:true}]),
  (f:ReturnType<typeof fixture>)=>f.setPages([{issues:[{...issue(),fields:{...issue().fields,status:{id:'unknown',name:'Unknown'}}}],isLast:true}]),
  (f:ReturnType<typeof fixture>)=>f.setTools(tools().slice(1)),
 ]){const f=fixture();configure(f);await assert.rejects(createMcpDashboard().fetchBoard(f.reader,url));}
 const f=fixture();await assert.rejects(createMcpDashboard().fetchBoard(f.reader,'https://other.atlassian.net/boards/51'),/configured Jira site/);assert.equal(f.calls.length,0);
});
test('failed reads do not poison cache and revoked connections do not serve cached boards',async()=>{
 const f=fixture();const adapter=createMcpDashboard();f.fail(true);await assert.rejects(adapter.fetchBoard(f.reader,url),/denied/);
 f.fail(false);await adapter.fetchBoard(f.reader,url);assert.equal(f.calls.filter(c=>c.name==='getJiraBoardConfig').length,2);
 f.reader.verifiedBinding=()=>{throw new Error('Session expired.');};await assert.rejects(adapter.fetchBoard(f.reader,url),/expired/);
});
test('tool invocation rejects unknown/write operations and incompatible advertised arguments',()=>{
 assert.throws(()=>boardTool(tools(),'transitionJiraIssue' as McpBoardTool,{}),/not allowed/);
 assert.throws(()=>boardTool(tools(),'getJiraBoardConfig',{cloudId:'cloud',boardId:'51'}),/contract/);
 assert.throws(()=>boardTool(tools(),'getJiraBoardConfig',{cloudId:'cloud',boardId:51,arbitrary:'value'}),/contract/);
 assert.throws(()=>boardTool([{...tools()[0],annotations:{readOnlyHint:false}}],'getJiraBoardConfig',{cloudId:'cloud',boardId:51}),/read-only/);
 assert.throws(()=>assertRestConnection(connectionSchema.parse({transport:'mcp'})),/MCP board preview/);
});

test('MCP v2 data envelopes preserve board mappings, sprints and paginated issues',async()=>{
 const f=fixture();f.setConfig({data:board});
 f.setSprints({data:{values:[{id:7,name:'Current',state:'active'}],isLast:true}});
 f.setPages([{data:{issues:[issue()],startAt:0,total:2}},{data:{issues:[issue('TEST-2')],startAt:1,total:2}}]);
 const result=await createMcpDashboard().fetchBoard(f.reader,url);
 assert.equal(result.boardId,51);assert.equal(result.columns.length,2);
 assert.equal(result.selectedSprintId,7);assert.deepEqual(result.issues.map(i=>i.key),['TEST-1','TEST-2']);
});
test('malformed data envelopes do not bypass board validation',async()=>{
 for(const data of [null,[],{}, {...board,id:52}]){
  const f=fixture();f.setConfig({data});
  await assert.rejects(createMcpDashboard().fetchBoard(f.reader,url),/Unsupported MCP board response|different board/);
 }
});

test('live MCP sprint state enum uses all and filters closed sprints locally',async()=>{
 const f=fixture();const catalogue=tools();
 catalogue[1].inputSchema.properties!.state={type:'string',enum:['active','future','closed','all']};
 f.setTools(catalogue);
 const result=await createMcpDashboard().fetchBoard(f.reader,url);
 assert.equal(f.calls.find(c=>c.name==='listJiraBoardSprints')!.args.state,'all');
 assert.deepEqual(result.sprints.map(s=>s.id),[7,8]);
});
test('requests full issue view when advertised so project and metadata are retained',async()=>{
 const f=fixture();const catalogue=tools();
 catalogue[2].inputSchema.properties!.view={type:'string',enum:['compact','evidence','full']};
 catalogue[2].inputSchema.properties!.searchResultMode={type:'string',enum:['issues','count','all']};
 f.setTools(catalogue);await createMcpDashboard().fetchBoard(f.reader,url);
 const args=f.calls.find(c=>c.name==='getJiraBoardIssueData')!.args;
 assert.equal(args.view,'full');assert.equal(args.searchResultMode,'issues');
});
