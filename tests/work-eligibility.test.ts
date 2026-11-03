import test from 'node:test';
import assert from 'node:assert/strict';
import {canStartWork} from '../shared/work-eligibility';
test('hide start for active and completed Jira categories with custom names',()=>{
  for(const statusCategory of ['indeterminate','done'])
    assert.equal(canStartWork({status:'Custom workflow state',statusCategory}),false);
});
test('hide start for developed and validation states even in miscategorized workflows',()=>{
  for(const status of ['Done','CLOSED','Validated','DEVELOPED','Validation Ready','In_Progress','In Review'])
    assert.equal(canStartWork({status,statusCategory:'new'}),false,status);
});
test('allow starting open and development-ready issues',()=>{
  for(const status of ['New','To_Do','Development Ready','ON HOLD'])
    assert.equal(canStartWork({status,statusCategory:'new'}),true,status);
});
