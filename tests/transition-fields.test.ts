import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldMetadata,transitionValues} from '../shared/transition-fields';
test('encode transition values using Jira field schemas and choices',()=>{
 const fields=[
 fieldMetadata('parent',{schema:{type:'issuelink'}}),
 fieldMetadata('points',{schema:{type:'number'}}),
 fieldMetadata('fixVersions',{schema:{type:'array'},allowedValues:[{id:'1',name:'6.8'}]})
 ];
 assert.deepEqual(transitionValues(fields,{parent:'TD-1',points:'3.5',fixVersions:'1'}),{parent:{key:'TD-1'},points:3.5,fixVersions:[{id:'1'}]});
 assert.throws(()=>transitionValues(fields,{points:'abc'}),/number/);
 assert.throws(()=>transitionValues(fields,{fixVersions:'2'}),/valid/);
 assert.throws(()=>transitionValues(fields,{unlisted:'x'}),/no longer editable/);
});
test('complex unsupported fields do not turn into malformed payloads',()=>{
 const f=fieldMetadata('assignee',{schema:{type:'user'}});
 assert.equal(f.kind,'unsupported');
 assert.throws(()=>transitionValues([f],{assignee:'somebody'}),/in Jira/);
});
test('fix-version choices hide released and archived versions but preserve selected values',async()=>{
 const {visibleTransitionChoices}=await import('../shared/transition-fields');
 const f=fieldMetadata('fixVersions',{schema:{type:'array'},allowedValues:[
 {id:'1',name:'Old',released:true,archived:false},
 {id:'2',name:'Archived',released:false,archived:true},
 {id:'3',name:'Next',released:false,archived:false},
 {id:'4',name:'Unknown'}
 ]});
 assert.deepEqual(visibleTransitionChoices(f,'').map(o=>o.value),['3','4']);
 assert.deepEqual(visibleTransitionChoices(f,'1').map(o=>o.value),['1','3','4']);
 assert.deepEqual(transitionValues([f],{fixVersions:'1'}),{fixVersions:[{id:'1'}]});
 const other=fieldMetadata('other',{schema:{type:'array'},allowedValues:[{id:'1',name:'Other',released:true}]});
 assert.equal(visibleTransitionChoices(other,'').length,1);
});
