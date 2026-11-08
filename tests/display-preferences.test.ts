import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDisplayStore,defaultDisplayPreferences,displayStorageKey} from '../shared/display-preferences';
test('display settings persist locally, isolate hosts and tolerate malformed storage',()=>{
 const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
 const store=createDisplayStore(()=>storage);store.update('one',{...defaultDisplayPreferences,density:'comfortable',showTags:false});
 assert.equal(createDisplayStore(()=>storage).read('one').values.showTags,false);
 assert.equal(store.read('two').values.showTags,true);
 data.set(displayStorageKey('broken'),'{');assert.deepEqual(store.read('broken').values,defaultDisplayPreferences);
 data.set(displayStorageKey('invalid'),' {"columnWidth":99999}');assert.deepEqual(store.read('invalid').values,defaultDisplayPreferences);
});
test('unavailable or full device storage keeps preferences for this session with explicit durability state',()=>{
 for(const storage of [undefined,{getItem:()=>null,setItem:()=>{throw Error('full');},removeItem:()=>{}}]){
  const store=createDisplayStore(()=>storage);let notified=0;const off=store.subscribe(()=>notified++);
  store.update('host',{...defaultDisplayPreferences,columnWidth:360});assert.equal(store.read('host').values.columnWidth,360);assert.equal(store.read('host').durable,false);assert.equal(notified,1);off();
 }
});
