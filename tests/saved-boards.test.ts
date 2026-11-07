import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionSchema} from '../shared/contracts';
import {canonicalBoardUrl,addSavedBoard,selectSavedBoard} from '../shared/saved-boards';
for(const transport of ['rest','twg','mcp'] as const)test(`${transport} board selection preserves authorization and configuration`,()=>{
 const config=connectionSchema.parse({transport,boardUrl:'https://example.atlassian.net/boards/1',envPath:'/example.env',twgProfile:'work',mcpHostId:'host',mcpWrites:true,twgWrites:true});
 const saved=addSavedBoard(config,'Other','https://example.atlassian.net/jira/software/c/projects/TEST/boards/2');const selected=selectSavedBoard(saved,saved.savedBoards[0].url);
 assert.equal(selected.boardUrl,'https://example.atlassian.net/boards/2');assert.deepEqual({...selected,boardUrl:config.boardUrl,savedBoards:[]},config);
 assert.throws(()=>selectSavedBoard(saved,'https://other.atlassian.net/boards/2'),/currently connected/);
 assert.throws(()=>addSavedBoard(saved,'Duplicate','https://example.atlassian.net/boards/2'),/already saved/);
 assert.throws(()=>selectSavedBoard(saved,'https://example.atlassian.net/boards/99'),/Save this board/);
});
test('board URLs reject unsafe schemes, credentials, ports and invalid IDs',()=>{
 for(const value of ['http://example.atlassian.net/boards/1','https://user@example.atlassian.net/boards/1','https://example.atlassian.net:8443/boards/1','https://evil.test/boards/1','https://example.atlassian.net/boards/0'])assert.throws(()=>canonicalBoardUrl(value));
 assert.equal(canonicalBoardUrl('https://example.atlassian.net/jira/software/c/projects/X/boards/001?x=1'),'https://example.atlassian.net/boards/1');
});
