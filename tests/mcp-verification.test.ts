import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mcpToolData,mcpIdentity} from '../server/mcp-identity';
import {bindMcpAccount} from '../server/mcp-binding';
import {McpVerificationError} from '../server/mcp-verification-error';
test('identity failures identify the tool and response stage without provider content',()=>{
 for(const tool of ['getAccessibleAtlassianResources','atlassianUserInfo'] as const){
  assert.throws(()=>mcpToolData({isError:true,content:[{type:'text',text:'private token and account'}]},tool),error=>error instanceof McpVerificationError&&error.message.includes(tool)&&error.message.includes('tool error')&&!error.message.includes('private'));
  assert.throws(()=>mcpToolData({content:[{type:'text',text:'private not JSON'}]},tool),new RegExp(`${tool}: expected one JSON`));
 }
 assert.throws(()=>mcpIdentity({unexpected:'private'}),/atlassianUserInfo: response does not contain/);
 assert.throws(()=>bindMcpAccount('https://example.atlassian.net',{accountId:'synthetic',displayName:'Test'},[]),/site is unavailable/);
});

test('documented OAuth identity uses account_id together with displayName',()=>{
 assert.deepEqual(mcpIdentity({account_id:'synthetic-user',displayName:'Example user',emailAddress:'unused@example.invalid'}),{accountId:'synthetic-user',displayName:'Example user'});
});
test('identity aliases must not disagree and account IDs must be explicit',()=>{
 assert.throws(()=>mcpIdentity({account_id:'user-a',accountId:'user-b',displayName:'Example'}));
 assert.throws(()=>mcpIdentity({emailAddress:'unused@example.invalid',displayName:'Example'}));
 assert.throws(()=>mcpIdentity({account_id:'',displayName:'Example'}));
});

test('an explicit authenticated account ID does not require optional profile names',()=>{
 assert.deepEqual(mcpIdentity({account_id:'synthetic-user'}),{accountId:'synthetic-user',displayName:'Atlassian user'});
 assert.deepEqual(mcpIdentity({account_id:'synthetic-user',displayName:null}),{accountId:'synthetic-user',displayName:'Atlassian user'});
});
test('identity diagnostics never include values or unrecognized field names',()=>{
 assert.throws(()=>mcpIdentity({user:{account_id:'secret-user',displayName:'Secret Name'},'secret-field-name':'secret-value'}),error=>{
  assert.ok(error instanceof Error);assert.match(error.message,/user:object/);assert.match(error.message,/account_id:string/);
  assert.ok(!error.message.includes('secret'));assert.ok(!error.message.includes('Secret Name'));return true;
 });
});
test('a provider error embedded in JSON is not mistaken for an account profile',()=>{
 assert.throws(()=>mcpIdentity({error:true,message:'sensitive provider text',account_id:'synthetic-user'}),/provider error/);
});

test('observed MCP v2 data wrapper carries the authenticated account ID',()=>{
 for(const result of [
  {structuredContent:{data:{accountId:'synthetic-user'}}},
  {content:[{type:'text',text:JSON.stringify({data:{accountId:'synthetic-user'}})}]},
 ])assert.deepEqual(mcpIdentity(mcpToolData(result,'atlassianUserInfo')),{accountId:'synthetic-user',displayName:'Atlassian user'});
 assert.deepEqual(mcpIdentity({data:{accountId:'synthetic-user',displayName:'Example'}}),{accountId:'synthetic-user',displayName:'Example'});
});
test('wrapped identities reject ambiguous, invalid and error payloads',()=>{
 for(const value of [
  {accountId:'outer',data:{accountId:'inner'}},
  {data:{accountId:'',displayName:'Example'}},
  {data:{accountId:42}},
  {data:{error:true,accountId:'synthetic-user'}},
  {error:true,data:{accountId:'synthetic-user'}},
  {data:{data:{accountId:'synthetic-user'}}},
  {data:[{accountId:'synthetic-user'}]},
 ])assert.throws(()=>mcpIdentity(value));
});
