import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {spawnSync} from 'node:child_process';
import {keyringHelperEntry} from '../server/mcp-keyring-helper';
test('credential helper uses private pipes, bounded calls and no secret command arguments',()=>{
 const operations:string[]=[];
 const run=((file:string,args:string[],options:any)=>{
  const input=JSON.parse(options.input);operations.push(input.operation);
  assert.ok(!args.join(' ').includes('synthetic-secret'));
  assert.equal(options.shell,undefined);assert.equal(options.timeout,15000);
  assert.deepEqual(options.stdio,['pipe','pipe','pipe']);
  assert.equal(options.env.NODE_OPTIONS,undefined);assert.equal(options.env.ELECTRON_RUN_AS_NODE,undefined);
  if(input.operation==='write')assert.equal(input.value,'synthetic-secret');
  return {status:0,stdout:JSON.stringify({ok:true,value:input.operation==='read'?'synthetic-secret':true})};
 }) as typeof spawnSync;
 const entry=keyringHelperEntry('test-service','test-account',run);
 assert.equal(entry.getPassword(),'synthetic-secret');entry.setPassword('synthetic-secret');assert.equal(entry.deleteCredential(),true);
 assert.deepEqual(operations,['probe','read','write','delete']);
});
test('helper failures and malformed replies are sanitized without fallback',()=>{
 for(const result of [{status:1,stderr:'synthetic-secret'},{status:0,stdout:'synthetic-secret'},{status:0,stdout:'{"ok":false}'},{status:null,error:new Error('synthetic-secret')},{status:0,stdout:'{"ok":true,"value":false}'}]){
  assert.throws(()=>keyringHelperEntry('service','account',(()=>result) as unknown as typeof spawnSync),/^Error: Secure credential helper failed\.$/);
 }
});
