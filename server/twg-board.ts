import {z} from 'zod';
import {boardSchema,issueSchema,type Board} from '../shared/contracts';

/** Internal adapter boundary, NOT a claim about TWG's wire response schema.
 * A versioned CLI decoder must produce this shape before runtime integration. */
export const twgBoardSnapshot=z.object({
 site:z.string().url(),boardId:z.number().int().positive(),name:z.string().min(1),
 user:z.object({accountId:z.string().min(1),displayName:z.string()}),
 columns:boardSchema.shape.columns,
 sprints:boardSchema.shape.sprints,
 selectedSprintId:z.number().int().positive().nullable(),
 issues:z.array(issueSchema.extend({assigneeAccountId:z.string().nullable()})),
 complete:z.literal(true),
});
export function normalizeTwgBoard(value:unknown,expected:{site:string;boardId:number},now=()=>new Date()):Board {
 const parsed=twgBoardSnapshot.safeParse(value);
 if(!parsed.success)throw new Error('Incomplete or unsupported TWG board data.');
 const data=parsed.data;
 if(data.site!==expected.site||data.boardId!==expected.boardId)throw new Error('TWG returned a different site or board.');
 const sprints=data.sprints.filter(s=>s.state==='active'||s.state==='future');
 if(data.selectedSprintId!==null&&!sprints.some(s=>s.id===data.selectedSprintId))throw new Error('TWG returned an unavailable sprint.');
 if(data.selectedSprintId===null&&data.issues.length)throw new Error('TWG returned issues without a selected sprint.');
 const statuses=new Set(data.columns.flatMap(c=>c.statusIds));
 const keys=new Set<string>();
 for(const issue of data.issues){
  if(issue.assigneeAccountId!==data.user.accountId)throw new Error('TWG returned an issue assigned to another user.');
  if(!statuses.has(issue.statusId))throw new Error('TWG issue status is not mapped to a board column.');
  if(keys.has(issue.key))throw new Error('TWG returned duplicate issues.');
  keys.add(issue.key);
 }
 return boardSchema.parse({...data,sprints,checkedAt:now().toISOString()});
}
