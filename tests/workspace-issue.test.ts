import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {detectIssue,issueKeys} from '../shared/issue-detection';
import {readWorkspaceLinks,workIdentity} from '../server/work';
import {readWorkspaceIssueByKey} from '../server/jira';
test('detects complete keys and deduplicates titles without guessing partial identifiers',()=>{
 assert.deepEqual(issueKeys(['Fix DEMO-7415','DEMO-7415',null,'prefixTC-551','TC-551suffix','TC-0','(APP-12)']),['DEMO-7415','APP-12']);
});
test('saved link wins, then workspace, then agent titles; ambiguity stops at its tier',()=>{
 assert.deepEqual(detectIssue(['TC-1'],['TC-2'],['TC-3']),{status:'found',key:'TC-1'});
 assert.deepEqual(detectIssue([],['Fix TC-2'],['TC-3']),{status:'found',key:'TC-2'});
 assert.deepEqual(detectIssue([],['General'],['DEMO-7415','DEMO-7415']),{status:'found',key:'DEMO-7415'});
 assert.deepEqual(detectIssue([],['TC-1 and TC-2'],['TC-1']),{status:'ambiguous'});
 assert.deepEqual(detectIssue([],[],['TC-1','TC-2']),{status:'ambiguous'});
 assert.deepEqual(detectIssue([],['General'],['Analysis']),{status:'none'});
});
test('workspace links survive rename and are isolated by site and workspace; legacy hashes recover',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jira-links-'));const site='https://example.atlassian.net';
 const file=join(dir,workIdentity(site,'TC-1').key+'.json');
 try{
  await writeFile(file,JSON.stringify({workspaceId:'w',projectId:'p'}));
  assert.deepEqual(await readWorkspaceLinks(dir,site,'other',['TC-1']),[]);
  assert.deepEqual(await readWorkspaceLinks(dir,site,'w',['TC-1']),['TC-1']);
  assert.equal(JSON.parse(await readFile(file+'.link','utf8')).issueKey,'TC-1');
  assert.equal(JSON.parse(await readFile(file,'utf8')).issueKey,undefined);
  assert.deepEqual(await readWorkspaceLinks(dir,site,'w',[]),['TC-1']);
  assert.deepEqual(await readWorkspaceLinks(dir,'https://other.atlassian.net','w',['TC-1']),[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('independent issue lookup has no sprint or assignee filter and handles empty or ambiguous response',async()=>{
 const read=async(path:string,q?:Record<string,string>)=>{assert.equal(path,'/rest/api/3/search/jql');assert.equal(q?.jql,'key = "TC-1"');return {issues:[{key:'TC-1',fields:{summary:'Test',status:{id:'1',name:'Open'},assignee:{accountId:'other',displayName:'Someone else'},issuetype:{name:'Task'},project:{key:'TC'},description:'Example'}}]};};
 const result=await readWorkspaceIssueByKey(read,'https://example.atlassian.net','TC-1');
 assert.equal(result?.details.assignee,'Someone else');assert.equal(result?.issue.key,'TC-1');
 assert.equal(await readWorkspaceIssueByKey(async()=>({issues:[]}),'site','TC-1'),null);
 await assert.rejects(readWorkspaceIssueByKey(async()=>({issues:[{},{}]}),'site','TC-1'),/ambiguous/);
 await assert.rejects(readWorkspaceIssueByKey(read,'site','TC-1 OR project = TC'),/Invalid/);
});
