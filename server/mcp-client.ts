import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {UnauthorizedError} from '@modelcontextprotocol/sdk/client/auth.js';
import {MCP_ENDPOINT, McpOAuthSession} from './mcp-oauth';

/** Explicitly invoked connection; constructing/importing this module never contacts Jira. */
export class JiraMcpConnection {
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;
  constructor(private readonly oauth: McpOAuthSession) {}
  async connect(): Promise<'connected' | 'authorization-required'> {
    await this.client?.close();
    this.client = new Client({name: 'paseo-jira-dashboard', version: '0.1.0'});
    this.transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT), {authProvider: this.oauth});
    try { await this.client.connect(this.transport); return 'connected'; }
    catch (error) {
      if (error instanceof UnauthorizedError) return 'authorization-required';
      await this.close();
      // SDK errors may contain OAuth responses. Never surface their raw message.
      throw new Error('Atlassian MCP connection failed.');
    }
  }
  async completeAuthorization(callback: URL) {
    if (!this.transport) throw new Error('No authorization in progress.');
    const code = this.oauth.acceptCallback(callback);
    try { await this.transport.finishAuth(code); }
    catch { await this.close(); throw new Error('Atlassian authorization failed.'); }
    return this.connect();
  }
  async listTools() {
    if (!this.client) throw new Error('Connect to Atlassian first.');
    const tools = []; const seen = new Set<string>(); let cursor: string | undefined;
    try {
      do {
        const page = await this.client.listTools(cursor ? {cursor} : {});
        tools.push(...page.tools); cursor = page.nextCursor;
        if (cursor && (seen.has(cursor) || seen.size >= 100)) throw new Error('Invalid pagination');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return tools;
    } catch { throw new Error('Could not load the Atlassian tool catalogue.'); }
  }
  async close() {
    try { await this.client?.close(); }
    finally { this.client = undefined; this.transport = undefined; this.oauth.dispose(); }
  }
}
