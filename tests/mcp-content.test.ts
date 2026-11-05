import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mcpContent,type McpContentReader} from '../server/mcp-content';
import {attachmentList,attachmentBytes} from '../server/attachments';
const site='https://example.atlassian.net';
const binding={siteUrl:site,siteName:'Example',accountId:'user',displayName:'User',cloudId:'cloud'};
const file={id:'123',filename:'a.png',size:3,mimeType:'image/png',created:'2026-01-01',author:{displayName:'Author'}};
function reader(url='https://api.media.atlassian.com/file/signed'):McpContentReader{return {verifiedBinding:()=>binding,readContentTool:async name=>({data:name==='getJiraIssue'?{key:'TEST-1',fields:{attachment:[file]}}:{downloadUrl:url,downloadCommand:'must never execute'}})};}
test('MCP attachments list and preview use key-bound metadata and signed URL without auth headers',async()=>{
 let calls=0;const content=mcpContent((async(url,options)=>{calls++;assert.equal(String(url),'https://api.media.atlassian.com/file/signed');assert.equal(options?.headers,undefined);assert.equal(options?.redirect,'error');return new Response(new Uint8Array([1,2,3]));}) as typeof fetch);
 const session=content.session(reader(),site,'TEST-1');
 assert.equal((await attachmentList(session,'TEST-1')).files[0].author,'Author');
 assert.equal((await attachmentBytes(session,'TEST-1','123',0)).base64,'AQID');
 await attachmentBytes(session,'TEST-1','123',0);assert.equal(calls,1);content.close();
});
test('MCP rejects unrelated attachments, arbitrary URLs and writes',async()=>{
 const content=mcpContent(async()=>{throw Error('must not fetch');});
 const session=content.session(reader('https://127.0.0.1/private'),site,'TEST-1');
 await assert.rejects(attachmentBytes(session,'TEST-1','999',0),/unavailable/);
 await assert.rejects(attachmentBytes(session,'TEST-1','123',0),/download host/);
 await assert.rejects(session.request('/anything',{body:Buffer.from('write')}),/read-only/);content.close();
});
test('MCP comments collect pages, normalize HTML and sort by last activity',async()=>{
 const content=mcpContent();let calls=0;
 const r:McpContentReader={verifiedBinding:()=>binding,readContentTool:async(name,args)=>{assert.equal(name,'listJiraIssueComments');assert.equal(args.responseContentFormat,'html');const n=calls++;assert.equal(args.startAt,n);return {data:{startAt:n,maxResults:1,total:2,comments:[{id:String(n+1),parentId:n?'1':null,author:{displayName:'Author'},created:`2026-01-0${n+1}`,updated:n?null:'2026-02-01',body:'<p><strong>Comment</strong></p>'}]}};}};
 const page=await content.comments(r,site,'TEST-1',0);assert.equal(calls,2);assert.equal(page.total,2);assert.equal(page.comments[0].id,'1');assert.equal(page.comments[1].parentId,'1');assert.ok(page.comments[0].blocks[0].runs[0].bold);content.close();
});
test('incomplete attachment bytes fail rather than showing corrupt media',async()=>{
 const content=mcpContent(async()=>new Response(new Uint8Array([1])));
 await assert.rejects(attachmentBytes(content.session(reader(),site,'TEST-1'),'TEST-1','123',0),/Incomplete/);content.close();
});
