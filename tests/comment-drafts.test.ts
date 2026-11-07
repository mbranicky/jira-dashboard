import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraftStore,draftStorageKey,type DraftStorage} from '../shared/comment-drafts';
import {draftIdentity} from '../server/draft-identity';
import {connectionSchema} from '../shared/contracts';
import type {TwgConnection} from '../server/twg-client';
const value={text:'Private draft',requestId:'11111111-1111-4111-8111-111111111111',uncertain:true,parent:{id:'12',author:'Author',restricted:true}};
function storage(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};}
test('draft survives a new client store with reply context and uncertain-delivery protection',()=>{
 const disk=storage();const key=draftStorageKey('h','https://example.atlassian.net','u','TEST-1');
 assert.equal(createDraftStore(()=>disk).write(key,value),true);
 assert.deepEqual(createDraftStore(()=>disk).read(key),value);
 assert.equal(createDraftStore(()=>disk).write(key,undefined),true);
 assert.equal(createDraftStore(()=>disk).read(key),undefined);
});
test('different host/site/account/issue cannot restore another draft',()=>{
 const disk=storage(),store=createDraftStore(()=>disk);const key=draftStorageKey('h','https://example.atlassian.net','u','TEST-1');store.write(key,value);
 for(const args of [['other','https://example.atlassian.net','u','TEST-1'],['h','https://other.atlassian.net','u','TEST-1'],['h','https://example.atlassian.net','other','TEST-1'],['h','https://example.atlassian.net','u','TEST-2']])assert.equal(store.read(draftStorageKey(...args as [string,string,string,string])),undefined);
});
test('unavailable or broken storage retains a session copy and reports non-durability',()=>{
 const disk:DraftStorage={getItem:()=>'{bad',setItem:()=>{throw Error('full');},removeItem:()=>{throw Error('denied');}};const store=createDraftStore(()=>disk);
 assert.equal(store.read('k'),undefined);assert.equal(store.write('k',value),false);assert.deepEqual(store.read('k'),value);assert.equal(store.write('k',undefined),false);assert.equal(store.read('k'),undefined);
 assert.equal(createDraftStore(()=>undefined).write('k',value),false);
});
for(const transport of ['rest','twg','mcp'] as const)test(`${transport} draft identity uses authenticated account and configured site`,async()=>{
 const config=connectionSchema.parse({transport,boardUrl:'https://example.atlassian.net/boards/1',twgProfile:'work'});let closed=false;
 const result=await draftIdentity(config,async()=>({accountId:'user',displayName:'U',cloudId:'cloud',siteUrl:'https://example.atlassian.net',siteName:'S'}),async()=>({site:'https://example.atlassian.net',request:async path=>{assert.equal(path,'/rest/api/3/myself');return {accountId:'user'};}}),()=>({requireProfileSupport:async()=>{},readDashboard:async(kind:string,target:{profile:string})=>{assert.equal(kind,'identity');assert.equal(target.profile,'work');return {data:{accountId:'user',name:'User'}};},close:()=>{closed=true;}} as unknown as TwgConnection));
 assert.deepEqual(result,{site:'https://example.atlassian.net',accountId:'user'});if(transport==='twg')assert.equal(closed,true);
});
