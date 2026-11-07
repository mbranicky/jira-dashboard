import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRelationships} from '../shared/relationships';
import {readWorkspaceIssueByKey} from '../server/jira';
import {decodeTwgIssue} from '../server/twg-issue';
import {readMcpIssue} from '../server/mcp-issue';
const site='https://example.atlassian.net';
const linked={key:'TEST-2',fields:{summary:'Dependency',status:{name:'Open'}}};
const relations={issuelinks:[{type:{inward:'is blocked by',outward:'blocks'},inwardIssue:linked}],subtasks:[{...linked,key:'TEST-3'}]};
const fields={summary:'Example',status:{id:'1',name:'Open'},assignee:null,issuetype:{name:'Bug'},project:{key:'TEST'},...relations};
test('directions, custom labels, duplicate links and missing statuses are preserved safely',()=>{
 const result=normalizeRelationships({...relations,issuelinks:[...relations.issuelinks,...relations.issuelinks,{type:{inward:'receives',outward:'delivers'},outwardIssue:{...linked,fields:{summary:'Other'}}}]});
 assert.deepEqual(result.items.map(i=>[i.relationship,i.status]),[['is blocked by','Open'],['delivers',null],['Subtask','Open']]);assert.equal(result.complete,true);
 assert.equal(normalizeRelationships({}).complete,false);
 assert.equal(normalizeRelationships({issuelinks:[{bad:true}],subtasks:[]}).complete,false);
 assert.equal(normalizeRelationships({issuelinks:[],subtasks:[]}).complete,true);
 assert.equal(normalizeRelationships({issuelinks:[],subtasks:[{...linked,key:'javascript:evil'}]}).items.length,0);
});
for(const transport of ['rest','twg','mcp'])test(`${transport} details decode relationships and request their fields`,async()=>{
 let requested:string[]=[];const raw={key:'TEST-1',fields};
 const result=transport==='rest'?await readWorkspaceIssueByKey(async(_path,q)=>{requested=q!.fields.split(',');return {issues:[raw]};},site,'TEST-1'):transport==='twg'?await decodeTwgIssue({apiVersion:'v2',command:'jira.workitem.get',data:[{key:'TEST-1',...fields}]},site,'TEST-1'):await readMcpIssue({verifiedBinding:()=>({accountId:'u',displayName:'U',cloudId:'c',siteUrl:site,siteName:'S'}),boardTools:async()=>[{name:'searchJiraIssuesUsingJql',inputSchema:{type:'object',properties:{fields:{type:'array'}}}}],readIssueTool:async args=>{requested=args.fields as string[];return {data:{issues:[raw]}};}},site,'TEST-1');
 assert.deepEqual(result?.details.relationships,normalizeRelationships(relations));if(transport!=='twg'){assert.ok(requested.includes('issuelinks'));assert.ok(requested.includes('subtasks'));}
});
