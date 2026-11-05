import {test} from 'node:test';
import assert from 'node:assert/strict';
import {credentialStore, credentialAccount, createMcpCredentialStore, type KeyringEntry} from '../server/mcp-store';
import {McpOAuthSession} from '../server/mcp-oauth';
import {JiraMcpConnection} from '../server/mcp-client';

const site = 'https://example.atlassian.net';
const binding = {accountId: 'mock-user', displayName: 'Example', cloudId: 'mock-cloud', siteUrl: site, siteName: 'Example'};
function fixture() {
  let value: string | null = null;
  let locked = false;
  let writes = 0;
  const check = () => {if (locked) throw new Error('synthetic secret in native error');};
  const entry: KeyringEntry = {
    getPassword() {check(); return value;},
    setPassword(next) {check(); value = next; writes++;},
    deleteCredential() {check(); const existed = value !== null; value = null; return existed;},
  };
  const store = credentialStore(entry, site);
  const session = () => new McpOAuthSession(12345, async () => {}, Date.now, store);
  return {entry, store, session, lock: () => {locked = true;}, unlock: () => {locked = false;}, writes: () => writes};
}
function seed(session: McpOAuthSession) {
  session.saveClientInformation({client_id: 'mock-client', issuer: 'https://auth.atlassian.com'});
  session.saveTokens({access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'Bearer', issuer: 'https://auth.atlassian.com'});
}
function mockTransport(accountId = binding.accountId, cloudId = binding.cloudId, resultError = false) {
  const calls: string[] = [];
  const fetch: typeof globalThis.fetch = async (_url, init) => {
    if (init?.method === 'GET') return new Response(null, {status: 405});
    const message = JSON.parse(String(init?.body));
    if (message.id === undefined) return new Response(null, {status: 202});
    let result: unknown;
    if (message.method === 'initialize') result = {protocolVersion: '2025-03-26', capabilities: {tools: {}}, serverInfo: {name: 'mock', version: '1'}};
    else {
      calls.push(message.params.name);
      const data = message.params.name === 'atlassianUserInfo'
        ? {account_id: accountId, name: 'Example'} : [{id: cloudId, url: site, name: 'Example'}];
      result = {isError: resultError, content: [{type: 'text', text: JSON.stringify(data)}]};
    }
    return new Response(JSON.stringify({jsonrpc: '2.0', id: message.id, result}), {headers: {'content-type': 'application/json'}});
  };
  return {fetch, calls};
}

test('credentials remain staged until identity is verified, survive restart and rotate in the OS entry', () => {
  const f = fixture(); const first = f.session();
  seed(first);
  assert.equal(f.store.read(), undefined);
  first.confirmBinding(binding);
  first.dispose();
  const resumed = f.session(); resumed.restore();
  assert.equal(resumed.tokens()?.refresh_token, 'synthetic-refresh');
  assert.equal(resumed.clientInformation()?.issuer, 'https://auth.atlassian.com');
  resumed.saveTokens({access_token: 'synthetic-new', refresh_token: 'synthetic-rotated', token_type: 'Bearer'});
  assert.equal(f.store.read()?.tokens?.refresh_token, 'synthetic-rotated');
  assert.equal('verifier' in f.store.read()!, false);
  resumed.disconnect();
  assert.equal(f.store.read(), undefined);
});

test('real MCP client verifies account and exact site before persisting or reporting connected', async () => {
  const f = fixture(); const session = f.session(); seed(session);
  const transport = mockTransport();
  const connection = new JiraMcpConnection(session, site, transport.fetch);
  assert.throws(() => connection.verifiedBinding(), /Connect/);
  assert.equal(await connection.connect(), 'connected');
  assert.deepEqual(transport.calls, ['getAccessibleAtlassianResources', 'atlassianUserInfo']);
  assert.deepEqual(connection.verifiedBinding(), binding);
  assert.equal(f.store.read()?.binding.accountId, binding.accountId);
  await connection.close();
  assert.ok(f.store.read()); // Runtime shutdown is not disconnect.
  const resumed = new JiraMcpConnection(f.session(), site, mockTransport().fetch);
  assert.equal(await resumed.connect(), 'connected');
  await resumed.disconnect();
  assert.equal(f.store.read(), undefined);
});

test('stored account/cloud changes and tool errors fail closed without replacing credentials', async () => {
  for (const transport of [mockTransport('wrong-user'), mockTransport(binding.accountId, 'wrong-cloud'), mockTransport(binding.accountId, binding.cloudId, true)]) {
    const f = fixture(); const seedSession = f.session(); seed(seedSession); seedSession.confirmBinding(binding); seedSession.dispose();
    const before = f.entry.getPassword();
    const connection = new JiraMcpConnection(f.session(), site, transport.fetch);
    await assert.rejects(connection.connect(), /account\/site verification failed/);
    assert.throws(() => connection.verifiedBinding(), /Connect/);
    await assert.rejects(connection.listTools(), /Connect/);
    assert.equal(f.entry.getPassword(), before);
  }
});

test('locked read prevents network use; failed write prevents connection; failed delete is reported', async () => {
  const f = fixture(); f.lock();
  let calls = 0;
  const connection = new JiraMcpConnection(f.session(), site, async () => {calls++; throw new Error();});
  await assert.rejects(connection.connect(), /credential store/);
  assert.equal(calls, 0);
  f.unlock();
  const session = f.session(); session.restore(); seed(session); f.lock();
  const writeFailure = new JiraMcpConnection(session, site, mockTransport().fetch);
  await assert.rejects(writeFailure.connect(), /credential store/);
  assert.throws(() => writeFailure.verifiedBinding(), /Connect/);
  await assert.rejects(writeFailure.disconnect(), /^Error: The OS credential store is unavailable, locked or invalid\./);
  assert.equal(f.writes(), 0);
});

test('invalid records, host isolation, and native loading failures never fall back to files', async () => {
  const f = fixture(); f.entry.setPassword('not-json');
  assert.throws(() => f.store.read(), /credential store/);
  f.entry.setPassword(JSON.stringify({version: 1, binding: {...binding, siteUrl: 'https://other.atlassian.net'}}));
  assert.throws(() => f.store.read(), /credential store/);
  assert.notEqual(credentialAccount('host-a', site), credentialAccount('host-b', site));
  assert.notEqual(credentialAccount('host-a', site), credentialAccount('host-a', 'https://other.atlassian.net'));
  assert.equal(credentialAccount('host-a', site), credentialAccount('host-a', site + '/'));
  await assert.rejects(createMcpCredentialStore('host-a', site, async () => {throw new Error('native secret');}), /^Error: The OS credential store is unavailable, locked or invalid\./);
});

test('fresh authorization cannot overwrite the pinned identity before verification', async () => {
  const f = fixture(); const session = f.session(); seed(session); session.confirmBinding(binding);
  const before = f.entry.getPassword();
  await session.redirectToAuthorization(new URL('https://auth.atlassian.com/authorize'));
  session.saveTokens({access_token: 'synthetic-other-account', token_type: 'Bearer'});
  assert.equal(f.entry.getPassword(), before);
  const connection = new JiraMcpConnection(session, site, mockTransport('wrong-account').fetch);
  // The first restore is normally performed before authorization by connect().
  // Mark this flow restored, then put the new grant back to simulate callback exchange.
  session.restore();
  await session.redirectToAuthorization(new URL('https://auth.atlassian.com/authorize'));
  session.saveTokens({access_token: 'synthetic-other-account', token_type: 'Bearer'});
  await assert.rejects(connection.connect(), /account\/site verification failed/);
  assert.equal(f.entry.getPassword(), before);
});

test('native adapter requires Secret Service on Linux and namespaces only its own entry', async () => {
  const f = fixture();
  let observed: unknown;
  class MockEntry implements KeyringEntry {
    constructor(...args: unknown[]) {observed = args;}
    getPassword() {return f.entry.getPassword();}
    setPassword(value: string) {f.entry.setPassword(value);}
    deleteCredential() {return f.entry.deleteCredential();}
  }
  const store = await createMcpCredentialStore('host-a', site, async () => ({Entry: MockEntry}));
  assert.deepEqual(observed, ['paseo-jira-dashboard.mcp-v2', credentialAccount('host-a', site), {linux: {store: 'secret-service'}}]);
  assert.equal(store.read(), undefined);
  store.delete(); // Missing entry is a successful disconnect.
});

test('revoked credentials retain the pinned binding but discard old registration for a new callback port', () => {
  const f = fixture(); const session = f.session(); seed(session); session.confirmBinding(binding);
  session.invalidateCredentials('tokens');
  assert.equal(f.store.read()?.tokens, undefined);
  assert.equal(f.store.read()?.client, undefined);
  assert.equal(f.store.read()?.binding.accountId, binding.accountId);
  const resumed = new McpOAuthSession(23456, async () => {}, Date.now, f.store); resumed.restore();
  assert.equal(resumed.clientInformation(), undefined);
  assert.equal(resumed.previousBinding()?.accountId, binding.accountId);
});

test('a saved grant without a refresh token requests fresh authorization with the new callback', () => {
  const f = fixture(); const first = f.session(); seed(first);
  first.saveTokens({access_token: 'synthetic-short-lived', token_type: 'Bearer'});
  first.confirmBinding(binding); first.dispose();
  const resumed = f.session(); resumed.restore();
  assert.equal(resumed.tokens(), undefined);
  assert.equal(resumed.clientInformation(), undefined);
  assert.equal(resumed.previousBinding()?.accountId, binding.accountId);
});

test('scope retained during refresh survives secure-store restoration',()=>{
 const f=fixture(),session=f.session();seed(session);session.confirmBinding(binding);
 const scope='read:jira:agent-interface write:jira:agent-interface';
 session.saveTokens({access_token:'synthetic-first',refresh_token:'synthetic-refresh',token_type:'Bearer',scope,issuer:'https://auth.atlassian.com'});
 session.saveTokens({access_token:'synthetic-next',refresh_token:'synthetic-rotated',token_type:'Bearer',issuer:'https://auth.atlassian.com'});
 const restored=f.session();restored.restore();
 assert.equal(restored.tokens()?.scope,scope);assert.equal(restored.hasWriteAccess(),true);
});
