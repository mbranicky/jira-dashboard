import {test} from 'node:test';
import assert from 'node:assert/strict';
import {McpConnectionFailure} from '../server/mcp-client';
import {mcpSettings} from '../server/mcp-settings';
import {McpOAuthSession} from '../server/mcp-oauth';
import type {JiraMcpConnection} from '../server/mcp-client';
const target={hostId:'mock-host',site:'https://example.atlassian.net'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(mode:'consent'|'connected'='consent'){
 let authorize:(url:URL)=>Promise<void>=async()=>{};
 let resolve!:(url:URL)=>void;
 let reject!:(error:Error)=>void;
 let closed=0,stopped=0,deleted=0,stores=0;
 let locked=false;
 const callbacks:Promise<URL>[]=[];
 const manager=mcpSettings({
  store:async()=>{stores++;return {read:()=>undefined,write:()=>{},delete:()=>{if(locked)throw Error('private native response');deleted++;}};},
  callback:async(open)=>{
   authorize=open;const callback=new Promise<URL>((yes,no)=>{resolve=yes;reject=no;});void callback.catch(()=>{});callbacks.push(callback);
   return {session:new McpOAuthSession(12345,open),callback,stop:()=>{stopped++;reject(new Error('cancelled'));},cancel:()=>{stopped++;reject(new Error('cancelled'));}};
  },
  connection:()=>({
   connect:async()=>{if(mode==='connected')return 'connected';await authorize(new URL('https://auth.atlassian.com/authorize?state=synthetic'));return 'authorization-required';},
   completeAuthorization:async()=> 'connected',
   verifiedBinding:()=>({accountId:'synthetic-account',displayName:'Example user',siteUrl:target.site}),
   close:async()=>{closed++;},
  }) as unknown as JiraMcpConnection,
 });
 return {manager,finish:()=>resolve(new URL('http://127.0.0.1:12345/callback?code=synthetic')),timeout:()=>reject(new Error('private timeout')),lock:()=>{locked=true;},counts:()=>({closed,stopped,deleted,stores})};
}
test('status is passive; duplicate starts blocked; consent URL cleared after success',async()=>{
 const f=fixture();assert.equal(f.manager.status(target).state,'idle');assert.equal(f.counts().stores,0);
 await f.manager.start({...target,authorize:true,browserOnHost:true});await tick();
 assert.equal(f.manager.status(target).state,'authorizing');
 await assert.rejects(f.manager.start({...target,authorize:true,browserOnHost:true}),/already running/);
 f.finish();await tick();
 const state=f.manager.status(target);assert.equal(state.state,'connected');assert.equal(state.authorizationUrl,undefined);assert.equal(state.account,'Example user');assert.equal(state.accountId,'synthetic-account');
 assert.ok(f.counts().stopped);assert.equal(f.counts().closed,0);f.manager.close();await tick();assert.equal(f.counts().closed,1);
});
test('cancel closes resources and late completion cannot resurrect connection',async()=>{
 const f=fixture();const job=await f.manager.start({...target,authorize:true,browserOnHost:true});await tick();
 await f.manager.cancel({...target,id:job.id!});f.finish();await tick();
 assert.equal(f.manager.status(target).state,'cancelled');assert.equal(f.manager.status(target).authorizationUrl,undefined);assert.equal(f.counts().deleted,0);
 const next=await f.manager.start({...target,authorize:true,browserOnHost:true});await tick();
 await f.manager.cancel({...target,id:job.id!});assert.equal(f.manager.status(target).id,next.id);assert.equal(f.manager.status(target).state,'authorizing');f.manager.close();
});
test('checking saved credentials never presents consent; timeout failures sanitized',async()=>{
 const f=fixture();await f.manager.start({...target,authorize:false,browserOnHost:false});await tick();
 assert.equal(f.manager.status(target).state,'failed');assert.equal(f.manager.status(target).authorizationUrl,undefined);
 await assert.rejects(f.manager.start({...target,authorize:true,browserOnHost:false}),/Paseo host/);
 await f.manager.start({...target,authorize:true,browserOnHost:true});await tick();f.timeout();await tick();
 assert.equal(f.manager.status(target).state,'failed');assert.ok(!JSON.stringify(f.manager.status(target)).includes('private'));f.manager.close();
});
test('disconnect deletes only explicitly, reports locked-store failure and retries',async()=>{
 const f=fixture('connected');await f.manager.start({...target,authorize:false,browserOnHost:false});await tick();
 assert.equal(f.manager.status(target).state,'connected');
 assert.equal((await f.manager.disconnect(target)).state,'idle');assert.equal(f.counts().deleted,1);
 f.lock();assert.equal((await f.manager.disconnect(target)).state,'failed');assert.match(f.manager.status(target).message,/retry Disconnect/);f.manager.close();
});
test('shutdown during asynchronous store initialization does not create a callback',async()=>{
 let release!:()=>void;let calls=0;
 const f=mcpSettings({store:async()=>{await new Promise<void>(yes=>{release=yes;});return {read:()=>undefined,write:()=>{},delete:()=>{}};},callback:async()=>{calls++;throw Error();},connection:()=>{throw Error();}});
 await f.start({...target,authorize:false,browserOnHost:false});f.close();release();await tick();assert.equal(calls,0);
});

test('store initialization failures identify the stage without exposing native errors',async()=>{
 const manager=mcpSettings({store:async()=>{throw Error('private native path and secret');},callback:async()=>{throw Error('must not create listener');},connection:()=>{throw Error('must not connect');}});
 await manager.start({...target,authorize:true,browserOnHost:true});await tick();
 assert.match(manager.status(target).message,/initialize secure credential storage/);
 assert.ok(!JSON.stringify(manager.status(target)).includes('private'));manager.close();
});

test('connection errors report only a safe stage and approved OAuth reason',async()=>{
 const manager=mcpSettings({store:async()=>({read:()=>undefined,write:()=>{},delete:()=>{}}),callback:async()=>({session:new McpOAuthSession(12345,async()=>{}),callback:new Promise<URL>(()=>{}),stop(){},cancel(){}}),connection:()=>({connect:async()=>{throw new McpConnectionFailure('token');},close:async()=>{}}) as unknown as JiraMcpConnection});
 await manager.start({...target,authorize:true,browserOnHost:true});await tick();
 assert.match(manager.status(target).message,/token exchange failed/);manager.close();
});

test('dashboard restores saved connection once after reload without consent or deletion',async()=>{
 const f=fixture('connected');
 const [a,b]=await Promise.all([f.manager.ensureConnection(target),f.manager.ensureConnection(target)]);
 assert.equal(a,b);assert.equal(f.counts().stores,1);assert.equal(f.counts().deleted,0);
 assert.equal(f.manager.status(target).state,'connected');f.manager.close();
});
test('failed silent restore never opens consent or retries on each refresh',async()=>{
 const f=fixture();
 await assert.rejects(f.manager.ensureConnection(target),/Connect Atlassian/);
 await assert.rejects(f.manager.ensureConnection(target),/Connect Atlassian/);
 assert.equal(f.counts().stores,1);assert.equal(f.counts().deleted,0);
 assert.equal(f.manager.status(target).authorizationUrl,undefined);f.manager.close();
});

test('explicit connection test restores saved access and reuses an active connection without consent or deletion',async()=>{
 const f=fixture('connected');await f.manager.checkConnection(target);const first=f.counts();
 await f.manager.checkConnection(target);assert.deepEqual(f.counts(),first);assert.equal(first.deleted,0);assert.equal(first.stores,1);f.manager.close();
});
test('explicit connection test reports missing consent without opening authorization',async()=>{
 const f=fixture();await assert.rejects(f.manager.checkConnection(target),/Connect Atlassian/);assert.equal(f.manager.status(target).authorizationUrl,undefined);assert.equal(f.counts().deleted,0);f.manager.close();
});

test('testing a different draft site preserves the current connected session',async()=>{
 const f=fixture('connected');await f.manager.checkConnection(target);const before=f.counts();
 await assert.rejects(f.manager.checkConnection({...target,site:'https://other.atlassian.net'}),/another host or site/);
 assert.deepEqual(f.counts(),before);assert.equal(f.manager.status(target).state,'connected');assert.doesNotThrow(()=>f.manager.connection(target));f.manager.close();
});
