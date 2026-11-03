import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { assertRead, readTools } from './policy.mjs';

process.umask(0o077);
const useV1 = process.env.JIRA_MCP_VERSION === 'v1';
if (process.env.JIRA_MCP_VERSION && !['v1', 'v2'].includes(process.env.JIRA_MCP_VERSION)) throw new Error('JIRA_MCP_VERSION must be v1 or v2');
const requestedScopes = useV1
  ? 'read:me offline_access read:jira-work read:jira-user'
  : 'read:me read:account offline_access read:jira:agent-interface search:jira:agent-interface';
const directory = new URL(useV1 ? '../.local/v1/' : '../.local/', import.meta.url);
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const authFile = new URL('auth.json', directory);
let saved = {};
try { saved = JSON.parse(await readFile(authFile, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
async function persist() {
  const tmp = new URL('auth.tmp', directory);
  await writeFile(tmp, JSON.stringify(saved), { mode: 0o600 });
  await rename(tmp, authFile);
}
const state = randomBytes(32).toString('hex');
let verifier;
let resolveCode;
const code = new Promise(resolve => { resolveCode = resolve; });
const port = 18761;
const redirectUrl = `http://127.0.0.1:${port}/callback`;
const server = createServer((req, res) => {
  const url = new URL(req.url, redirectUrl);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname !== '/callback' || url.searchParams.get('state') !== state) {
    res.writeHead(400).end('Invalid authorization callback.'); return;
  }
  if (!url.searchParams.get('code')) {
    res.writeHead(400).end('Authorization was not completed. Return to Paseo.');
    resolveCode(null); return;
  }
  res.end('Authorization received. You can close this tab and return to Paseo.');
  resolveCode(url.searchParams.get('code'));
});
const provider = {
  redirectUrl,
  clientMetadata: {
    client_name: 'Paseo Jira Dashboard read-only prototype',
    redirect_uris: [redirectUrl], grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'], token_endpoint_auth_method: 'none',
    scope: requestedScopes,
  },
  state: () => state,
  clientInformation: () => saved.client,
  saveClientInformation: async value => { saved.client = value; await persist(); },
  tokens: () => saved.tokens,
  saveTokens: async value => { saved.tokens = value; await persist(); },
  saveCodeVerifier: value => { verifier = value; },
  codeVerifier: () => verifier,
  redirectToAuthorization: async url => {
    // SDK discovery prefers the server's full supported-scope list. Explicitly
    // constrain browser consent to identity, refresh, and Jira read/search.
    url.searchParams.set('scope', requestedScopes);
    console.log('Authorize the read-only prototype in your browser:\n' + url.href);
    if (process.platform === 'darwin') {
      const child = spawn('open', [url.href], { stdio: 'ignore' });
      child.on('error', () => console.log('Open the authorization link above manually.'));
    }
  },
  invalidateCredentials: async scope => {
    if (scope === 'all' || scope === 'client') delete saved.client;
    if (scope === 'all' || scope === 'tokens') delete saved.tokens;
    if (scope === 'all' || scope === 'verifier') verifier = undefined;
    await persist();
  },
};
const endpoint = new URL(useV1 ? 'https://mcp.atlassian.com/v1/mcp' : 'https://mcp.atlassian.com/v2/mcp?tools=all');
let client;
let transport;
let timeout;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  transport = new StreamableHTTPClientTransport(endpoint, { authProvider: provider });
  client = new Client({ name: 'paseo-jira-read-only-prototype', version: '0.0.0' });
  try { await client.connect(transport); }
  catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    console.log('Waiting for browser authorization (up to 10 minutes).');
    const authorizationCode = await Promise.race([
      code,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Authorization timed out. Run npm run prototype again.')), 600000); }),
    ]);
    clearTimeout(timeout);
    if (!authorizationCode) throw new Error('Authorization declined.');
    await transport.finishAuth(authorizationCode);
    transport = new StreamableHTTPClientTransport(endpoint, { authProvider: provider });
    client = new Client({ name: 'paseo-jira-read-only-prototype', version: '0.0.0' });
    await client.connect(transport);
  }
  server.close();
  const tools = [];
  let cursor;
  const cursors = new Set();
  do {
    const page = await client.listTools(cursor ? { cursor } : {});
    tools.push(...page.tools);
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error('Repeated tool catalog cursor');
    cursors.add(cursor);
  } while (cursor);
  await writeFile(new URL('tools.json', directory), JSON.stringify(tools, null, 2));
  console.log('Connected. Available dashboard read tools:', tools.filter(t => readTools.has(t.name)).map(t => t.name).join(', '));
  const requestPath = process.argv[2];
  if (requestPath) {
    const requests = JSON.parse(await readFile(requestPath, 'utf8'));
    for (const request of requests) {
      assertRead(request.name);
      if (!tools.some(t => t.name === request.name)) throw new Error(`Unavailable tool: ${request.name}`);
    }
    for (const [index, request] of requests.entries()) {
      const result = await client.callTool(request);
      await writeFile(new URL(`result-${index}-${request.name}.json`, directory), JSON.stringify(result, null, 2));
      console.log(`${request.name}: ${result.isError ? 'FAILED (see local result)' : 'received (saved locally)'}`);
      if (result.isError) process.exitCode = 1;
    }
  }
} catch (error) {
  // OAuth errors can contain sensitive responses; do not dump tokens or stacks.
  console.error('Connection failed:', error instanceof UnauthorizedError ? 'Authorization required.' : String(error.message).slice(0, 400));
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  server.close();
  await client?.close();
}
