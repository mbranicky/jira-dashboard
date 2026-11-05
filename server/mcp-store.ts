import type {EntryOptions} from '@napi-rs/keyring';
import {createHash} from 'node:crypto';
import {keyringHelperEntry} from './mcp-keyring-helper';
import {z} from 'zod';
import {OAuthClientInformationSchema, OAuthTokensSchema} from '@modelcontextprotocol/sdk/shared/auth.js';
import {mcpSiteOrigin} from './mcp-binding';

const recordSchema = z.object({
  version: z.literal(1),
  binding: z.object({accountId: z.string().min(1), displayName: z.string(), cloudId: z.string().min(1), siteUrl: z.string(), siteName: z.string()}),
  client: OAuthClientInformationSchema.optional(), tokens: OAuthTokensSchema.optional(),
});
export type McpStoredSession = z.infer<typeof recordSchema>;
export interface McpCredentialStore {
  read(): McpStoredSession | undefined;
  write(record: McpStoredSession): void;
  delete(): void;
}
export interface KeyringEntry {
  getPassword(): string | null;
  setPassword(value: string): void;
  deleteCredential(): boolean;
}
const storeError = () => new Error('The OS credential store is unavailable, locked or invalid. Unlock it and retry.');

/** Only the OS credential entry contains serialized credentials. No plaintext files, command arguments, logs or RPCs. */
export function credentialStore(entry: KeyringEntry, site: string): McpCredentialStore {
  const siteUrl = mcpSiteOrigin(site);
  function validate(value: unknown) {
    const result = recordSchema.parse(value);
    if (result.binding.siteUrl !== siteUrl) throw new Error();
    return result;
  }
  return {
    read() {
      try {
        const value = entry.getPassword();
        if (value === null) return undefined;
        if (value.length > 64 * 1024) throw new Error();
        return validate(JSON.parse(value));
      } catch {throw storeError();}
    },
    write(record) {
      try {
        const value = JSON.stringify(validate(record));
        if (value.length > 64 * 1024) throw new Error();
        entry.setPassword(value);
      } catch {throw storeError();}
    },
    delete() {try {entry.deleteCredential();} catch {throw storeError();}},
  };
}

export function credentialAccount(hostId: string, site: string) {
  if (!hostId.trim()) throw new Error('A stable Paseo host identity is required.');
  return createHash('sha256').update(JSON.stringify([hostId, mcpSiteOrigin(site)])).digest('hex');
}

/** Lazy helper: importing plugin code never loads native code or accesses the keychain. */
export async function createMcpCredentialStore(hostId: string, site: string,
  load?: () => Promise<{Entry: new (service: string, account: string, options?: EntryOptions) => KeyringEntry}>): Promise<McpCredentialStore> {
  const account = credentialAccount(hostId, site);
  try {
    const entry=load?new (await load()).Entry('paseo-jira-dashboard.mcp-v2',account,{linux:{store:'secret-service'}})
      :keyringHelperEntry('paseo-jira-dashboard.mcp-v2',account);
    return credentialStore(entry, site);
  } catch {throw storeError();}
}
