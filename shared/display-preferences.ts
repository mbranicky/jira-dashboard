import {z} from 'zod';
import type {DraftStorage} from './comment-drafts';
export const displayPreferencesSchema=z.object({density:z.enum(['compact','comfortable']).default('compact'),columnWidth:z.union([z.literal(260),z.literal(300),z.literal(360)]).default(300),showParent:z.boolean().default(true),showTags:z.boolean().default(true)});
export type DisplayPreferences=z.infer<typeof displayPreferencesSchema>;
export const defaultDisplayPreferences=displayPreferencesSchema.parse({});
export const displayStorageKey=(host:string)=>`paseo-jira-sprint-workspace:display:v1:${encodeURIComponent(host)}`;
type Snapshot={values:DisplayPreferences;durable:boolean};
export function createDisplayStore(storage:()=>DraftStorage|undefined){
 const cache=new Map<string,Snapshot>();const listeners=new Set<()=>void>();
 return {
  read(host:string):Snapshot{const cached=cache.get(host);if(cached)return cached;
   let values=defaultDisplayPreferences,durable=false;
   try{const target=storage();durable=!!target;const raw=target?.getItem(displayStorageKey(host));if(raw){const parsed=displayPreferencesSchema.safeParse(JSON.parse(raw));if(parsed.success)values=parsed.data;}}catch{}
   const snapshot={values,durable};cache.set(host,snapshot);return snapshot;
  },
  update(host:string,values:DisplayPreferences){const parsed=displayPreferencesSchema.parse(values);let durable=false;
   try{const target=storage();if(target){target.setItem(displayStorageKey(host),JSON.stringify(parsed));durable=true;}}catch{}
   cache.set(host,{values:parsed,durable});listeners.forEach(listener=>listener());
  },
  subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
 };
}
