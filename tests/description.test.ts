import {test} from 'node:test';
import assert from 'node:assert/strict';
import {descriptionBlocks} from '../server/jira';
test('Jira description keeps headings, lists, code and attachment fallback readable',()=>{
 assert.deepEqual(descriptionBlocks({type:'doc',content:[{type:'heading',content:[{type:'text',text:'Expected'}]},{type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'First'},{type:'hardBreak'},{type:'text',text:'Second'}]}]}]},{type:'codeBlock',content:[{type:'text',text:'a < b'}]},{type:'mediaSingle'}]}),[{text:'Expected',kind:'heading'},{text:'• First\nSecond',kind:'paragraph'},{text:'a < b',kind:'code'},{text:'[Attachment — open in Jira to view]',kind:'paragraph'}]);
 assert.deepEqual(descriptionBlocks(null),[]);
});

import {richBlocks} from '../shared/comments';
test('legacy Jira wiki preserves formatting, numbered lists, tables and code',()=>{
 const blocks=richBlocks('h2. Expected\n*bold* and _italic_ with {{code}}\n# First\n# Second\n||Name||Value||\n|One|Two|\n{code:js}\na < b\n{code}');
 assert.equal(blocks[0]?.kind,'heading');assert.equal(blocks[0]?.level,2);
 assert.ok(blocks[1]?.runs.some(r=>r.bold&&r.text==='bold'));
 assert.ok(blocks[1]?.runs.some(r=>r.italic&&r.text==='italic'));
 assert.match(blocks[3]!.runs.map(r=>r.text).join(''),/^2\. Second/);
 assert.equal(blocks[4]?.rows?.length,2);assert.equal(blocks[5]?.kind,'code');
});
test('ADF preserves strike, underline, safe links, tables and panels',()=>{
 const blocks=richBlocks({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Marked',marks:[{type:'strike'},{type:'underline'},{type:'link',attrs:{href:'javascript:alert(1)'}}]}]},{type:'panel',attrs:{panelType:'warning'},content:[{type:'paragraph',content:[{type:'text',text:'Watch out'}]}]},{type:'table',content:[{type:'tableRow',content:[{type:'tableCell',content:[{type:'paragraph',content:[{type:'text',text:'Cell'}]}]}]}]}]});
 assert.equal(blocks[0]?.runs[0]?.strike,true);assert.equal(blocks[0]?.runs[0]?.underline,true);assert.equal(blocks[0]?.runs[0]?.href,undefined);
 assert.equal(blocks[1]?.panel,'warning');assert.equal(blocks[2]?.rows?.[0]?.[0]?.[0]?.text,'Cell');
});

test('same-line quote and noformat macros preserve content without accidental strikes',()=>{
 const blocks=richBlocks('{quote}*Scope* APP-2085: server-side defaults - still open.{quote}\n{noformat}show: {\n  enabled: false, // *literal*\n}{noformat}\n{code:js}const x = 1;{code}');
 assert.equal(blocks.length,3);assert.equal(blocks[0]?.prefix,'› ');
 assert.ok(blocks[0]?.runs.some(r=>r.bold&&r.text==='Scope'));
 assert.ok(!blocks[0]?.runs.some(r=>r.strike));
 assert.equal(blocks[1]?.kind,'code');assert.equal(blocks[1]?.runs.map(r=>r.text).join(''),'show: {\n  enabled: false, // *literal*\n}');
 assert.equal(blocks[2]?.kind,'code');assert.equal(blocks[2]?.runs[0]?.text,'const x = 1;');
});
test('wiki strike marks do not interpret issue keys or hyphenated words',()=>{
 const blocks=richBlocks('APP-2085 and APP-3000 are server-side; -removed words- stay struck.');
 assert.equal(blocks[0]?.runs.filter(r=>r.strike).map(r=>r.text).join(''),'removed words');
});
