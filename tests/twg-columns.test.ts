import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeTwgColumns} from '../server/twg-columns';
import {TwgConnection} from '../server/twg-client';

const fixture=()=>({apiVersion:'v2',command:'jira.board.scope.query',data:{id:7,name:'Synthetic board',
  columnConfig:{columns:[{name:'OPEN',statuses:[{id:'10'},{id:'11'},{id:'10'}]},
    {name:'IN PROGRESS / DEVELOPMENT',statuses:[{id:'20'}]}, {name:'EMPTY',statuses:[]}]}}});

test('scope decoder preserves ordered columns, empty columns, and all distinct status IDs',()=>{
  assert.deepEqual(decodeTwgColumns(fixture(),7),{boardId:7,name:'Synthetic board',columns:[
    {name:'OPEN',statusIds:['10','11']},{name:'IN PROGRESS / DEVELOPMENT',statusIds:['20']},{name:'EMPTY',statusIds:[]}]});
});
test('scope decoder rejects wrong board, wrong command and incomplete configuration',()=>{
  assert.throws(()=>decodeTwgColumns(fixture(),8));
  for(const value of [{ok:true},{...fixture(),command:'jira.board.get'},
    {...fixture(),data:{id:7,name:'Synthetic board'}}, {...fixture(),apiVersion:'v3'}]) {
    assert.throws(()=>decodeTwgColumns(value,7));
  }
});
test('board column request binds site and profile and executes only the read command',async()=>{
  const calls:string[][]=[];
  const client=new TwgConnection('twg',async request=>{
    calls.push(request.args);
    return request.args[0]==='--help'?'  --profile <name>':JSON.stringify(fixture());
  });
  await client.boardColumns({site:'https://example.atlassian.net',profile:'work'},7);
  assert.deepEqual(calls,[['--help'],['jira','board','scope','query','--id','7','--site',
    'example.atlassian.net','--profile','work','-o','json','--output-summary','none']]);
  await assert.rejects(client.boardColumns({site:'https://example.atlassian.net',profile:'work'},NaN));
  assert.equal(calls.length,2);
  client.close();
});
