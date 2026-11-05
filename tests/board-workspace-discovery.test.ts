import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PaseoApi} from '@getpaseo/client';
import {discoverBoardWorkspaces,mergeDiscoveredWorkspaces} from '../server/work';
import {mappingSchema} from '../shared/contracts';
const mappings=[mappingSchema.parse({jiraProjectKey:'TDWNG',paseoProjectId:'project'})];
const workspace=(id:string,name:string,extra={})=>({id,name,projectId:'project',...extra});
function api(pages:unknown[][]){let calls=0;return {paseo:{workspaces:{list:async(options:any)=>{
 assert.equal(options.page.cursor,calls?String(calls):undefined);
 const entries=pages[calls++];return {entries,pageInfo:{hasMore:calls<pages.length,nextCursor:calls<pages.length?String(calls):null}};
 }}} as unknown as PaseoApi,calls:()=>calls};}
test('manual workspace matches a complete issue key in name/title in its mapped project',async()=>{
 const f=api([[workspace('manual','TDWNG-2031')],[workspace('titled','General',{title:'Fix TDWNG-2040'})]]);
 assert.deepEqual(await discoverBoardWorkspaces(f.paseo,mappings,['TDWNG-2031','TDWNG-2040']),{'TDWNG-2031':{workspaceId:'manual'},'TDWNG-2040':{workspaceId:'titled'}});
 assert.equal(f.calls(),2);
});
test('ambiguous, archived, background, internal, wrong-project and partial-name matches are excluded',async()=>{
 const f=api([[
 workspace('one','TDWNG-2031'),workspace('two','TDWNG-2031'),
 workspace('archived','TDWNG-2',{archivingAt:'now'}),workspace('background','TDWNG-3',{background:true}),
 workspace('internal','TDWNG-4',{internal:true}),workspace('wrong','TDWNG-5',{projectId:'other'}),
 workspace('partial','prefixTDWNG-6'),workspace('multiple','TDWNG-7 and TDWNG-8'),
 ]]);
 assert.deepEqual(await discoverBoardWorkspaces(f.paseo,mappings,['TDWNG-2031',...Array.from({length:7},(_,i)=>`TDWNG-${i+2}`)]),{});
});
test('unmapped or already resolved keys need no discovery; incomplete lists never select an arbitrary match',async()=>{
 const f=api([]);assert.deepEqual(await discoverBoardWorkspaces(f.paseo,[],['TDWNG-2031']),{});
 assert.deepEqual(await discoverBoardWorkspaces(f.paseo,mappings,[]),{});assert.equal(f.calls(),0);
 const broken={workspaces:{list:async()=>({entries:[workspace('one','TDWNG-2031')],pageInfo:{hasMore:true,nextCursor:null}})}} as unknown as PaseoApi;
 await assert.rejects(discoverBoardWorkspaces(broken,mappings,['TDWNG-2031']),/all workspaces/);
});

test('failed optional discovery preserves saved links and returns a sanitized warning',async()=>{
 const paseo={workspaces:{list:async()=>{throw Error('private provider details');}}} as unknown as PaseoApi;
 const saved={'TDWNG-2031':{workspaceId:'saved',agentId:'agent'}};
 const result=await mergeDiscoveredWorkspaces(paseo,mappings,['TDWNG-2031','TDWNG-2040'],saved);
 assert.deepEqual(result.links,saved);assert.match(result.workspaceWarning??'',/workspace/i);assert.ok(!result.workspaceWarning?.includes('private'));
});
test('successful discovery preserves saved links, omits warning and only adds complete matches',async()=>{
 const f=api([[workspace('other','TDWNG-2031'),workspace('new','TDWNG-2040')]]);
 const saved={'TDWNG-2031':{workspaceId:'saved',agentId:'agent'}};
 assert.deepEqual(await mergeDiscoveredWorkspaces(f.paseo,mappings,['TDWNG-2031','TDWNG-2040'],saved),{links:{'TDWNG-2040':{workspaceId:'new'},...saved}});
});

test('a later discovery-page failure discards partial matches but keeps saved links',async()=>{
 let page=0;
 const paseo={workspaces:{list:async()=>{
  if(page++)throw Error('private page error');
  return {entries:[workspace('partial','TDWNG-2040')],pageInfo:{hasMore:true,nextCursor:'next'}};
 }}} as unknown as PaseoApi;
 const saved={'TDWNG-2031':{workspaceId:'saved'}};
 const result=await mergeDiscoveredWorkspaces(paseo,mappings,['TDWNG-2031','TDWNG-2040'],saved);
 assert.deepEqual(result.links,saved);assert.ok(result.workspaceWarning);assert.equal(page,2);
});
