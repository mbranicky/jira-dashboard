import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import {McpOAuthSession,MCP_READ_SCOPE,MCP_WRITE_SCOPE} from '../server/mcp-oauth';
import {JiraMcpConnection} from '../server/mcp-client';
import {writeTool} from '../server/mcp-tools';
const tool:Tool={name:'transitionJiraIssue',annotations:{readOnlyHint:false,destructiveHint:false},inputSchema:{type:'object',properties:{cloudId:{type:'string'},issueIdOrKey:{type:'string'},transitionId:{type:'string'}},required:['cloudId','issueIdOrKey','transitionId']}};
const args={cloudId:'cloud',issueIdOrKey:'TEST-1',transitionId:'2'};
test('write gate rejects unknown tools, missing tools, extra inputs and malformed arguments',()=>{
 assert.throws(()=>writeTool([tool],'deleteJiraIssue' as never,args),/not allowed/);
 assert.throws(()=>writeTool([],'transitionJiraIssue',args),/unavailable/);
 assert.throws(()=>writeTool([tool,tool],'transitionJiraIssue',args),/unavailable/);
 assert.throws(()=>writeTool([tool],'transitionJiraIssue',{...args,unexpected:true}),/input contract/);
 assert.throws(()=>writeTool([tool],'transitionJiraIssue',{cloudId:'cloud'}),/input contract/);
 assert.throws(()=>writeTool([{...tool,annotations:{destructiveHint:true}}],'transitionJiraIssue',args),/write tool contract/);
 assert.equal(writeTool([tool],'transitionJiraIssue',args),tool);
});
async function fixture(writeAccess:boolean,fail=false,writeResponse?:unknown){
 const calls:string[]=[];let readFailure=false;
 const session=new McpOAuthSession(12345,async()=>{throw Error('Unexpected consent');});
 session.saveClientInformation({client_id:'synthetic'});
 session.saveTokens({access_token:'synthetic',token_type:'Bearer',scope:writeAccess?MCP_WRITE_SCOPE:MCP_READ_SCOPE});
 const connection=new JiraMcpConnection(session,'https://example.atlassian.net',async(_url,init)=>{
  if(init?.method==='GET')return new Response(null,{status:405});
  const message=JSON.parse(String(init?.body));
  if(message.id===undefined)return new Response(null,{status:202});
  let result:unknown;
  if(message.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'mock',version:'1'}};
  else if(message.method==='tools/list')result={tools:[tool]};
  else {
   calls.push(message.params.name);
   if(readFailure)throw Error('private authentication detail');
   if(message.params.name==='transitionJiraIssue'){
    assert.deepEqual(message.params.arguments,args);
    if(fail)throw Error('private transport detail');
   }
   const data=message.params.name==='atlassianUserInfo'?{accountId:'user',displayName:'User'}:message.params.name==='getAccessibleAtlassianResources'?[{id:'cloud',url:'https://example.atlassian.net',name:'Example'}]:{data:{success:true}};
   result=message.params.name==='transitionJiraIssue'&&writeResponse!==undefined?writeResponse:{content:[{type:'text',text:JSON.stringify(data)}]};
  }
  return new Response(JSON.stringify({jsonrpc:'2.0',id:message.id,result}),{headers:{'content-type':'application/json'}});
 });
 await connection.connect();return {connection,calls,failReads:()=>{readFailure=true;}};
}
test('existing read grant and wrong cloud cannot issue a mutation',async()=>{
 const read=await fixture(false),write=await fixture(true);
 try{
  await assert.rejects(read.connection.writeJiraTool('transitionJiraIssue',args),/Authorize Jira changes/);
  await assert.rejects(write.connection.writeJiraTool('transitionJiraIssue',{...args,cloudId:'other'}),/binding/);
  assert.equal(read.calls.includes('transitionJiraIssue'),false);assert.equal(write.calls.includes('transitionJiraIssue'),false);
 }finally{await read.connection.close();await write.connection.close();}
});
test('write invokes only its allowlisted tool once and uncertain delivery is sanitized without retry',async()=>{
 for(const fail of [false,true]){
  const f=await fixture(true,fail);
  try{
   if(fail)await assert.rejects(f.connection.writeJiraTool('transitionJiraIssue',args),error=>error instanceof Error&&/could not be confirmed/.test(error.message)&&!error.message.includes('private'));
   else assert.deepEqual(await f.connection.writeJiraTool('transitionJiraIssue',args),{data:{success:true}});
   assert.equal(f.calls.filter(n=>n==='transitionJiraIssue').length,1);
  }finally{await f.connection.close();}
 }
});

test('connection diagnostics verify current identity again without writes and sanitize revoked access',async()=>{
 const f=await fixture(false);
 try{
  assert.equal((await f.connection.checkReadAccess()).accountId,'user');
  assert.equal(f.calls.filter(n=>n==='atlassianUserInfo').length,2);
  assert.equal(f.calls.filter(n=>n==='getAccessibleAtlassianResources').length,2);
  assert.equal(f.calls.includes('transitionJiraIssue'),false);
  f.failReads();await assert.rejects(f.connection.checkReadAccess(),error=>error instanceof Error&&/authentication check failed/.test(error.message)&&!error.message.includes('private'));
 }finally{await f.connection.close();}
});


test('write transport accepts JSON or structured acknowledgements but rejects error/prose envelopes without retry',async()=>{
 const receipt={data:{message:'Applied'}};
 for(const [response,accepted] of [
  [{structuredContent:receipt,content:[]},true],
  [{content:[{type:'text',text:JSON.stringify(receipt)}]},true],
  [{isError:true,content:[{type:'text',text:JSON.stringify(receipt)}]},false],
  [{content:[{type:'text',text:'Applied successfully'}]},false],
  [{content:[]},false],
 ] as const){
  const f=await fixture(true,false,response);
  try{
   if(accepted)assert.deepEqual(await f.connection.writeJiraTool('transitionJiraIssue',args),receipt);
   else await assert.rejects(f.connection.writeJiraTool('transitionJiraIssue',args),/could not be confirmed/);
   assert.equal(f.calls.filter(name=>name==='transitionJiraIssue').length,1);
  }finally{await f.connection.close();}
 }
});
