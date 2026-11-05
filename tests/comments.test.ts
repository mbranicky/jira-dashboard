import {descriptionDocument} from '../server/jira-html';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {linkedReplyThreads,markdownToAdf,richBlocks,commentThreads,safeLink} from '../shared/comments';
import {normalizeComment,readCommentPage,createComment,commentPoster} from '../server/comments';
const raw=(id='1',parentId?:string)=>({id,parentId,author:{displayName:'Example Author'},created:'2026-11-01T10:00:00Z',body:{type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:'Hello',marks:[{type:'strong'}]}]}]}});
test('Markdown converts to ADF with formatting, lists, code and safe links',()=>{
 const doc=markdownToAdf('# Heading\n\n**bold** and *italic*, `code` [link](https://example.com)\nnext line\n\n- One\n- Two\n\n2. Second\n\n> Quote\n\n```ts\nconst x = 1;\n```');
 assert.deepEqual(doc.content?.map(n=>n.type),['heading','paragraph','bulletList','orderedList','blockquote','codeBlock']);
 const blocks=richBlocks(doc);assert.equal(blocks[1]?.runs[0]?.bold,true);assert.ok(blocks[1]?.runs.some(r=>r.italic));assert.ok(blocks[1]?.runs.some(r=>r.code));assert.ok(blocks[1]?.runs.some(r=>r.href==='https://example.com'));
 assert.equal(safeLink('javascript:alert(1)'),undefined);assert.equal(safeLink('file:///secret'),undefined);
 assert.equal(richBlocks(markdownToAdf('<script>bad</script>'))[0]?.runs[0]?.text,'<script>bad</script>');
 assert.equal(richBlocks(markdownToAdf('\\*literal\\*'))[0]?.runs[0]?.text,'*literal*');
});
test('nested comments, orphans and cycles are each rendered once',()=>{
 const rows=commentThreads([normalizeComment(raw('2','1')),normalizeComment(raw('1')),normalizeComment(raw('3','2')),normalizeComment(raw('4','999')),normalizeComment(raw('5','6')),normalizeComment(raw('6','5'))]);
 assert.equal(rows.length,6);assert.equal(new Set(rows.map(r=>r.comment.id)).size,6);
 assert.equal(rows.find(r=>r.comment.id==='3')?.depth,2);assert.equal(rows.find(r=>r.comment.id==='4')?.depth,0);
});
test('comments collect all Jira pages so an older edited comment sorts first',async()=>{
 const calls:string[]=[];
 const page=await readCommentPage(async path=>{calls.push(path);const second=path.includes('startAt=1&');return {comments:[{...raw(second?'2':'1'),created:second?'2026-10-01T10:00:00Z':'2026-11-01T10:00:00Z',updated:second?'2026-11-02T10:00:00Z':null}],startAt:second?1:0,maxResults:1,total:2};},'site','TC-1',0);
 assert.equal(calls.length,2);assert.match(calls[0]!,/orderBy=-created$/);assert.deepEqual(page.comments.map(c=>c.id),['2','1']);assert.equal(page.nextStart,null);
 await assert.rejects(readCommentPage(async()=>({comments:[],startAt:0,maxResults:50,total:2}),'site','TC-1',0),/incomplete/);
});
test('linked replies reference the original and preserve restriction without pretending native threading',async()=>{
 let payload:any;
 const result=await createComment(async(path,body)=>{if(!body){assert.equal(path,'/rest/api/3/issue/TC-1/comment/1');return {...raw(),visibility:{type:'role',identifier:'10002'}};}payload=body;return raw('2');},'https://example.atlassian.net','TC-1','**Reply**','1');
 assert.equal(result.id,'2');assert.deepEqual(payload.visibility,{type:'role',identifier:'10002'});assert.equal(payload.parentId,undefined);
 assert.match(payload.body.content[0].content[0].text,/Linked reply to Example Author/);assert.match(payload.body.content[0].content[0].marks[0].attrs.href,/focusedCommentId=1/);
});
test('internal or unreadable reply targets never fall back to unrestricted posting',async()=>{
 let writes=0;await assert.rejects(createComment(async(_,body)=>{if(body)writes++;return {...raw(),jsdPublic:false};},'site','TC-1','Reply','1'),/internal/);assert.equal(writes,0);
 await assert.rejects(createComment(async()=>{throw new Error('Not visible');},'site','TC-1','Reply','1'),/Not visible/);
});
test('duplicate submissions coalesce and uncertain failures are not retried',async()=>{
 const post=commentPoster();let calls=0;const write=async()=>{calls++;return normalizeComment(raw());};
 await Promise.all([post('site/TC-1','id','payload',write),post('site/TC-1','id','payload',write)]);assert.equal(calls,1);
 assert.throws(()=>post('site/TC-1','id','different',write),/changed/);
 const fail=async()=>{calls++;throw new Error('Timeout');};await assert.rejects(post('site/TC-1','failed','payload',fail));await assert.rejects(post('site/TC-1','failed','payload',fail));assert.equal(calls,2);
});

test('threads sort newest first while preserving parent-child structure',()=>{
 const c=(id:string,created:string,updated?:string,parentId?:string)=>normalizeComment({...raw(id,parentId),created,updated});
 const rows=commentThreads([c('1','2026-01-01'),c('2','2026-02-01'),c('3','2026-01-01','2026-03-01'),c('4','2026-04-01',undefined,'3')]);
 assert.deepEqual(rows.map(r=>[r.comment.id,r.depth]),[['3',0],['4',1],['2',0],['1',0]]);
});

const replySite='https://example.atlassian.net';
const replyHref=`${replySite}/browse/TC-1?focusedCommentId=1`;
function linked(id='2',href=replyHref,label='Linked reply to comment 1'){
 return normalizeComment({...raw(id),body:markdownToAdf(`[${label}](${href})\n\nReply body`)});
}
test('dashboard threads REST and MCP/TWG reply headings without modifying stored comments',()=>{
 for(const label of ['Linked reply to Example Author','Linked reply to comment 1']){
  const reply=linked('2',replyHref,label),parent=normalizeComment(raw());
  const resolved=linkedReplyThreads([reply,parent],replySite,'TC-1');
  assert.equal(reply.parentId,null);assert.equal(resolved[0].parentId,'1');assert.deepEqual(resolved[0].blocks,reply.blocks);
  assert.deepEqual(commentThreads(resolved).map(r=>[r.comment.id,r.depth]),[['1',0],['2',1]]);
  assert.equal(linkedReplyThreads([{...reply,parentId:'99'}],replySite,'TC-1')[0].parentId,'99');
 }
});
test('ordinary references, quoted headings and cross-issue/site links are not reply relationships',()=>{
 const candidates=[
  linked('2',replyHref,'See original comment'),linked('2',replyHref.replace('example.','other.')),
  linked('2',replyHref.replace('TC-1','TC-2')),linked('2',replyHref+'&other=1'),linked('2',replyHref+'#fragment'),
  linked('2',replyHref.replace('=1','=2')),linked('2',replyHref.replace('=1','=no')),
  normalizeComment({...raw('2'),body:markdownToAdf(`> [Linked reply to comment 1](${replyHref})`)}),
  normalizeComment({...raw('2'),body:markdownToAdf(`Intro\n\n[Linked reply to comment 1](${replyHref})`)}),
  normalizeComment({...raw('2'),body:markdownToAdf(`[Linked reply to comment 1](${replyHref}) with more text`)}),
 ];
 assert.ok(linkedReplyThreads(candidates,replySite,'TC-1').every(c=>c.parentId===null));
 assert.equal(linkedReplyThreads([linked()],undefined,'TC-1')[0].parentId,null);
});
test('inferred replies survive pagination and cycles without hiding or duplicating comments',()=>{
 const reply=linked();
 assert.deepEqual(commentThreads(linkedReplyThreads([reply],replySite,'TC-1')).map(r=>[r.comment.id,r.depth]),[['2',0]]);
 const parent=normalizeComment(raw('1'));
 assert.deepEqual(commentThreads(linkedReplyThreads([reply,parent],replySite,'TC-1')).map(r=>[r.comment.id,r.depth]),[['1',0],['2',1]]);
 const cycle=linked('1',replyHref.replace('=1','=2'));
 const rows=commentThreads(linkedReplyThreads([reply,cycle],replySite,'TC-1'));
 assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.comment.id)).size,2);
});

test('MCP HTML reply heading is recognized after content normalization',()=>{
 const comment=normalizeComment({...raw('2'),body:descriptionDocument(`<p><a href="${replyHref}">Linked reply to comment 1</a></p><p>Reply</p>`)});
 assert.equal(linkedReplyThreads([comment],replySite,'TC-1')[0].parentId,'1');
});
