import {test} from 'node:test';
import assert from 'node:assert/strict';
import {McpOAuthSession, MCP_READ_SCOPE} from '../server/mcp-oauth';

function callback(session: McpOAuthSession) {
  const url = new URL(session.redirectUrl);
  url.searchParams.set('state', session.state()); url.searchParams.set('code', 'synthetic-code');
  return url;
}
test('OAuth callback is state-bound, expiring and single-use', () => {
  let now = 0;
  const session = new McpOAuthSession(12345, async () => {}, () => now);
  const valid = callback(session);
  const wrong = new URL(valid); wrong.searchParams.set('state', 'wrong');
  assert.throws(() => session.acceptCallback(wrong));
  assert.equal(session.acceptCallback(valid), 'synthetic-code');
  assert.throws(() => session.acceptCallback(valid));
  const expired = new McpOAuthSession(12345, async () => {}, () => now);
  const late = callback(expired); now = 600_000;
  assert.throws(() => expired.acceptCallback(late));
});
test('OAuth consent is read-only and rejects untrusted destinations', async () => {
  let redirected: URL | undefined;
  const session = new McpOAuthSession(12345, async url => { redirected = url; });
  await session.redirectToAuthorization(new URL('https://auth.atlassian.com/authorize?scope=delete'));
  assert.equal(redirected?.searchParams.get('scope'), MCP_READ_SCOPE);
  await assert.rejects(session.redirectToAuthorization(new URL('https://example.com/authorize')));
});
test('OAuth sessions isolate credentials, preserve issuer and dispose secrets', () => {
  const a = new McpOAuthSession(12345, async () => {});
  const b = new McpOAuthSession(12346, async () => {});
  a.saveTokens({access_token: 'synthetic', token_type: 'Bearer', issuer: 'https://auth.atlassian.com'});
  assert.equal(a.tokens()?.issuer, 'https://auth.atlassian.com');
  assert.equal(b.tokens(), undefined);
  a.invalidateCredentials('tokens'); assert.equal(a.tokens(), undefined);
  a.dispose(); assert.throws(() => a.tokens()); assert.throws(() => a.saveCodeVerifier('test'));
});

test('OAuth rejects credential-bearing consent URLs and duplicate callback parameters', async () => {
  const session = new McpOAuthSession(12345, async () => {});
  await assert.rejects(session.redirectToAuthorization(new URL('https://user:pass@auth.atlassian.com/authorize')));
  await assert.rejects(session.redirectToAuthorization(new URL('https://auth.atlassian.com:8443/authorize')));
  const duplicate = callback(session);
  duplicate.searchParams.append('code', 'another');
  assert.throws(() => session.acceptCallback(duplicate));
  assert.equal(session.acceptCallback(callback(session)), 'synthetic-code');
});

test('write upgrade requests only Jira writes and preserves the saved grant until verified', async()=>{
 const binding={accountId:'user',displayName:'User',cloudId:'cloud',siteUrl:'https://example.atlassian.net',siteName:'Example'};
 const saved={version:1 as const,binding,client:{client_id:'saved'},tokens:{access_token:'synthetic-read',refresh_token:'synthetic-refresh',token_type:'Bearer',scope:MCP_READ_SCOPE}};
 const writes:unknown[]=[];let deletes=0;let consent:URL|undefined;
 const session=new McpOAuthSession(12345,async url=>{consent=url;},Date.now,{read:()=>saved,write:value=>{writes.push(value);},delete:()=>{deletes++;}},{writeAccess:true,forceAuthorization:true});
 session.restore();assert.deepEqual(session.previousBinding(),binding);assert.equal(session.tokens(),undefined);assert.equal(session.clientInformation(),undefined);
 session.saveClientInformation({client_id:'new'});
 await session.redirectToAuthorization(new URL('https://auth.atlassian.com/authorize?scope=delete'));
 assert.equal(consent?.searchParams.get('scope'),MCP_READ_SCOPE+' write:jira:agent-interface');
 session.saveTokens({access_token:'synthetic-write',token_type:'Bearer',scope:MCP_READ_SCOPE+' write:jira:agent-interface'});
 assert.equal(session.hasWriteAccess(),true);assert.equal(writes.length,0);assert.equal(deletes,0);
 session.confirmBinding(binding);assert.equal(writes.length,1);session.dispose();assert.equal(deletes,0);
});
test('cancelled write authorization never replaces saved read credentials',()=>{
 const saved={version:1 as const,binding:{accountId:'u',displayName:'U',cloudId:'c',siteUrl:'https://example.atlassian.net',siteName:'Example'},client:{client_id:'saved'},tokens:{access_token:'synthetic',refresh_token:'synthetic',token_type:'Bearer'}};
 const session=new McpOAuthSession(12345,async()=>{},Date.now,{read:()=>saved,write:()=>{throw Error('must not overwrite');},delete:()=>{throw Error('must not delete');}},{writeAccess:true,forceAuthorization:true});
 session.restore();session.saveClientInformation({client_id:'temporary'});session.invalidateCredentials('all');session.dispose();
});

test('same-grant refresh retains omitted scope, including rotation, but honors explicit reductions',()=>{
 const session=new McpOAuthSession(12345,async()=>{});
 const scope=MCP_READ_SCOPE+' write:jira:agent-interface';
 session.saveTokens({access_token:'old',refresh_token:'refresh',token_type:'Bearer',scope,issuer:'https://auth.atlassian.com'});
 session.saveTokens({access_token:'new',refresh_token:'rotated',token_type:'Bearer',issuer:'https://auth.atlassian.com'});
 assert.equal(session.hasWriteAccess(),true);assert.equal(session.tokens()?.scope,scope);
 session.saveTokens({access_token:'reduced',refresh_token:'rotated',token_type:'Bearer',scope:MCP_READ_SCOPE,issuer:'https://auth.atlassian.com'});
 assert.equal(session.hasWriteAccess(),false);
 session.saveTokens({access_token:'again',refresh_token:'rotated',token_type:'Bearer',issuer:'https://auth.atlassian.com'});
 assert.equal(session.tokens()?.scope,MCP_READ_SCOPE);
});
test('new authorization, changed issuer and invalidated credentials cannot inherit old write scope',async()=>{
 for(const mode of ['consent','issuer','invalidate','client']){
  const session=new McpOAuthSession(12345,async()=>{});
  session.saveClientInformation({client_id:'old-client'});
  session.saveTokens({access_token:'old',refresh_token:'refresh',token_type:'Bearer',scope:MCP_READ_SCOPE+' write:jira:agent-interface',issuer:'https://auth.atlassian.com'});
  if(mode==='consent')await session.redirectToAuthorization(new URL('https://auth.atlassian.com/authorize'));
  if(mode==='invalidate')session.invalidateCredentials('tokens');
  if(mode==='client')session.saveClientInformation({client_id:'new-client'});
  session.saveTokens({access_token:'new',refresh_token:'new-refresh',token_type:'Bearer',issuer:mode==='issuer'?'https://other.example':'https://auth.atlassian.com'});
  assert.equal(session.hasWriteAccess(),false,mode);assert.equal(session.tokens()?.scope,undefined);
 }
});
