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
