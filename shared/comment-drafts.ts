import {z} from 'zod';
import {defineRpc} from '@getpaseo/plugin';
export const draftIdentitySchema=z.object({site:z.string().url(),accountId:z.string().min(1)});
export const readDraftIdentity=defineRpc({name:'comments.draft-identity',input:z.object({}),output:draftIdentitySchema});
export const commentDraftSchema=z.object({text:z.string().max(16000),requestId:z.string().uuid(),uncertain:z.boolean().optional(),parent:z.object({id:z.string().regex(/^\d+$/),author:z.string(),restricted:z.boolean()}).optional()});
export type CommentDraft=z.infer<typeof commentDraftSchema>;
export type DraftStorage={getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void};
export function draftStorageKey(host:string,site:string,accountId:string,issue:string){return `jira-workspace:draft:v1:${JSON.stringify([host,new URL(site).origin,accountId,issue])}`;}
/** Persist only this client's draft; never original comment bodies or host-wide settings. */
export function createDraftStore(storage:()=>DraftStorage|undefined){
 const memory=new Map<string,CommentDraft>();const durable=new Map<string,boolean>();
 return {
  read(key:string){if(memory.has(key))return memory.get(key);try{const raw=storage()?.getItem(key);if(raw){const parsed=commentDraftSchema.safeParse(JSON.parse(raw));if(parsed.success){memory.set(key,parsed.data);durable.set(key,true);return parsed.data;}}}catch{}return undefined;},
  isDurable(key:string){return durable.get(key)??false;},
  write(key:string,draft:CommentDraft|undefined){
   if(draft)memory.set(key,commentDraftSchema.parse(draft));else memory.delete(key);
   try{const target=storage();if(!target){durable.set(key,false);return false;}if(draft)target.setItem(key,JSON.stringify(commentDraftSchema.parse(draft)));else target.removeItem(key);durable.set(key,true);return true;}catch{durable.set(key,false);return false;}
  },
 };
}
