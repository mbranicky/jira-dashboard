import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection} from '../server/twg-client';
import {twgSettings} from '../server/twg-settings';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('settings jobs return immediately, reject overlap and redact failures', async()=>{
 let reject!:(error:Error)=>void;
 const service=twgSettings(path=>new TwgConnection(path,()=>new Promise((_,no)=>{reject=no;})));
 const job=service.start({action:'login',executable:'twg'});
 assert.equal(job.state,'running');
 assert.throws(()=>service.start({action:'check',executable:'twg'}),/already running/);
 reject(new Error('synthetic-secret'));await flush();
 assert.equal(service.poll(job.id).state,'failed');
 assert.ok(!service.poll(job.id).message.includes('synthetic-secret'));service.close();
});
test('cancelled jobs cannot become successful and unknown IDs are rejected',async()=>{
 let finish!:(value:string)=>void;
 const service=twgSettings(path=>new TwgConnection(path,()=>new Promise(yes=>{finish=yes;})));
 const job=service.start({action:'check',executable:'twg'});
 assert.throws(()=>service.cancel('other'));
 service.cancel(job.id);finish('{}');await flush();
 assert.equal(service.poll(job.id).state,'cancelled');service.close();assert.throws(()=>service.poll(job.id));
});
test('successful access check does not expose raw output or assert board permissions',async()=>{
 const service=twgSettings(path=>new TwgConnection(path,async()=>'{"sensitive":"synthetic"}'));
 const job=service.start({action:'check',executable:'twg'});await flush();
 const result=service.poll(job.id);assert.equal(result.state,'succeeded');
 assert.match(result.message,/not verified/);assert.ok(!JSON.stringify(result).includes('synthetic'));service.close();
});
