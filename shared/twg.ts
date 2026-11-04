import {defineRpc} from '@getpaseo/plugin';
import {z} from 'zod';
export const twgState=z.object({id:z.string(),state:z.enum(['running','succeeded','failed','cancelled']),message:z.string()});
export const twgStart=defineRpc({name:'twg.start',input:z.object({action:z.enum(['login','check']),executable:z.string().trim().min(1).max(4096)}),output:twgState});
export const twgPoll=defineRpc({name:'twg.poll',input:z.object({id:z.string()}),output:twgState});
export const twgCancel=defineRpc({name:'twg.cancel',input:z.object({id:z.string()}),output:twgState});
