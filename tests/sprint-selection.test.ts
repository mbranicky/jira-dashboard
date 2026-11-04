import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sprintSelectionKey} from '../shared/sprint-selection';
import {dashboardPreferencesSchema} from '../shared/contracts';
test('sprint preferences migrate old settings and retain explicit or automatic choices',()=>{
 assert.deepEqual(dashboardPreferencesSchema.parse({detailsView:'panel'}).sprintByBoard,{});
 const saved=dashboardPreferencesSchema.parse({detailsView:'panel',sprintByBoard:{a:27,b:null}});
 assert.equal(saved.sprintByBoard.a,27);assert.equal(saved.sprintByBoard.b,null);
 assert.equal(dashboardPreferencesSchema.safeParse({sprintByBoard:{a:-1}}).success,false);
});
test('board identity shares URL variants but isolates sites and boards',()=>{
 assert.equal(sprintSelectionKey('https://example.atlassian.net/jira/software/c/projects/TEST/boards/51'),sprintSelectionKey('https://example.atlassian.net/boards/51/'));
 assert.notEqual(sprintSelectionKey('https://example.atlassian.net/boards/51'),sprintSelectionKey('https://other.atlassian.net/boards/51'));
 assert.notEqual(sprintSelectionKey('https://example.atlassian.net/boards/51'),sprintSelectionKey('https://example.atlassian.net/boards/52'));
});
