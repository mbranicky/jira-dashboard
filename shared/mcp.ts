import {connectionCheckResult} from './connection-check';
import {defineRpc} from '@getpaseo/plugin';
import {z} from 'zod';
const target=z.object({hostId:z.string().min(1).max(256),site:z.string().url().refine(value=>{try{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9-]+\.atlassian\.net$/.test(u.hostname)&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash;}catch{return false;}},'Enter a Jira Cloud board URL.')});
export const mcpState=z.object({id:z.string().optional(),state:z.enum(['idle','connecting','authorizing','connected','failed','cancelled','disconnecting']),message:z.string(),authorizationUrl:z.string().url().optional(),writeAccess:z.boolean().optional(),account:z.string().optional(),accountId:z.string().optional(),site:z.string().optional()});
export const mcpStatus=defineRpc({name:'mcp.status',input:target,output:mcpState});
export const mcpStart=defineRpc({name:'mcp.start',input:target.extend({authorize:z.boolean(),writeAccess:z.boolean().default(false),browserOnHost:z.boolean().default(false)}),output:mcpState});
export const mcpCancel=defineRpc({name:'mcp.cancel',input:target.extend({id:z.string()}),output:mcpState});
export const mcpDisconnect=defineRpc({name:'mcp.disconnect',input:target,output:mcpState});

export const mcpTestConnection=defineRpc({name:'mcp.test',input:z.object({hostId:z.string().min(1).max(256),boardUrl:z.string().trim().min(1)}),output:connectionCheckResult});
