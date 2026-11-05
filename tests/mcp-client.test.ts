import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JiraMcpConnection} from '../server/mcp-client';
import {McpOAuthSession, MCP_ENDPOINT} from '../server/mcp-oauth';

function fixture(pages: Array<{tools: unknown[]; nextCursor?: string}>) {
  const calls: string[] = [];
  const session = new McpOAuthSession(12345, async () => {throw new Error('Unexpected authorization');});
  session.saveClientInformation({client_id: 'synthetic-client'});
  session.saveTokens({access_token: 'synthetic-access', token_type: 'Bearer'});
  const connection = new JiraMcpConnection(session, 'https://example.atlassian.net', async (url, init) => {
    assert.equal(String(url), MCP_ENDPOINT);
    if (init?.method === 'GET') return new Response(null, {status: 405});
    const message = JSON.parse(String(init?.body));
    calls.push(message.method);
    if (message.id === undefined) return new Response(null, {status: 202});
    const result = message.method === 'initialize'
      ? {protocolVersion: '2025-03-26', capabilities: {tools: {}}, serverInfo: {name: 'mock', version: '1'}}
      : message.method === 'tools/call' ? {content: [{type: 'text', text: JSON.stringify(message.params.name === 'atlassianUserInfo'
        ? {accountId: 'mock-user', displayName: 'Example'}
        : [{id: 'mock-cloud', name: 'Example', url: 'https://example.atlassian.net'}])}]}
      : pages.shift();
    return new Response(JSON.stringify({jsonrpc: '2.0', id: message.id, result}), {
      headers: {'content-type': 'application/json'},
    });
  });
  return {connection, session, calls};
}

test('MCP SDK initializes and reads all catalogue pages through mocked HTTP only', async () => {
  const {connection, calls, session} = fixture([
    {tools: [{name: 'readIssue', inputSchema: {type: 'object'}}], nextCursor: 'next'},
    {tools: [{name: 'readBoard', inputSchema: {type: 'object'}}]},
  ]);
  assert.deepEqual(calls, []);
  await assert.rejects(connection.listTools(), /Connect/);
  try {
    assert.equal(await connection.connect(), 'connected');
    assert.deepEqual((await connection.listTools()).map(tool => tool.name), ['readIssue', 'readBoard']);
    assert.deepEqual(calls, ['initialize', 'notifications/initialized', 'tools/call', 'tools/call', 'tools/list', 'tools/list']);
  } finally {await connection.close();}
  assert.throws(() => session.tokens(), /closed/);
  await assert.rejects(connection.connect(), /closed/);
  await assert.rejects(connection.listTools(), /Connect/);
});

test('MCP catalogue rejects repeated cursors instead of looping', async () => {
  const {connection} = fixture([{tools: [], nextCursor: 'same'}, {tools: [], nextCursor: 'same'}]);
  try {
    await connection.connect();
    await assert.rejects(connection.listTools(), /^Error: Could not load the Atlassian tool catalogue\.$/);
  } finally {await connection.close();}
});

test('MCP transport failures are sanitized and dispose the OAuth session', async () => {
  const session = new McpOAuthSession(12345, async () => {});
  session.saveClientInformation({client_id: 'synthetic-client'});
  session.saveTokens({access_token: 'synthetic-access', token_type: 'Bearer'});
  const connection = new JiraMcpConnection(session, 'https://example.atlassian.net', async () => {throw new Error('private synthetic response');});
  await assert.rejects(connection.connect(), /^Error: Atlassian MCP connection failed\. Check the OS credential store and authorize the intended account and Jira site\.$/);
  assert.throws(() => session.tokens(), /closed/);
});

test('successful MCP connection and catalogue discovery emit no diagnostic logs',context=>{
 const output:unknown[][]=[];
 for(const level of ['info','warn','error','log','debug'] as const)context.mock.method(console,level,(...args:unknown[])=>{output.push(args);});
 const {connection}=fixture([{tools:[{name:'uploadAttachmentToJiraIssue',description:'Synthetic provider metadata',inputSchema:{type:'object'}}]}]);
 return (async()=>{try{await connection.connect();await connection.listTools();assert.deepEqual(output,[]);}finally{await connection.close();}})();
});
