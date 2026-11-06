import type {McpCredentialStore} from './mcp-store';
import type {McpBinding} from './mcp-binding';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import type {OAuthClientProvider} from '@modelcontextprotocol/sdk/client/auth.js';
import type {OAuthClientInformationMixed, OAuthTokens} from '@modelcontextprotocol/sdk/shared/auth.js';

export const MCP_ENDPOINT = 'https://mcp.atlassian.com/v2/mcp?tools=all';
export const MCP_READ_SCOPE = 'read:me read:account offline_access read:jira:agent-interface search:jira:agent-interface';

export const MCP_WRITE_SCOPE = MCP_READ_SCOPE + ' write:jira:agent-interface';

/** Host-only OAuth state. Persistent credentials use only the injected OS credential store. */
export class McpOAuthSession implements OAuthClientProvider {
  private binding?: McpBinding;
  private restored = false;
  private persistAllowed = false;
  private client?: OAuthClientInformationMixed;
  private token?: OAuthTokens;
  private verifier?: string;
  private nonce = randomBytes(32).toString('hex');
  private consumed = false;
  private disposed = false;
  private scopeContinuity = true;
  private readonly expiresAt: number;
  readonly redirectUrl: string;
  readonly clientMetadata;

  constructor(port: number, private readonly authorize: (url: URL) => Promise<void>, private readonly now = Date.now, private readonly store?: McpCredentialStore, private readonly access={writeAccess:false,forceAuthorization:false}) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid callback port.');
    this.redirectUrl = `http://127.0.0.1:${port}/callback`;
    this.expiresAt = now() + 10 * 60_000;
    this.clientMetadata = {
      client_name: 'Jira Sprint Workspace', redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
      token_endpoint_auth_method: 'none', scope: access.writeAccess ? MCP_WRITE_SCOPE : MCP_READ_SCOPE,
    };
  }
  private active() { if (this.disposed) throw new Error('Connection closed.'); }
  restore() {
    this.active();
    if (this.restored) return;
    const saved = this.store?.read();
    if (saved) {
      // A non-refreshable grant must re-register for the new ephemeral callback URI.
      this.client = !this.access.forceAuthorization && saved.tokens?.refresh_token ? saved.client : undefined;
      this.token = !this.access.forceAuthorization && saved.tokens?.refresh_token ? saved.tokens : undefined;
      this.binding = saved.binding;
      this.persistAllowed = !this.access.forceAuthorization;
    }
    this.restored = true;
  }
  hasWriteAccess() { this.active(); return (this.token?.scope??'').split(/\s+/).includes('write:jira:agent-interface'); }
  previousBinding() {return this.binding ? {...this.binding} : undefined;}
  confirmBinding(binding: McpBinding) {
    this.active();
    if (!this.token || !this.client) throw new Error('Atlassian authorization is required.');
    this.binding = {...binding}; this.persistAllowed = true;
    this.persist();
  }
  private persist() {
    if (this.persistAllowed && this.binding) this.store?.write({version: 1, binding: this.binding, client: this.client, tokens: this.token});
  }
  disconnect() {
    try {this.store?.delete();} finally {this.dispose();}
  }
  state() { this.active(); return this.nonce; }
  clientInformation() { this.active(); return this.client; }
  saveClientInformation(value: OAuthClientInformationMixed) { this.active(); if(this.client&&this.client.client_id!==value.client_id)this.scopeContinuity=false; this.client = value; this.persist(); }
  tokens() { this.active(); return this.token; }
  saveTokens(value: OAuthTokens) {
    this.active();
    // OAuth refresh may omit an unchanged scope. Preserve only an existing grant,
    // never carry permissions across consent, client changes or another issuer.
    const scope=value.scope===undefined&&this.scopeContinuity&&this.token?.refresh_token&&value.issuer===this.token.issuer?this.token.scope:undefined;
    this.token=scope===undefined?value:{...value,scope};this.scopeContinuity=true;this.persist();
  }
  saveCodeVerifier(value: string) { this.active(); this.verifier = value; }
  codeVerifier() { this.active(); if (!this.verifier) throw new Error('Authorization session expired.'); return this.verifier; }
  async redirectToAuthorization(url: URL) {
    this.active();
    // Do not widen consent to the server's complete advertised scope list.
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['auth.atlassian.com', 'mcp.atlassian.com'].includes(url.hostname)) {
      throw new Error('Unsupported authorization destination.');
    }
    this.scopeContinuity = false;
    this.persistAllowed = false; // A new grant must pass identity/site checks before replacing the saved session.
    const target = new URL(url);
    target.searchParams.set('scope', this.access.writeAccess ? MCP_WRITE_SCOPE : MCP_READ_SCOPE);
    await this.authorize(target);
  }
  acceptCallback(url: URL): string {
    this.active();
    const state = Buffer.from(url.searchParams.get('state') ?? '');
    const expected = Buffer.from(this.nonce);
    if (this.consumed || this.now() >= this.expiresAt || url.origin !== new URL(this.redirectUrl).origin ||
        url.pathname !== '/callback' || url.searchParams.getAll('state').length !== 1 ||
        url.searchParams.getAll('code').length > 1 || url.hash || state.length !== expected.length || !timingSafeEqual(state, expected)) {
      throw new Error('Invalid or expired authorization callback.');
    }
    this.consumed = true;
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code) throw new Error('Authorization was not completed.');
    return code;
  }
  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'all' || scope === 'client' || scope === 'tokens') this.scopeContinuity=false;
    if (scope === 'all' || scope === 'client') this.client = undefined;
    if (scope === 'all' || scope === 'tokens') {this.token = undefined; this.client = undefined;}
    if (scope === 'all' || scope === 'verifier') this.verifier = undefined;
    this.persist();
  }
  dispose() { this.persistAllowed = false; this.client = undefined; this.token = undefined; this.verifier = undefined; this.binding = undefined; this.nonce = ''; this.disposed = true; }
}
