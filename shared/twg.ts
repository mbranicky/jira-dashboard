import {defineRpc} from '@getpaseo/plugin';
import {z} from 'zod';
export const twgTarget=z.object({site:z.string().url().refine(value=>{const u=new URL(value);return u.protocol==='https:'&&/^[a-z0-9-]+\.atlassian\.net$/.test(u.hostname)&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash;},'Use a Jira Cloud site URL.'),profile:z.string().trim().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/, 'Enter a TWG profile name.')});
export const twgState=z.object({id:z.string(),state:z.enum(['running','succeeded','unverified','failed','cancelled']),message:z.string()});
export const twgStart=defineRpc({name:'twg.start',input:z.object({boardId:z.number().int().positive().optional(),action:z.enum(['login','check']),executable:z.string().trim().min(1).max(4096)}).extend(twgTarget.shape),output:twgState});
export const twgPoll=defineRpc({name:'twg.poll',input:z.object({id:z.string()}),output:twgState});
export const twgCancel=defineRpc({name:'twg.cancel',input:z.object({id:z.string()}),output:twgState});
