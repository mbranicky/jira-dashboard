import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {McpOAuthSession, MCP_READ_SCOPE, MCP_WRITE_SCOPE} from '../server/mcp-oauth';
import {JiraMcpConnection} from '../server/mcp-client';
import {credentialStore} from '../server/mcp-store';

const site = 'https://example.atlassian.net';
for(const writeAccess of [false,true])test(`persistent MCP ${writeAccess?'write':'read'} flow authorizes, verifies, restarts, refreshes and disconnects entirely with mocks`, async () => {
  const scope=writeAccess?MCP_WRITE_SCOPE:MCP_READ_SCOPE;
  let stored: string | null = null;
  const store = credentialStore({
    getPassword: () => stored,
    setPassword: value => {stored = value;},
    deleteCredential: () => {stored = null; return true;},
  }, site);
  let consent: URL | undefined;
  let expectedToken = 'synthetic-access';
  const grants: string[] = [];
  const tools: string[] = [];
  const json = (value: unknown) => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json'}});
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.includes('oauth-protected-resource')) return json({
      resource: 'https://mcp.atlassian.com/v2/mcp', authorization_servers: ['https://auth.atlassian.com'],
      scopes_supported: scope.split(' '),
    });
    if (url.pathname.includes('well-known')) return json({
      issuer: 'https://auth.atlassian.com', authorization_endpoint: 'https://auth.atlassian.com/authorize',
      token_endpoint: 'https://auth.atlassian.com/token', registration_endpoint: 'https://auth.atlassian.com/register',
      response_types_supported: ['code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'],
    });
    if (url.pathname === '/register') return json({...JSON.parse(String(init?.body)), client_id: 'synthetic-client'});
    if (url.pathname === '/token') {
      const body = new URLSearchParams(String(init?.body));
      grants.push(body.get('grant_type')!);
      if (body.get('grant_type') === 'authorization_code') {
        assert.equal(body.get('code'), 'synthetic-code');
        assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), consent?.searchParams.get('code_challenge'));
      } else assert.equal(body.get('refresh_token'), 'synthetic-refresh');
      return json({access_token: expectedToken, refresh_token: expectedToken === 'synthetic-access' ? 'synthetic-refresh' : 'synthetic-refresh-rotated', token_type: 'Bearer', expires_in: 3600, scope});
    }
    assert.equal(url.origin + url.pathname, 'https://mcp.atlassian.com/v2/mcp');
    if (new Headers(init?.headers).get('authorization') !== `Bearer ${expectedToken}`) return new Response(null, {
      status: 401, headers: {'www-authenticate': 'Bearer resource_metadata="https://mcp.atlassian.com/.well-known/oauth-protected-resource"'},
    });
    if (init?.method === 'GET') return new Response(null, {status: 405});
    const message = JSON.parse(String(init?.body));
    if (message.id === undefined) return new Response(null, {status: 202});
    let result: unknown;
    if (message.method === 'initialize') result = {protocolVersion: '2025-03-26', capabilities: {tools: {}}, serverInfo: {name: 'mock', version: '1'}};
    else {
      tools.push(message.params.name);
      result = {content: [{type: 'text', text: JSON.stringify(message.params.name === 'atlassianUserInfo'
        ? {data: {accountId: 'mock-account'}}
        : {data:{resources:[{cloudId:'mock-cloud',url:site}]}})}]};
    }
    return json({jsonrpc: '2.0', id: message.id, result});
  };
  const session = new McpOAuthSession(12345, async url => {consent = url;}, Date.now, store,{writeAccess,forceAuthorization:writeAccess});
  const connection = new JiraMcpConnection(session, site, fetch);
  try {
    assert.equal(await connection.connect(), 'authorization-required');
    assert.equal(stored, null);
    assert.equal(consent?.searchParams.get('scope'),scope);
    assert.throws(() => connection.verifiedBinding(), /Connect/);
    const callback = new URL(session.redirectUrl);
    callback.searchParams.set('state', consent!.searchParams.get('state')!);
    callback.searchParams.set('code', 'synthetic-code');
    assert.equal(await connection.completeAuthorization(callback), 'connected');
    assert.equal(store.read()?.binding.accountId, 'mock-account');
    assert.equal(store.read()?.tokens?.refresh_token, 'synthetic-refresh');
    assert.equal(connection.hasWriteAccess(),writeAccess);
  } finally {await connection.close();}
  expectedToken = 'synthetic-rotated';
  const resumed = new JiraMcpConnection(new McpOAuthSession(23456, async () => {throw new Error('Unexpected consent on resume');}, Date.now, store), site, fetch);
  try {
    assert.equal(await resumed.connect(), 'connected');
    assert.equal(store.read()?.tokens?.refresh_token, 'synthetic-refresh-rotated');
    assert.equal(resumed.hasWriteAccess(),writeAccess);
    assert.deepEqual(grants, ['authorization_code', 'refresh_token']);
    assert.deepEqual(tools, ['getAccessibleAtlassianResources', 'atlassianUserInfo', 'getAccessibleAtlassianResources', 'atlassianUserInfo']);
    await resumed.disconnect();
    assert.equal(stored, null);
  } finally {await resumed.close();}
});
