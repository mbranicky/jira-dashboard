import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetadataFetch} from '../server/metadata-cache';
test('metadata caches successful responses, isolates credentials and expires',async()=>{
 let calls=0,time=0;
 const cached=createMetadataFetch((async()=>{calls++;return new Response('{"ok":true}',{status:200});}) as typeof fetch,()=>time);
 const url='https://example.test/rest/api/3/myself';
 await Promise.all([cached(url),cached(url)]);assert.equal(calls,1);
 await cached(url,{headers:{Authorization:'other'}});assert.equal(calls,2);
 time=3600001;await cached(url);assert.equal(calls,3);
 await cached(url,undefined,true);assert.equal(calls,4);
});
test('errors, malformed responses and issue data are never cached',async()=>{
 for(const [path,status,body] of [['myself',403,'{}'],['myself',200,'bad'],['issue/TD-1',200,'{}']] as const){
  let calls=0;const cached=createMetadataFetch((async()=>{calls++;return new Response(body,{status});}) as typeof fetch);
  for(let i=0;i<2;i++)await cached('https://example.test/rest/api/3/'+path).catch(()=>{});
  assert.equal(calls,2);
 }
});
test('workflow status names are cached and explicit refresh bypasses the cache',async()=>{
 let calls=0;
 const cached=createMetadataFetch((async()=>{calls++;return new Response('[]',{status:200});}) as typeof fetch);
 const url='https://example.test/rest/api/3/status';
 await cached(url);await cached(url);assert.equal(calls,1);
 await cached(url,undefined,true);assert.equal(calls,2);
});
