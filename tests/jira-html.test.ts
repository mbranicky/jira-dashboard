import {test} from 'node:test';
import assert from 'node:assert/strict';
import {descriptionDocument} from '../server/jira-html';
import {richBlocks} from '../shared/comments';
const render=(v:string)=>richBlocks(descriptionDocument(v));
test('HTML descriptions preserve lists, entities, links and media placeholders',()=>{
 const blocks=render('<ul><li><p>Font &amp; table <strong>properties</strong> <span>:warning:</span></p></li><li><figure data-type="media-single"><div>private media id</div></figure></li><li><p><a href="https://example.com">Design</a></p></li></ul>');
 assert.equal(blocks[0].prefix,'• ');assert.ok(blocks[0].runs.some(r=>r.bold&&r.text==='properties'));
 assert.ok(JSON.stringify(blocks).includes('Font & table'));assert.ok(JSON.stringify(blocks).includes('https://example.com'));
 assert.ok(!JSON.stringify(blocks).includes('private media'));assert.ok(blocks.some(b=>b.kind==='attachment'));
});
test('HTML scripts and unsafe links are inert; tables quotes and code retain structure',()=>{
 const blocks=render('<div><script>evil()</script><p onclick="evil()"><a href="javascript:evil()">Link</a></p><blockquote><p>Quote</p></blockquote><pre>a &lt; b\n c</pre><table><tr><th>Heading</th><td>Cell</td></tr></table></div>');
 assert.ok(!JSON.stringify(blocks).includes('evil'));assert.equal(blocks[0].runs[0].href,undefined);
 assert.ok(blocks.some(b=>b.prefix==='› '));assert.ok(blocks.some(b=>b.kind==='code'&&b.runs[0].text==='a < b\n c'));
 assert.ok(blocks.some(b=>b.kind==='table'&&b.rows?.length===1));
});
test('ADF, wiki text and code-like prose are not reinterpreted as HTML',()=>{
 const adf={type:'doc',content:[]};assert.equal(descriptionDocument(adf),adf);
 for(const text of ['h2. Heading','Use <p> for paragraphs','{code}<div>example</div>{code}'])assert.equal(descriptionDocument(text),text);
});
