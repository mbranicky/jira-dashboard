import {defineRpc} from '@getpaseo/plugin';
import {z} from 'zod';
export const connectionCheckResult=z.object({ok:z.boolean(),steps:z.array(z.object({label:z.string(),state:z.enum(['passed','failed','skipped']),message:z.string()}))});
export const testConnection=defineRpc({name:'connection.test',input:z.object({boardUrl:z.string().trim().min(1),envPath:z.string().trim().min(1)}),output:connectionCheckResult});
