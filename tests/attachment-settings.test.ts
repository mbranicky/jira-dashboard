import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicAttachmentSettings} from '../server/attachment-settings';
import {attachmentUploads,type AttachmentSession} from '../server/attachments';
import {TRANSFER_LIMIT} from '../shared/attachments';
const site='https://example.atlassian.net';
test('public settings reads only the configured site with no credentials or redirects',async()=>{
 for(const enabled of [false,true]){
  let calls=0;
  const result=await publicAttachmentSettings(site,async(url,options)=>{
   calls++;assert.equal(url,site+'/rest/api/3/attachment/meta');assert.equal(options?.method,'GET');
   assert.equal(options?.credentials,'omit');assert.equal(options?.redirect,'error');assert.deepEqual(options?.headers,{Accept:'application/json'});assert.equal(options?.body,undefined);
   return Response.json({enabled,uploadLimit:1024});
  });
  assert.deepEqual(result,{enabled,uploadLimit:1024});assert.equal(calls,1);
 }
});
test('blocked, failed, oversized or invalid responses retain explicit plugin-only fallback',async()=>{
 const responses=[()=>new Response(null,{status:403}),()=>Response.json({enabled:'true',uploadLimit:100}),()=>Response.json({enabled:true,uploadLimit:-1}),()=>Response.json({enabled:true,uploadLimit:1.5}),()=>new Response('x'.repeat(16385)),()=>new Response('<html>Sign in</html>'),()=>{throw Error('private network error');}];
 for(const response of responses){
  let calls=0;assert.deepEqual(await publicAttachmentSettings(site,async()=>{calls++;return response();}),{enabled:true,uploadLimit:TRANSFER_LIMIT,limitSource:'plugin'});assert.equal(calls,1);
 }
});
test('invalid sites are rejected before any request',async()=>{
 for(const bad of ['https://evil.example','http://example.atlassian.net','https://example.atlassian.net.evil.test','https://user@example.atlassian.net','https://example.atlassian.net:8443','https://example.atlassian.net/path']){
  await assert.rejects(publicAttachmentSettings(bad,async()=>{assert.fail('No fetch permitted');}),/Invalid Jira/);
 }
});
for(const transport of ['mcp','twg'])test(`${transport} session honors actual disabled status and limits before mocked upload`,async()=>{
 const manager=attachmentUploads();let enabled=true,limit=10,uploads=0,reads=0;
 const session:AttachmentSession={site,identity:transport,
  uploadSettings:()=>publicAttachmentSettings(site,async()=>{reads++;return Response.json({enabled,uploadLimit:limit});}),
  request:async()=>Response.json({fields:{attachment:[]}}),upload:async()=>{uploads++;return [];}};
 const input={key:'TEST-1',filename:'file.txt',size:3,mimeType:'text/plain'};
 try{
  enabled=false;await assert.rejects(manager.begin(session,input),/disabled/);
  enabled=true;limit=2;await assert.rejects(manager.begin(session,input),/exceeds/);
  limit=TRANSFER_LIMIT*2;await assert.rejects(manager.begin(session,{...input,size:TRANSFER_LIMIT+1}),/exceeds/);
  limit=10;const {uploadId}=await manager.begin(session,input);manager.chunk(uploadId,0,Buffer.from('abc').toString('base64'));
  enabled=false;await assert.rejects(manager.finish(session,uploadId),/settings changed/);
  assert.equal(uploads,0);assert.equal(reads,5);
 }finally{manager.close();}
});
