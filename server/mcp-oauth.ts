import {randomBytes, timingSafeEqual} from 'node:crypto';
import type {OAuthClientProvider} from '@modelcontextprotocol/sdk/client/auth.js';
import type {OAuthClientInformationMixed, OAuthTokens} from '@modelcontextprotocol/sdk/shared/auth.js';

export const MCP_ENDPOINT = 'https://mcp.atlassian.com/v2/mcp?tools=all';
export const MCP_READ_SCOPE = 'read:me read:account offline_access read:jira:agent-interface search:jira:agent-interface';

/** One host-side authorization attempt. Deliberately no disk persistence or UI token access. */
export class McpOAuthSession implements OAuthClientProvider {
  private client?: OAuthClientInformationMixed;
  private token?: OAuthTokens;
  private verifier?: string;
  private nonce = randomBytes(32).toString('hex');
  private consumed = false;
  private disposed = false;
  private readonly expiresAt: number;
  readonly redirectUrl: string;
  readonly clientMetadata;

  constructor(port: number, private readonly authorize: (url: URL) => Promise<void>, private readonly now = Date.now) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid callback port.');
    this.redirectUrl = `http://127.0.0.1:${port}/callback`;
    this.expiresAt = now() + 10 * 60_000;
    this.clientMetadata = {
      client_name: 'Paseo Jira Dashboard', redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
      token_endpoint_auth_method: 'none', scope: MCP_READ_SCOPE,
    };
  }
  private active() { if (this.disposed) throw new Error('Connection closed.'); }
  state() { this.active(); return this.nonce; }
  clientInformation() { this.active(); return this.client; }
  saveClientInformation(value: OAuthClientInformationMixed) { this.active(); this.client = value; }
  tokens() { this.active(); return this.token; }
  saveTokens(value: OAuthTokens) { this.active(); this.token = value; }
  saveCodeVerifier(value: string) { this.active(); this.verifier = value; }
  codeVerifier() { this.active(); if (!this.verifier) throw new Error('Authorization session expired.'); return this.verifier; }
  async redirectToAuthorization(url: URL) {
    this.active();
    // Do not widen consent to the server's complete advertised scope list.
    if (url.protocol !== 'https:' || !['auth.atlassian.com', 'mcp.atlassian.com'].includes(url.hostname)) {
      throw new Error('Unsupported authorization destination.');
    }
    const target = new URL(url);
    target.searchParams.set('scope', MCP_READ_SCOPE);
    await this.authorize(target);
  }
  acceptCallback(url: URL): string {
    this.active();
    const state = Buffer.from(url.searchParams.get('state') ?? '');
    const expected = Buffer.from(this.nonce);
    if (this.consumed || this.now() >= this.expiresAt || url.origin !== new URL(this.redirectUrl).origin ||
        url.pathname !== '/callback' || state.length !== expected.length || !timingSafeEqual(state, expected)) {
      throw new Error('Invalid or expired authorization callback.');
    }
    this.consumed = true;
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code) throw new Error('Authorization was not completed.');
    return code;
  }
  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client') this.client = undefined;
    if (scope === 'all' || scope === 'tokens') this.token = undefined;
    if (scope === 'all' || scope === 'verifier') this.verifier = undefined;
  }
  dispose() { this.invalidateCredentials('all'); this.nonce = ''; this.disposed = true; }
}
