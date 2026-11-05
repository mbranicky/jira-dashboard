import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auth} from '@modelcontextprotocol/sdk/client/auth.js';
import {McpOAuthSession, MCP_ENDPOINT, MCP_READ_SCOPE} from '../server/mcp-oauth';

test('SDK OAuth discovery, registration, PKCE exchange and refresh use synthetic HTTP', async () => {
  let consent: URL | undefined;
  let refresh = false;
  let revoked = false;
  const grants: string[] = [];
  const session = new McpOAuthSession(12345, async url => {consent = url;});
  const json = (value: unknown) => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json'}});
  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.includes('oauth-protected-resource')) return json({
      resource: 'https://mcp.atlassian.com/v2/mcp', authorization_servers: ['https://auth.atlassian.com'],
    });
    if (url.pathname.includes('well-known')) return json({
      issuer: 'https://auth.atlassian.com', authorization_endpoint: 'https://auth.atlassian.com/authorize',
      token_endpoint: 'https://auth.atlassian.com/token', registration_endpoint: 'https://auth.atlassian.com/register',
      response_types_supported: ['code'], code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    });
    if (url.pathname === '/register') {
      assert.equal(JSON.parse(String(init?.body)).scope, MCP_READ_SCOPE);
      return json({...session.clientMetadata, client_id: 'synthetic-client'});
    }
    if (url.pathname === '/token') {
      const body = new URLSearchParams(String(init?.body));
      grants.push(body.get('grant_type')!);
      if (revoked) return new Response(JSON.stringify({error: 'invalid_grant'}), {status: 400, headers: {'content-type': 'application/json'}});
      if (!refresh) {
        assert.equal(body.get('code'), 'synthetic-code');
        assert.equal(body.get('redirect_uri'), session.redirectUrl);
        assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), consent?.searchParams.get('code_challenge'));
      } else assert.equal(body.get('refresh_token'), 'synthetic-refresh');
      return json({access_token: refresh ? 'synthetic-rotated' : 'synthetic-access', refresh_token: refresh ? 'synthetic-refresh-rotated' : 'synthetic-refresh', token_type: 'Bearer', expires_in: 3600, scope: MCP_READ_SCOPE});
    }
    throw new Error(`Unexpected mocked route: ${url.pathname}`);
  };
  try {
    assert.equal(await auth(session, {serverUrl: MCP_ENDPOINT, scope: MCP_READ_SCOPE, fetchFn}), 'REDIRECT');
    assert.equal(consent?.searchParams.get('scope'), MCP_READ_SCOPE);
    assert.equal(consent?.searchParams.get('code_challenge_method'), 'S256');
    const callback = new URL(session.redirectUrl);
    callback.searchParams.set('state', consent!.searchParams.get('state')!);
    callback.searchParams.set('code', 'synthetic-code');
    assert.equal(await auth(session, {serverUrl: MCP_ENDPOINT, authorizationCode: session.acceptCallback(callback), scope: MCP_READ_SCOPE, fetchFn}), 'AUTHORIZED');
    assert.equal(session.tokens()?.access_token, 'synthetic-access');
    refresh = true;
    assert.equal(await auth(session, {serverUrl: MCP_ENDPOINT, scope: MCP_READ_SCOPE, fetchFn}), 'AUTHORIZED');
    assert.equal(session.tokens()?.access_token, 'synthetic-rotated');
    assert.equal(session.tokens()?.refresh_token, 'synthetic-refresh-rotated');
    assert.deepEqual(grants, ['authorization_code', 'refresh_token']);
    revoked = true;
    assert.equal(await auth(session, {serverUrl: MCP_ENDPOINT, scope: MCP_READ_SCOPE, fetchFn}), 'REDIRECT');
    assert.equal(session.tokens(), undefined);
  } finally {session.dispose();}
});
