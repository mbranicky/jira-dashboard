import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,access} from 'node:fs/promises';
import {TwgConnection} from '../server/twg-client';
import {twgContent} from '../server/twg-content';
import {connectionSchema} from '../shared/contracts';
import {attachmentList,attachmentBytes} from '../server/attachments';
const config=connectionSchema.parse({boardUrl:'https://example.atlassian.net/boards/1',transport:'twg',twgProfile:'work'});
const comment=(id:string,updated:string)=>({id,author:{displayName:'Test author',emailAddress:'private@example.invalid'},created:'2026-01-01T00:00:00Z',updated,body:{type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:'Synthetic comment'}]}]}});
function harness(){
 const calls:string[][]=[];let path='';const state={badSize:false,repeated:false,missing:false};
 const service=twgContent(executable=>new TwgConnection(executable,async r=>{
  calls.push(r.args);const args=r.args;if(args[0]==='--help')return '  --profile <name>';
  const command=args.slice(0,4).join('.');
  if(command==='jira.workitem.comment.query'){const next=args.includes('--after');return JSON.stringify({apiVersion:'v2',command,data:[comment(next?'2':'1',next?'2026-03-01T00:00:00Z':'2026-02-01T00:00:00Z')],pageInfo:{hasNextPage:!next||state.repeated,nextCursor:!next||state.repeated?'cursor':null}});}
  if(command==='jira.workitem.attachment.query')return JSON.stringify({apiVersion:'v2',command,data:state.missing?[]:[{id:'10',filename:'example.png',size:3,mimeType:'image/png',created:'2026-01-01',author:{displayName:'Author'}}]});
  if(command==='jira.workitem.attachment.download'){path=args[args.indexOf('--output-path')+1];await writeFile(path,Buffer.from(state.badSize?'xx':'abc'));return JSON.stringify({data:{path:'/never/trust/cli/path'}});}
  throw Error('Unexpected command');
 }));
 return {service,calls,state,path:()=>path};
}
test('comments paginate before newest-edit ordering and omit personal identifiers',async()=>{
 const h=harness();try{const result=await h.service.comments(config,'TEST-1',0);assert.deepEqual(result.comments.map(c=>c.id),['2','1']);assert.equal(result.nextStart,null);assert.equal(result.comments[0].author,'Test author');assert.ok(!JSON.stringify(result).includes('private@example.invalid'));h.state.repeated=true;await assert.rejects(h.service.comments(config,'TEST-1',0),/pagination/);}finally{h.service.close();}
});
test('attachment reads validate membership, use a private temporary path, clean files and reuse bounded bytes',async()=>{
 const h=harness();try{const session=h.service.session(config,'TEST-1');assert.equal((await attachmentList(session,'TEST-1')).files[0].author,'Author');
 const result=await attachmentBytes(session,'TEST-1','10',0);assert.equal(Buffer.from(result.base64,'base64').toString(),'abc');await assert.rejects(access(h.path()));
 await attachmentBytes(session,'TEST-1','10',0);assert.equal(h.calls.filter(a=>a.includes('download')).length,1);
 h.state.missing=true;await assert.rejects(attachmentBytes(session,'TEST-1','10',0),/belongs/);
 await assert.rejects(session.request('/rest/api/3/attachment/content/10?redirect=false',{body:Buffer.from('x')}),/disabled/);
 }finally{h.service.close();}
});
test('incorrect download size is rejected and temporary files are cleaned on failure',async()=>{
 const h=harness();h.state.badSize=true;try{await assert.rejects(attachmentBytes(h.service.session(config,'TEST-1'),'TEST-1','10',0),/size/);await assert.rejects(access(h.path()));}finally{h.service.close();}
});
