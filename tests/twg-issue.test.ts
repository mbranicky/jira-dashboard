import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeTwgIssue} from '../server/twg-issue';
import {TwgConnection} from '../server/twg-client';
const fixture=()=>({apiVersion:'v2',command:'jira.workitem.get',data:[{key:'TEST-1',summary:'Synthetic',status:{id:'1',name:'Open'},issuetype:{name:'Bug'},project:{key:'TEST'},assignee:{accountId:'someone-else',displayName:'Test User',emailAddress:'private@example.invalid'},reporter:{displayName:'Reporter'},description:{type:'doc',version:1,content:[{type:'codeBlock',content:[{type:'text',text:'example()'}]}]},created:'2026-11-04T10:00:00Z',updated:'2026-11-04T11:00:00Z'}]});
test('TWG flattened issue details reuse rich rendering and omit private account data',async()=>{
 const result=await decodeTwgIssue(fixture(),'https://example.atlassian.net','TEST-1');
 assert.equal(result?.issue.summary,'Synthetic');assert.equal(result?.details.assignee,'Test User');
 assert.equal(result?.details.reporter,'Reporter');assert.equal(result?.details.description[0].kind,'code');
 assert.ok(result?.details.richDescription?.length);assert.ok(!JSON.stringify(result).includes('private@example.invalid'));
});
test('wrong, missing, ambiguous and partial issue responses fail closed',async()=>{
 for(const value of [{ok:true},{...fixture(),data:[]},{...fixture(),data:[...fixture().data,...fixture().data]},
 {...fixture(),meta:{acquisition:{failed:1}}},{...fixture(),command:'jira.board.get'}])await assert.rejects(decodeTwgIssue(value,'https://example.atlassian.net','TEST-1'));
 await assert.rejects(decodeTwgIssue(fixture(),'https://example.atlassian.net','OTHER-1'));
});
test('issue reads bind the profile/site, request only details, and reject invalid keys before execution',async()=>{
 const calls:string[][]=[];const cli=new TwgConnection('twg',async r=>{calls.push(r.args);return JSON.stringify(fixture());});
 await cli.readIssue({site:'https://example.atlassian.net',profile:'work'},'TEST-1');
 assert.deepEqual(calls[0].slice(0,5),['jira','workitem','get','TEST-1','--strict']);
 assert.ok(!calls[0].includes('--full'));assert.ok(!calls[0].includes('--comments'));assert.ok(calls[0].includes('work'));
 assert.throws(()=>cli.readIssue({site:'https://example.atlassian.net',profile:'work'},'--full'));assert.equal(calls.length,1);
 cli.close();
});
