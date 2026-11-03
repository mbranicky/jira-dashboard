import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,symlink,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCredentials,authorization} from '../server/credentials';
import {createReader,issueSession} from '../server/jira';
import {commentsSession} from '../server/comments';
import {attachmentsSession} from '../server/attachments';
const cloudId='11111111-1111-4111-8111-111111111111';
const first={email:'fixture@example.test',token:'synthetic-first-secret'};
const second={email:first.email,token:'synthetic-replacement-secret'};
async function fixture(run:(path:string,replace:(auth:typeof first)=>Promise<void>)=>Promise<void>){
 const dir=await mkdtemp(join(tmpdir(),'jira-credential-test-')),path=join(dir,'jira.env');
 const replace=async(auth:typeof first)=>{await writeFile(path,`JIRA_EMAIL=${auth.email}\nJIRA_API_TOKEN=${auth.token}\n`,{mode:0o600});};
 try{await replace(first);await run(path,replace);assert.deepEqual(await readdir(dir),['jira.env']);}finally{await rm(dir,{recursive:true,force:true});}
}
test('credential loader requires bounded regular owner-only files, rejects symlinks, and leaves no copies',async()=>{
 await fixture(async(path)=>{
  assert.deepEqual(await loadCredentials(path),first);
  await assert.rejects(loadCredentials('relative.env'),/absolute/);
  if(process.platform!=='win32'){
   await chmod(path,0o644);await assert.rejects(loadCredentials(path),/owner-only/);await chmod(path,0o600);
   await symlink(path,path+'.link');try{await assert.rejects(loadCredentials(path+'.link'),/symbolic link/);}finally{await rm(path+'.link');}
  }
  await writeFile(path,'x'.repeat(65537));await assert.rejects(loadCredentials(path),/small regular/);
  await writeFile(path,'JIRA_API_TOKEN=synthetic-invalid-secret');
  await assert.rejects(loadCredentials(path),error=>!String(error).includes('synthetic-invalid-secret'));
 });
});
test('retained comment, attachment and workflow sessions reload credentials per request and never authenticate tenant discovery',async()=>{
 await fixture(async(path,replace)=>{
  let expected=first;let calls=0;
  const fetcher=(async(input:any,init:any)=>{
   const url=new URL(String(input));const header=new Headers(init?.headers).get('authorization');
   assert.equal(init.redirect,'error');assert.ok(!url.href.includes(expected.token));
   if(url.pathname==='/_edge/tenant_info'){assert.equal(header,null);return Response.json({cloudId});}
   assert.equal(url.origin,'https://api.atlassian.com');assert.equal(header,authorization(expected));calls++;
   return Response.json({transitions:[]});
  }) as typeof fetch;
  const config={boardUrl:'https://fixture.atlassian.net/boards/1',envPath:path,refreshSeconds:60};
  const comments=await commentsSession(config,fetcher),attachments=await attachmentsSession(config,fetcher),issue=await issueSession(config,'DEMO-1',fetcher);
  const exercise=async()=>{await comments.request('/rest/api/3/issue/DEMO-1/comment');await attachments.request('/rest/api/3/attachment/meta');await issue.availableTransitions();};
  await exercise();await replace(second);expected=second;await exercise();assert.equal(calls,6);
  await rm(path);await assert.rejects(comments.request('/rest/api/3/issue/DEMO-1/comment'),/Cannot read/);assert.equal(calls,6);await replace(second);
  await assert.rejects(comments.request('https://evil.test'),/Unsupported/);
  await assert.rejects(attachments.request('/rest/api/3/attachment/content/1?redirect=true'),/Unsupported/);assert.equal(calls,6);
 });
});
test('workflow errors redact reflected credentials before truncation and preserve useful validator messages',async()=>{
 await fixture(async(path)=>{
  let mode='response';
  const fetcher=(async(input:any)=>{
   if(String(input).endsWith('/_edge/tenant_info'))return Response.json({cloudId});
   if(mode==='throw')throw new Error(authorization(first));
   if(mode==='invalid')return new Response(first.token);
   return Response.json({errorMessages:['x'.repeat(2995)+first.token,authorization(first),first.email],errors:{fixVersions:'Fix version is required.'}},{status:400});
  }) as typeof fetch;
  const issue=await issueSession({boardUrl:'https://fixture.atlassian.net/boards/1',envPath:path,refreshSeconds:60},'DEMO-1',fetcher);
  for(mode of ['response','throw','invalid'])await assert.rejects(issue.availableTransitions(),error=>{
   const message=String(error);assert.ok(!message.includes(first.token));assert.ok(!message.includes('synthetic'));assert.ok(!message.includes(authorization(first)));return true;
  });
  const safe=await issueSession({boardUrl:'https://fixture.atlassian.net/boards/1',envPath:path,refreshSeconds:60},'DEMO-1',(async(input:any)=>String(input).endsWith('/_edge/tenant_info')?Response.json({cloudId}):Response.json({errors:{fixVersions:'Fix version is required.'}},{status:400})) as typeof fetch);
  await assert.rejects(safe.availableTransitions(),/Fix version is required/);
 });
});
test('read transport rejects redirects and hides transport errors containing the authorization header',async()=>{
 const get=createReader(cloudId,first,(async(_input:any,init:any)=>{assert.equal(init.redirect,'error');throw new Error(authorization(first));}) as typeof fetch);
 await assert.rejects(get('/rest/api/3/myself'),/Cannot reach Jira/);
 let calls=0;const redirected=createReader(cloudId,first,(async()=>{calls++;return new Response('',{status:302,headers:{Location:'https://evil.test'}});}) as typeof fetch);
 await assert.rejects(redirected('/rest/api/3/myself'),/HTTP 302/);assert.equal(calls,1);
});
test('comment and attachment writes use gateway headers and hide echoed errors',async()=>{
 await fixture(async(path)=>{
  const seen:string[]=[];
  const fetcher=(async(input:any,init:any)=>{
   const url=new URL(String(input));
   if(url.pathname==='/_edge/tenant_info')return Response.json({cloudId});
   assert.equal(url.origin,'https://api.atlassian.com');assert.equal(init.redirect,'error');assert.equal(init.method,'POST');
   assert.equal(new Headers(init.headers).get('authorization'),authorization(first));seen.push(url.pathname);
   return Response.json({errorMessages:[first.token,authorization(first)]},{status:403});
  }) as typeof fetch;
  const config={boardUrl:'https://fixture.atlassian.net/boards/1',envPath:path,refreshSeconds:60};
  const comments=await commentsSession(config,fetcher),attachments=await attachmentsSession(config,fetcher);
  for(const action of [()=>comments.request('/rest/api/3/issue/DEMO-1/comment',{body:'synthetic comment'}),()=>attachments.request('/rest/api/3/issue/DEMO-1/attachments',{body:Buffer.from('fixture'),contentType:'multipart/form-data; boundary=fixture'})]){
   await assert.rejects(action(),error=>!String(error).includes(first.token)&&!String(error).includes(authorization(first)));
  }
  assert.equal(seen.length,2);
 });
});
