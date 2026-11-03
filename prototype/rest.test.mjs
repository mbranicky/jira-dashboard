import {test} from 'node:test';
import assert from 'node:assert/strict';
import {credentials,reader,collect} from './rest-core.mjs';
test('env values are data, not shell commands; missing credentials fail',()=>{
 assert.equal(credentials('JIRA_EMAIL=a@b.test\nJIRA_API_TOKEN="$(echo not-executed)"').token,'$(echo not-executed)');
 assert.throws(()=>credentials('JIRA_EMAIL=a@b.test'));
});
test('reader blocks arbitrary paths, uses GET gateway and refuses redirects',async()=>{
 let calls=0;
 const get=reader('11111111-1111-1111-1111-111111111111',{email:'a@b.test',token:'secret'},async(url,options)=>{calls++;assert.equal(url.hostname,'api.atlassian.com');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');return {ok:true,json:async()=>({})};});
 await assert.rejects(get('/rest/api/3/issue/ABC-1/transitions'));
 assert.equal(calls,0);await get('/rest/api/3/myself');assert.equal(calls,1);
});
test('collects every token page and rejects repeated cursors',async()=>{
 let n=0; const results=await collect(async()=>++n===1?{issues:[1],nextPageToken:'a',isLast:false}:{issues:[2],isLast:true},'/x',{},'issues','token');assert.deepEqual(results,[1,2]);
 await assert.rejects(collect(async()=>({issues:[1],nextPageToken:'a',isLast:false}),'/x',{},'issues','token'));
});
test('collects offset sprint pages',async()=>{
 const result=await collect(async(_,q)=>q.startAt==='0'?{values:[1],isLast:false}:{values:[2],isLast:true},'/x',{},'values','offset');assert.deepEqual(result,[1,2]);
});
