import {z} from 'zod';
import {McpVerificationError} from './mcp-verification-error';

const identitySchema = z.object({accountId: z.string().min(1), displayName: z.string().min(1)});
const resourcesSchema = z.array(z.object({id: z.string().min(1), url: z.string().url(), name: z.string().min(1)}));
// Observed MCP v2 shape, distinct from the legacy accessible-resources array.
const v2ResourcesSchema=z.object({error:z.literal(false).optional(),data:z.object({error:z.literal(false).optional(),resources:z.array(z.object({
  cloudId:z.string().min(1).refine(value=>value.trim().length>0),id:z.string().optional(),url:z.string().url(),name:z.string().nullish(),
}).refine(value=>value.id===undefined||value.id===value.cloudId))})}).transform(value=>value.data.resources.map(resource=>({
  id:resource.cloudId,url:resource.url,name:resource.name?.trim()||new URL(resource.url).hostname,
})));
const accessibleResourcesSchema=z.union([resourcesSchema,v2ResourcesSchema]);
export type McpBinding = {accountId: string; displayName: string; cloudId: string; siteUrl: string; siteName: string};

export function mcpSiteOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !url.hostname.endsWith('.atlassian.net') || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Select a valid Jira Cloud site.');
  }
  return url.origin;
}

/** Receives normalized, authenticated tool results. No guessing from email or the first accessible site. */
export function bindMcpAccount(site: string, identity: unknown, resources: unknown, previous?: McpBinding): McpBinding {
  const user = identitySchema.safeParse(identity);
  const sites = accessibleResourcesSchema.safeParse(resources);
  if (!user.success || !sites.success) throw new McpVerificationError('Could not verify the Atlassian account and sites.');
  const siteUrl = mcpSiteOrigin(site);
  const matches = sites.data.filter(resource => {
    try {return mcpSiteOrigin(resource.url) === siteUrl;} catch {return false;}
  });
  if (matches.length !== 1) throw new McpVerificationError('The selected Jira site is unavailable or ambiguous for this account.');
  const selected = matches[0];
  if (previous && (previous.accountId !== user.data.accountId || previous.cloudId !== selected.id || previous.siteUrl !== siteUrl)) {
    throw new McpVerificationError('The Atlassian account or site changed. Disconnect and authorize the intended account again.');
  }
  return {...user.data, cloudId: selected.id, siteUrl, siteName: selected.name};
}
