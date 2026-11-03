import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBoardUrl,createReader,readIssues,readSprints} from '../server/jira';
test('rejects off-site and embedded credential board URLs',()=>{
  for(const url of ['https://evil.example/boards/51','http://example.atlassian.net/boards/51','https://user:pass@example.atlassian.net/boards/51'])assert.throws(()=>parseBoardUrl(url));
  assert.deepEqual(parseBoardUrl('https://example.atlassian.net/jira/software/c/projects/DEMO/boards/51'),{site:'https://example.atlassian.net',id:51});
});
test('does not send requests for arbitrary endpoints; sends credentials only to gateway',async()=>{
  let called=false;
  const get=createReader('11111111-1111-1111-1111-111111111111',{email:'x@example.test',token:'test'},(async(url,options)=>{called=true;assert.equal(new URL(String(url)).hostname,'api.atlassian.com');assert.equal(options?.method,'GET');assert.equal(options?.redirect,'error');return {ok:true,json:async()=>({})};}) as typeof fetch);
  await assert.rejects(get('/rest/api/3/issue/TD-1/transitions'));assert.equal(called,false);await get('/rest/api/3/myself');assert.equal(called,true);
});
test('reads sprint pagination without dropping later pages',async()=>{
 const rows=await readSprints(async(_,q)=>({values:[{id:Number(q!.startAt)+1,name:'Sprint',state:'active'}],isLast:q!.startAt==='1'}),'/sprint');assert.equal(rows.length,2);
});
test('rejects issues belonging to another assignee',async()=>{
 await assert.rejects(readIssues(async()=>({issues:[{key:'TD-1',fields:{summary:'Test',status:{id:'1',name:'Open'},assignee:{accountId:'other'},issuetype:{name:'Bug'},project:{key:'TD'}}}],isLast:true}),'/issue','me'),/another user/);
});
test('does not return incomplete issue pages',async()=>{
 await assert.rejects(readIssues(async()=>({issues:[],isLast:false}),'/issue','me'),/cursor/);
});
