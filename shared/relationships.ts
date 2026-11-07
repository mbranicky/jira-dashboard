import {z} from 'zod';
export const relationshipSchema=z.object({key:z.string().regex(/^[A-Z][A-Z0-9_]*-[1-9]\d*$/),summary:z.string(),status:z.string().nullable(),relationship:z.string()});
export const relationshipsSchema=z.object({items:z.array(relationshipSchema),complete:z.boolean()});
export type Relationships=z.infer<typeof relationshipsSchema>;
const linked=z.object({key:relationshipSchema.shape.key,fields:z.object({summary:z.string(),status:z.object({name:z.string()}).nullish()})});
/** Missing or malformed fields are unavailable, never evidence of no dependencies. */
export function normalizeRelationships(fields:Record<string,unknown>):Relationships{
 const items:Relationships['items']=[];let complete=true;
 const add=(value:unknown,relationship:string)=>{const parsed=linked.safeParse(value);if(!parsed.success){complete=false;return;}items.push({key:parsed.data.key,summary:parsed.data.fields.summary,status:parsed.data.fields.status?.name??null,relationship});};
 for(const field of ['issuelinks','subtasks'] as const){
  if(!Array.isArray(fields[field])){complete=false;continue;}
  for(const raw of fields[field]){
   if(field==='subtasks'){add(raw,'Subtask');continue;}
   const parsed=z.object({type:z.object({inward:z.string(),outward:z.string()}),inwardIssue:z.unknown().optional(),outwardIssue:z.unknown().optional()}).safeParse(raw);
   if(!parsed.success){complete=false;continue;}
   const link=parsed.data;
   if(Boolean(link.inwardIssue)===Boolean(link.outwardIssue)){complete=false;continue;}
   add(link.inwardIssue??link.outwardIssue,link.inwardIssue?link.type.inward:link.type.outward);
  }
 }
 const unique=items.filter((item,index)=>items.findIndex(other=>other.key===item.key&&other.relationship===item.relationship)===index);
 return {items:unique,complete};
}
