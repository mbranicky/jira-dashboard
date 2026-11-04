import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection} from '../server/twg-client';
import {twgSettings} from '../server/twg-settings';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('settings jobs return immediately, reject overlap and redact failures', async()=>{
 let reject!:(error:Error)=>void;
 const service=twgSettings(path=>new TwgConnection(path,()=>new Promise((_,no)=>{reject=no;})));
 const job=service.start({action:'check',executable:'twg',site:'https://example.atlassian.net',profile:'default'});
 assert.equal(job.state,'running');
 assert.throws(()=>service.start({action:'check',executable:'twg',site:'https://example.atlassian.net',profile:'default'}),/already running/);
 reject(new Error('synthetic-secret'));await flush();
 assert.equal(service.poll(job.id).state,'failed');
 assert.ok(!service.poll(job.id).message.includes('synthetic-secret'));service.close();
});
test('cancelled jobs cannot become successful and unknown IDs are rejected',async()=>{
 let finish!:(value:string)=>void;
 const service=twgSettings(path=>new TwgConnection(path,()=>new Promise(yes=>{finish=yes;})));
 const job=service.start({action:'check',executable:'twg',site:'https://example.atlassian.net',profile:'default'});
 assert.throws(()=>service.cancel('other'));
 service.cancel(job.id);finish('{}');await flush();
 assert.equal(service.poll(job.id).state,'cancelled');service.close();assert.throws(()=>service.poll(job.id));
});
test('successful access check does not expose raw output or assert board permissions',async()=>{
 const service=twgSettings(path=>new TwgConnection(path,async request=>request.args[0]==='--help'?'  --profile <name>':'{"sensitive":"synthetic"}'));
 const job=service.start({action:'check',executable:'twg',site:'https://example.atlassian.net',profile:'default'});await flush();
 const result=service.poll(job.id);assert.equal(result.state,'unverified');
 assert.match(result.message,/unverified/);assert.ok(!JSON.stringify(result).includes('synthetic'));service.close();
});

test('settings refuse background OAuth before constructing a CLI connection',()=>{
 let created=false;
 const service=twgSettings(path=>{created=true;return new TwgConnection(path);});
 assert.throws(()=>service.start({action:'login',executable:'twg',site:'https://example.atlassian.net',profile:'default'}),/requires a terminal/);
 assert.equal(created,false);
});
test('board-only output cannot pass the expanded connection check',async()=>{
 const service=twgSettings(path=>new TwgConnection(path,async request=>request.args[0]==='--help'?'  --profile <name>':JSON.stringify({apiVersion:'v2',command:'jira.board.scope.query',data:{id:7,name:'Synthetic',columnConfig:{columns:[{name:'OPEN',statuses:[{id:'1'}]}]}}})));
 const job=service.start({action:'check',executable:'twg',site:'https://example.atlassian.net',profile:'work',boardId:7});await flush();
 assert.equal(service.poll(job.id).state,'failed');assert.equal(service.poll(job.id).result?.steps.at(-1)?.label,'Authentication');service.close();
});
