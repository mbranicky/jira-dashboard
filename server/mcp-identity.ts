import {z} from 'zod';
import {McpVerificationError} from './mcp-verification-error';

/** Accept structured MCP output or a single JSON text result; never infer identity from prose. */
export function mcpToolData(result: unknown, tool: 'getAccessibleAtlassianResources'|'atlassianUserInfo'|'board'='board'): unknown {
  const parsed = z.object({isError: z.boolean().optional(), structuredContent: z.unknown().optional(), content: z.array(z.unknown()).optional()}).safeParse(result);
  if (!parsed.success) throw new McpVerificationError(`${tool}: unsupported MCP result envelope.`);
  if (parsed.data.isError) throw new McpVerificationError(`${tool}: Atlassian returned a tool error after authentication. Check this tool's availability and granted scopes.`);
  if (parsed.data.structuredContent !== undefined) return parsed.data.structuredContent;
  const text = z.array(z.object({type: z.literal('text'), text: z.string().max(256 * 1024)})).length(1).safeParse(parsed.data.content);
  if (!text.success) throw new McpVerificationError(`${tool}: expected one JSON text result or structured content.`);
  try {return JSON.parse(text.data[0].text);} catch {throw new McpVerificationError(`${tool}: expected one JSON text result or structured content.`);}
}

// Allowlisted structural diagnostics only. Never emit values or arbitrary provider keys.
function identityShape(value:unknown,depth=0):string {
  if(value===null)return 'null';
  if(Array.isArray(value))return 'array';
  if(typeof value!=='object')return typeof value;
  if(depth>=2)return 'object';
  const record=value as Record<string,unknown>;
  const fields=['account_id','accountId','displayName','name','user','account','data','result','profile','error','message'];
  const found=fields.filter(key=>Object.hasOwn(record,key));
  return `object{${found.map(key=>`${key}:${identityShape(record[key],depth+1)}`).join(',')}${Object.keys(record).some(key=>!fields.includes(key))?',other fields omitted':''}}`;
}

export function mcpIdentity(value: unknown) {
  // The authenticated account ID is the identity boundary; display names are optional metadata.
  // Atlassian ROVO-999 documents account_id-only and enriched OAuth profiles.
  if(value&&typeof value==='object'&&!Array.isArray(value)&&(value as Record<string,unknown>).error===true)
    throw new McpVerificationError('atlassianUserInfo: Atlassian returned a provider error inside the JSON response.');
  const invalid=()=>new McpVerificationError(`atlassianUserInfo: response does not contain a supported account ID. Structure: ${identityShape(value)}.`);
  let candidate=value;
  // Observed v2 response: {data:{accountId:string}}. Unwrap this one explicit
  // envelope only; never recursively search arbitrary objects for an identity.
  if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'data')){
    const outer=value as Record<string,unknown>;
    if(Object.hasOwn(outer,'accountId')||Object.hasOwn(outer,'account_id'))
      throw new McpVerificationError('atlassianUserInfo: ambiguous outer and wrapped account IDs.');
    candidate=outer.data;
  }
  if(candidate&&typeof candidate==='object'&&!Array.isArray(candidate)&&(candidate as Record<string,unknown>).error===true)
    throw new McpVerificationError('atlassianUserInfo: Atlassian returned a provider error inside the JSON response.');
  const id=z.string().min(1).refine(value=>value.trim().length>0);
  const profile=z.object({account_id:id.optional(),accountId:id.optional()}).safeParse(candidate);
  if(!profile.success)throw invalid();
  const p=profile.data;
  if(p.account_id&&p.accountId&&p.account_id!==p.accountId)throw new McpVerificationError('atlassianUserInfo: conflicting account IDs.');
  const accountId=p.account_id??p.accountId;
  if(!accountId)throw invalid();
  const record=candidate as Record<string,unknown>;
  const label=[record.displayName,record.name].find(v=>typeof v==='string'&&v.trim().length>0);
  return {accountId,displayName:typeof label==='string'?label:'Atlassian user'};
}
