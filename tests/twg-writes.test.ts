import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,access} from 'node:fs/promises';
import {twgWrites} from '../server/twg-writes';
import {TwgConnection} from '../server/twg-client';
import {connectionSchema} from '../shared/contracts';
import {attachmentUploads,type AttachmentSession} from '../server/attachments';
import {performMove,availableMoves} from '../server/moves';
const config=connectionSchema.parse({transport:'twg',twgWrites:true,boardUrl:'https://example.atlassian.net/boards/1',twgProfile:'work'});
const item={key:'TEST-1',summary:'Synthetic',status:{id:'1',name:'Open'},issuetype:{name:'Bug'},project:{key:'TEST'},assignee:{displayName:'User',accountId:'synthetic'}};
const comment={id:'5',body:{type:'doc',version:1,content:[]},created:'2026-11-04T10:00:00Z',author:{displayName:'User'}};
const attachment={id:'9',filename:'test.txt',size:3,mimeType:'text/plain',created:'2026-11-04',author:{displayName:'User'}};
function harness(){
 const calls:string[][]=[];let uploadPath='';
 const state={ambiguous:false,failWrite:false,visibility:undefined as unknown,internal:false,missing:false};
 const service=twgWrites(path=>new TwgConnection(path,async r=>{
  const a=r.args;calls.push(a);const command=a.slice(0,a[2]==='transition'||a[2]==='get'?3:4).join('.');
  const envelope=(data:unknown)=>JSON.stringify({apiVersion:'v2',command,data});
  if(a[0]==='--help')return '  --profile <name>';
  assert.ok(a.includes('work'));assert.ok(a.includes('example.atlassian.net'));
  if(command==='jira.workitem.get')return envelope([item]);
  if(command==='jira.workitem.statuses.query')return envelope([{id:'2',name:'Development',statusCategory:{key:'indeterminate'}},...(state.ambiguous?[{id:'3',name:'Development'}]:[])]);
  if(command==='jira.workitem.transition'){
   if(a.includes('--transition-id')){if(state.failWrite)throw Error('synthetic private diagnostic');return envelope({success:true,issueIdOrKey:'TEST-1',transition:{id:'21'}});}
   return envelope({transitions:[{id:'21',name:'Begin',toName:'Development',fields:[{fieldId:'points',fieldName:'Story points',required:true,schema:{type:'number'},operations:['set']}]}]});
  }
  if(command==='jira.workitem.comment.query')return JSON.stringify({apiVersion:'v2',command,data:state.missing?[]:[{...comment,visibility:state.visibility,jsdPublic:!state.internal}],pageInfo:{hasNextPage:false,nextCursor:null}});
  if(command==='jira.workitem.comment.create'){if(state.failWrite)throw Error('synthetic private diagnostic');return envelope(comment);}
  if(command==='jira.workitem.attachment.upload'){
   uploadPath=a[a.indexOf('--file')+1];assert.equal((await readFile(uploadPath)).toString(),'abc');assert.equal((await stat(uploadPath)).mode&0o777,0o600);
   if(state.failWrite)throw Error('synthetic private diagnostic');return envelope([attachment]);
  }
  throw Error('Unexpected command '+command);
 }));
 return {service,state,calls,path:()=>uploadPath};
}
test('TWG writes require explicit opt-in and never construct a process in read-only mode',async()=>{
 let count=0;const service=twgWrites(()=>{count++;throw Error('must not run');});
 await assert.rejects(service.post({...config,twgWrites:false},'TEST-1','test'),/Enable Jira changes/);
 await assert.rejects(service.upload({...config,twgWrites:false},'TEST-1','test.txt',Buffer.from('abc')),/Enable Jira changes/);assert.equal(count,0);service.close();
});
test('workflow resolves actual status IDs and fields; confirms transition before local Start work',async()=>{
 const h=harness();try{
 const workflow=await h.service.workflow(config,'TEST-1',['1','2']);
 const board={issues:[{key:'TEST-1',projectKey:'TEST',statusId:'1'}],columns:[{name:'Open',statusIds:['1']},{name:'Develop',statusIds:['2']}]} as any;
 const result=await availableMoves(config,'TEST-1',8,[{jiraProjectKey:'TEST',startWorkColumn:{name:'Develop',statusIds:['2']}} as any],async()=>board,async()=>workflow);
 assert.equal(result.options[0].statusId,'2');assert.equal(result.options[0].fields[0].kind,'number');
 let starts=0;await performMove({transitionId:'21',statusId:'2',fields:{points:'3'}},[{...result.options[0],development:true}],workflow.transition,async()=>{starts++;assert.ok(h.calls.some(a=>a.includes('--transition-id')));return {workspaceId:'local'};});assert.equal(starts,1);
 const mutation=h.calls.find(a=>a.includes('--fields-json'))!;assert.deepEqual(JSON.parse(mutation[mutation.indexOf('--fields-json')+1]),{points:3});
 h.state.failWrite=true;await assert.rejects(performMove({transitionId:'21',statusId:'2'},[{...result.options[0],development:true}],workflow.transition,async()=>{starts++;return {workspaceId:'local'};}),/delivery could not be confirmed/);assert.equal(starts,1);
 h.state.ambiguous=true;await assert.rejects((await h.service.workflow(config,'TEST-1',['2','3'])).availableTransitions(),/multiple board statuses/);
 }finally{h.service.close();}
});
test('linked replies preserve visibility and refuse internal, unreadable or identifier-only restrictions',async()=>{
 const h=harness();try{
 h.state.visibility={type:'role',value:'Developers'};await h.service.post(config,'TEST-1','**Reply**','5');
 const a=h.calls.find(a=>a.includes('create'))!;assert.equal(a[a.indexOf('--visibility-role')+1],'Developers');assert.match(a[a.indexOf('--body')+1],/Linked reply to comment 5/);assert.ok(a.includes('markdown'));
 for(const mode of ['internal','identifier','blank','missing']){
  h.state.internal=mode==='internal';h.state.missing=mode==='missing';h.state.visibility=mode==='identifier'?{type:'group',identifier:'group-id'}:mode==='blank'?{type:'group',value:'   '}:undefined;
  await assert.rejects(h.service.post(config,'TEST-1','Reply','5'));
 }
 assert.equal(h.calls.filter(a=>a.includes('create')).length,1);
 }finally{h.service.close();}
});
test('uploads use a private temporary file and clean up on success and uncertain failure',async()=>{
 const h=harness();try{
 assert.deepEqual(await h.service.upload(config,'TEST-1','test.txt',Buffer.from('abc')),[attachment]);await assert.rejects(access(h.path()));
 h.state.failWrite=true;await assert.rejects(h.service.upload(config,'TEST-1','test.txt',Buffer.from('abc')),/delivery could not be confirmed/);await assert.rejects(access(h.path()));
 await assert.rejects(h.service.upload(config,'TEST-1','../escape',Buffer.from('abc')),/Invalid/);
 }finally{h.service.close();}
});
test('upload manager coalesces TWG submissions and rejects changed connection identity',async()=>{
 const manager=attachmentUploads();let writes=0;
 const session:AttachmentSession={site:'https://example.atlassian.net',identity:'twg/work',request:async()=>Response.json({fields:{attachment:[]}}),uploadSettings:async()=>({enabled:true,uploadLimit:100,limitSource:'plugin'}),upload:async()=>{writes++;return [attachment];}};
 try{const {uploadId}=await manager.begin(session,{key:'TEST-1',filename:'test.txt',size:3,mimeType:'text/plain'});manager.chunk(uploadId,0,'YWJj');assert.throws(()=>manager.finish({...session,identity:'twg/other'},uploadId),/site changed/);
 await Promise.all([manager.finish(session,uploadId),manager.finish(session,uploadId)]);assert.equal(writes,1);
 }finally{manager.close();}
});
test('malformed write acknowledgements are uncertain and do not permit Start work',async()=>{
 let writes=0,starts=0;
 const service=twgWrites(path=>new TwgConnection(path,async r=>{if(r.args[0]==='--help')return '  --profile <name>';writes++;return JSON.stringify({apiVersion:'v2',command:'jira.workitem.transition',data:{success:true,issueIdOrKey:'OTHER-1',transition:{id:'21'}}});}));
 try{const workflow=await service.workflow(config,'TEST-1',['2']);await assert.rejects(performMove({transitionId:'21',statusId:'2'},[{id:'21',name:'Start',statusId:'2',column:'Develop',development:true,fields:[],required:[]}],workflow.transition,async()=>{starts++;return {workspaceId:'local'};}),/delivery could not be confirmed/);assert.equal(writes,1);assert.equal(starts,0);}
 finally{service.close();}
});

test('malformed upload receipts are sanitized and are not retried',async()=>{
 const manager=attachmentUploads();let writes=0;
 const session:AttachmentSession={site:'https://example.atlassian.net',request:async()=>Response.json({fields:{attachment:[]}}),uploadSettings:async()=>({enabled:true,uploadLimit:100}),upload:async()=>{writes++;return [{id:'private diagnostic'}];}};
 try{const {uploadId}=await manager.begin(session,{key:'TEST-1',filename:'test.txt',size:3,mimeType:'text/plain'});manager.chunk(uploadId,0,'YWJj');
 for(let attempt=0;attempt<2;attempt++)await assert.rejects(manager.finish(session,uploadId),/^Error: Upload response could not be confirmed\./);assert.equal(writes,1);
 }finally{manager.close();}
});
