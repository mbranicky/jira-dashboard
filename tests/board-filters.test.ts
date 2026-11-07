import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyFilters,matchesBoardView,filterOptions,savedViewSchema} from '../shared/board-filters';
import {issueSchema,dashboardPreferencesSchema} from '../shared/contracts';
const issue=issueSchema.parse({key:'APP-1',summary:'Fix PDF export',statusId:'1',status:'Open',type:'Bug',priority:'High',projectKey:'APP',labels:['one','two'],fixVersions:['1.0'],parent:{key:'APP-9',summary:'Parent'}});
test('filters combine OR within fields and AND across fields with literal case-insensitive search',()=>{
 const filters={...emptyFilters(),labels:['absent','one'],priority:['High'],type:['Bug'],parent:['APP-9'],fixVersions:['1.0']};
 assert.equal(matchesBoardView(issue,'pdf',filters),true);
 assert.equal(matchesBoardView(issue,'APP-1',filters),true);
 assert.equal(matchesBoardView(issue,'PDF.*',filters),false);
 assert.equal(matchesBoardView(issue,'',{...filters,priority:['Low']}),false);
 assert.equal(matchesBoardView({...issue,parent:null},'',filters),false);
});
test('selected missing values stay removable after refresh; options deduplicate and sort',()=>{
 assert.deepEqual(filterOptions([issue,issue],'labels',['gone']),['gone','one','two']);
 assert.equal(matchesBoardView(issue,'',{...emptyFilters(),labels:['gone']}),false);
 assert.equal(matchesBoardView({...issue,priority:null},'',emptyFilters()),true);
});
test('saved views validate limits and older preferences default safely',()=>{
 assert.deepEqual(dashboardPreferencesSchema.parse({detailsView:'panel'}).viewsByBoard,{});
 assert.equal(savedViewSchema.safeParse({name:' ',search:'',filters:emptyFilters()}).success,false);
 assert.equal(savedViewSchema.parse({name:' Bugs ',search:'pdf',filters:emptyFilters()}).name,'Bugs');
});
