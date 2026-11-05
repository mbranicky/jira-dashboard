import {spawnSync} from 'node:child_process';
import {dirname} from 'node:path';
import nativeLocation from './mcp-native-location.json';
import type {KeyringEntry} from './mcp-store';
// Constant code only in argv. Requests and responses, including credentials, use private pipes.
// No shell, files, inherited Node preload flags, or raw child errors are used.
const helper=`
const fs=require('node:fs');
try {
 const input=JSON.parse(fs.readFileSync(0,'utf8'));
 const {Entry}=require(input.module);
 const entry=new Entry(input.service,input.account,{linux:{store:'secret-service'}});
 let value;
 switch(input.operation){
  case 'probe':value=true;break;
  case 'read':value=entry.getPassword();break;
  case 'write':entry.setPassword(input.value);value=true;break;
  case 'delete':value=entry.deleteCredential();break;
  default:throw Error();
 }
 process.stdout.write(JSON.stringify({ok:true,value}));
} catch {process.stdout.write(JSON.stringify({ok:false}));process.exitCode=1;}
`;
export function keyringHelperEntry(service:string,account:string,run:typeof spawnSync=spawnSync):KeyringEntry {
 function call(operation:'probe'|'read'|'write'|'delete',value?:string):unknown {
  const env={...process.env};
  delete env.NODE_OPTIONS;delete env.NODE_PATH;delete env.ELECTRON_RUN_AS_NODE;
  const result=run(nativeLocation.node,['-e',helper],{
   input:JSON.stringify({module:nativeLocation.entry,service,account,operation,value}),
   encoding:'utf8',env,timeout:15000,maxBuffer:256*1024,windowsHide:true,
   cwd:dirname(nativeLocation.entry),stdio:['pipe','pipe','pipe'],
  });
  if(result.error||result.status!==0||result.signal)throw Error('Secure credential helper failed.');
  try {const response=JSON.parse(result.stdout);if(response.ok!==true)throw Error();return response.value;}
  catch {throw Error('Secure credential helper failed.');}
 }
 if(call('probe')!==true)throw Error('Secure credential helper failed.');
 return {
  getPassword(){const value=call('read');if(value!==null&&typeof value!=='string')throw Error('Invalid credential response.');return value as string|null;},
  setPassword(value){if(call('write',value)!==true)throw Error('Invalid credential response.');},
  deleteCredential(){const value=call('delete');if(typeof value!=='boolean')throw Error('Invalid credential response.');return value;},
 };
}
