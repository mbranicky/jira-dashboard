import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {isAbsolute} from 'node:path';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
test('CommonJS evaluated plugin loads the native module lazily without import.meta or credentials',async()=>{
 const result=await build({entryPoints:['server/mcp-store.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['zod','@modelcontextprotocol/sdk/*'],logLevel:'silent'});
 let loads=0,entries=0;
 const module:any={exports:{}};
 const runtimeRequire=(name:string)=>name==='node:child_process'?{spawnSync:(executable:string,args:string[],options:any)=>{
  assert.ok(isAbsolute(executable));assert.ok(!executable.includes('Paseo.app'));
  assert.equal(args[0],'-e');assert.ok(!args.join(' ').includes('synthetic-host'));
  const input=JSON.parse(options.input);assert.equal(input.module,require.resolve('@napi-rs/keyring'));
  assert.equal(input.operation,'probe');loads++;entries++;
  return {status:0,stdout:JSON.stringify({ok:true,value:true})};
 }}:require(name);
 new Function('require','module','exports',result.outputFiles[0].text)(runtimeRequire,module,module.exports);
 assert.equal(loads,0);
 await module.exports.createMcpCredentialStore('synthetic-host','https://example.atlassian.net');
 assert.equal(loads,1);assert.equal(entries,1);
});
