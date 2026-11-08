import {test} from 'node:test';
import assert from 'node:assert/strict';
import {issueNavigation} from '../shared/issue-navigation';
import {issueSchema} from '../shared/contracts';
const issue=(key:string,statusId:string)=>issueSchema.parse({key,summary:key,statusId,status:'Open',type:'Bug',priority:null,projectKey:'TEST'});
test('navigation follows columns, deduplicates and respects boundaries and filtered-out selections',()=>{
 const issues=[issue('TEST-2','2'),issue('TEST-1','1'),issue('TEST-3','2')];const columns=[{statusIds:['1']},{statusIds:['2']},{statusIds:['2']}];
 assert.equal(issueNavigation(issues,columns,'TEST-1').previous,undefined);
 assert.equal(issueNavigation(issues,columns,'TEST-1').next?.key,'TEST-2');
 assert.equal(issueNavigation(issues,columns,'TEST-2').next?.key,'TEST-3');
 assert.equal(issueNavigation(issues,columns,'TEST-3').next,undefined);
 assert.equal(issueNavigation(issues,columns,'missing').next,undefined);
 assert.equal(issueNavigation(issues,columns,'TEST-3').total,3);
});
