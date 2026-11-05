import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mcpFailure} from '../server/mcp-diagnostics';

test('failure diagnostics emit only a fixed code and no payload',context=>{
 const capture=context.mock.method(console,'warn',()=>{});
 Reflect.apply(mcpFailure,undefined,['write.decode.failed',{access_token:'private-token',body:'private body',error:new Error('private provider detail')}]);
 assert.deepEqual(capture.mock.calls.map(c=>c.arguments),[['[jira-mcp]','write.decode.failed']]);
});
test('untyped events cannot introduce provider text or response objects into logs',context=>{
 const capture=context.mock.method(console,'warn',()=>{});
 for(const value of ['private provider detail','content.response',{toString(){throw Error('Do not inspect provider objects');}},null,undefined])Reflect.apply(mcpFailure,undefined,[value]);
 assert.equal(capture.mock.callCount(),0);
});
test('fixed failure codes preserve actionable stage information without response shapes',context=>{
 const capture=context.mock.method(console,'warn',()=>{});
 mcpFailure('sdk.failed');mcpFailure('token.exchange.failed');mcpFailure('transitions.normalize.failed');mcpFailure('comment.normalize.failed');
 assert.deepEqual(capture.mock.calls.map(c=>c.arguments),['sdk.failed','token.exchange.failed','transitions.normalize.failed','comment.normalize.failed'].map(code=>['[jira-mcp]',code]));
});
