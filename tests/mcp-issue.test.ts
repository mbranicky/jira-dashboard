import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readMcpIssue,type McpIssueReader} from '../server/mcp-issue';
const site='https://example.atlassian.net';
const binding={accountId:'user',displayName:'User',cloudId:'cloud',siteUrl:site,siteName:'Example'};
const issue={key:'TEST-1',fields:{summary:'Example',status:{id:'1',name:'Open'},assignee:{accountId:'other',displayName:'Other user'},issuetype:{name:'Bug'},project:{key:'TEST'},description:{type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:'Description'}]}]},reporter:{displayName:'Reporter'},updated:'2026-11-05T00:00:00Z'}};
function fixture(issues:unknown[]=[issue]){
 const calls:Record<string,unknown>[]=[];
 const reader:McpIssueReader={verifiedBinding:()=>binding,boardTools:async()=>[{name:'searchJiraIssuesUsingJql',inputSchema:{type:'object',properties:{cloudId:{type:'string'},jql:{type:'string'},fields:{type:'array'},maxResults:{type:'number'},view:{type:'string'}}}}],readIssueTool:async args=>{calls.push(args);return {data:{issues}};}};
 return {reader,calls};
}
test('MCP details uses exact key search and shared rich description/field normalization',async()=>{
 const f=fixture();const result=await readMcpIssue(f.reader,site,'TEST-1');
 assert.equal(result?.details.assignee,'Other user');assert.equal(result?.details.reporter,'Reporter');
 assert.ok(JSON.stringify(result?.details.richDescription).includes('Description'));
 assert.equal(f.calls[0].jql,'key = "TEST-1"');assert.equal(f.calls[0].view,'full');
 assert.ok((f.calls[0].fields as string[]).includes('description'));
});
test('missing issue is quiet; ambiguous or mismatched results are rejected',async()=>{
 assert.equal(await readMcpIssue(fixture([]).reader,site,'TEST-1'),null);
 await assert.rejects(readMcpIssue(fixture([issue,issue]).reader,site,'TEST-1'),/ambiguous/);
 await assert.rejects(readMcpIssue(fixture([{...issue,key:'TEST-2'}]).reader,site,'TEST-1'),/different issue/);
});
test('invalid keys and site mismatches never invoke tools',async()=>{
 const f=fixture();await assert.rejects(readMcpIssue(f.reader,site,'TEST-1 OR 1=1'),/Invalid/);
 await assert.rejects(readMcpIssue(f.reader,'https://other.atlassian.net','TEST-1'),/site binding/);
 assert.equal(f.calls.length,0);
});
test('account changes during lookup reject the result',async()=>{
 const f=fixture();let count=0;f.reader.verifiedBinding=()=>({...binding,accountId:count++?'other':'user'});
 await assert.rejects(readMcpIssue(f.reader,site,'TEST-1'),/account or site changed/);
});
