import {test} from 'node:test';
import assert from 'node:assert/strict';
import {issueSearchHighlights} from '../shared/search-highlights';
const texts=(text:string,ranges:{start:number;end:number}[])=>ranges.map(r=>text.slice(r.start,r.end));
test('literal case-insensitive matches preserve original text and highlight every occurrence',()=>{
 const issue={key:'PDF-12',summary:'PDF export and pdf import [pdf]'};
 const matches=issueSearchHighlights(issue,'pDf');
 assert.deepEqual(texts(issue.key,matches.key),['PDF']);assert.deepEqual(texts(issue.summary,matches.summary),['PDF','pdf','pdf']);
 assert.deepEqual(texts(issue.summary,issueSearchHighlights(issue,'[pdf]').summary),['[pdf]']);
 assert.deepEqual(issueSearchHighlights(issue,''),{key:[],summary:[]});
 assert.deepEqual(issueSearchHighlights(issue,'no match'),{key:[],summary:[]});
});
test('search spanning key and title highlights both compared fragments',()=>{
 const issue={key:'TEST-1',summary:'An example'};const matches=issueSearchHighlights(issue,'1 an');
 assert.deepEqual(texts(issue.key,matches.key),['1']);assert.deepEqual(texts(issue.summary,matches.summary),['An']);
});
test('Unicode case expansion and overlapping matches retain correct original offsets',()=>{
 const issue={key:'TEST-1',summary:'İ PDF banana 😀pdf'};
 assert.deepEqual(texts(issue.summary,issueSearchHighlights(issue,'pdf').summary),['PDF','pdf']);
 assert.deepEqual(texts(issue.summary,issueSearchHighlights(issue,'ana').summary),['anana']);
 assert.deepEqual(texts(issue.summary,issueSearchHighlights(issue,'i').summary),['İ']);
});
