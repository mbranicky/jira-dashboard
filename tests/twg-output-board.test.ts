import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTwgOutput} from '../server/twg-output';
import {normalizeTwgBoard} from '../server/twg-board';
test('direct output parser rejects summaries, errors and malformed output without leaking contents',()=>{
 for(const value of ['output_files: /secret','{"output_files":{"stdout":"/secret"}}','{"stdout_inline":{}}','{"error":"secret"}','[]','null'])assert.throws(()=>parseTwgOutput(value),error=>error instanceof Error&&!error.message.includes('secret'));
 assert.deepEqual(parseTwgOutput('{"command":"access","data":{}}'),{command:'access',data:{}});
});
const expected={site:'https://example.atlassian.net',boardId:1};
const fixture=()=>({...expected,name:'Synthetic board',complete:true,user:{accountId:'user-1',displayName:'Test user'},columns:[{name:'OPEN',statusIds:['1','2']}],sprints:[{id:1,name:'Current',state:'active'},{id:2,name:'Old',state:'closed'}],selectedSprintId:1,issues:[{key:'TEST-1',summary:'Synthetic issue',statusId:'2',status:'Ready',type:'Bug',priority:null,projectKey:'TEST',assigneeAccountId:'user-1'}]});
test('internal board adapter retains column mappings and removes closed sprints/private account fields',()=>{
 const board=normalizeTwgBoard(fixture(),expected,()=>new Date('2026-11-04T12:00:00Z'));
 assert.deepEqual(board.columns[0].statusIds,['1','2']);assert.equal(board.sprints.length,1);
 assert.equal('assigneeAccountId' in board.issues[0],false);assert.equal('accountId' in board.user,false);
});
test('internal adapter fails closed for incomplete, cross-site or incorrectly scoped data',()=>{
 const source=fixture();
 for(const value of [{...source,complete:false},{...source,site:'https://other.atlassian.net'},{...source,boardId:9},{...source,selectedSprintId:2},{...source,selectedSprintId:null},{...source,issues:[{...source.issues[0],assigneeAccountId:'other'}]},{...source,issues:[{...source.issues[0],statusId:'unknown'}]},{...source,issues:[...source.issues,...source.issues]}])assert.throws(()=>normalizeTwgBoard(value,expected));
});
