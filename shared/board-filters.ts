import {z} from 'zod';
import type {Issue} from './contracts';
export const filterFields=['labels','priority','type','parent','fixVersions'] as const;
export type FilterField=typeof filterFields[number];
export const boardFiltersSchema=z.object({labels:z.array(z.string()).default([]),priority:z.array(z.string()).default([]),type:z.array(z.string()).default([]),parent:z.array(z.string()).default([]),fixVersions:z.array(z.string()).default([])});
export type BoardFilters=z.infer<typeof boardFiltersSchema>;
export const emptyFilters=():BoardFilters=>boardFiltersSchema.parse({});
export const savedViewSchema=z.object({name:z.string().trim().min(1).max(60),search:z.string().max(500),filters:boardFiltersSchema});
export type SavedView=z.infer<typeof savedViewSchema>;
export function filterValues(issue:Issue,field:FilterField):string[]{
 if(field==='parent')return issue.parent?[issue.parent.key]:[];
 const value=issue[field];return Array.isArray(value)?value:value?[value]:[];
}
/** OR within a field, AND across fields. Literal search retains the existing key/title behavior. */
export function matchesBoardView(issue:Issue,search:string,filters:BoardFilters){
 return `${issue.key} ${issue.summary}`.toLowerCase().includes(search.toLowerCase())&&filterFields.every(field=>!filters[field].length||filters[field].some(value=>filterValues(issue,field).includes(value)));
}
export function filterOptions(issues:Issue[],field:FilterField,selected:string[]){return [...new Set([...selected,...issues.flatMap(issue=>filterValues(issue,field))])].sort((a,b)=>a.localeCompare(b));}
