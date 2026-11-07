import {relationshipsSchema} from './relationships';
import {savedViewSchema} from './board-filters';
import {richBlockSchema} from './comments';
import { defineRpc, defineSettings } from '@getpaseo/plugin';
import { z } from 'zod';

export const dashboardPreferencesSchema=z.object({viewsByBoard:z.record(z.string(),z.array(savedViewSchema).max(30)).default({}),detailsView:z.enum(['modal','panel']).default('modal'),sprintByBoard:z.record(z.string(),z.number().int().positive().nullable()).default({})});
export const dashboardPreferences=defineSettings({id:'dashboard',scope:'host',version:1,schema:dashboardPreferencesSchema});

export const connectionSchema = z.object({
  transport: z.enum(['rest','twg','mcp']).optional(),
  mcpWrites: z.boolean().default(false),
  mcpHostId:z.string().max(256).default(''),
  twgWrites: z.boolean().default(false),
  boardUrl: z.string().default(''),
  envPath: z.string().default(''),
  twgExecutable: z.string().default('twg'),
  twgProfile: z.string().default('default'),
  refreshSeconds: z.number().int().min(30).default(60),
});
export const connection = defineSettings({ id: 'connection', scope: 'host', version: 1, schema: connectionSchema });
export const issueSchema = z.object({
  key: z.string(), summary: z.string(), statusId: z.string(), status: z.string(), statusCategory: z.string().optional(),
  linkedWorkspace: z.object({workspaceId:z.string(),agentId:z.string().optional()}).optional(),
  parent: z.object({key:z.string(),summary:z.string()}).nullable().default(null),
  fixVersions:z.array(z.string()).default([]), labels:z.array(z.string()).default([]),
  type: z.string(), priority: z.string().nullable(), projectKey: z.string(),
});
export const boardSchema = z.object({
  workspaceWarning:z.string().optional(),
  site: z.string(), boardId: z.number(), name: z.string(), checkedAt: z.string(),
  user: z.object({ displayName: z.string() }),
  columns: z.array(z.object({ name: z.string(), statusIds: z.array(z.string()) })),
  sprints: z.array(z.object({ id: z.number(), name: z.string(), state: z.string() })),
  selectedSprintId: z.number().nullable(),
  issues: z.array(issueSchema),
});
export type Board = z.infer<typeof boardSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export const readBoard = defineRpc({ name: 'board.read', input: z.object({ sprintId: z.number().int().positive().optional() }), output: boardSchema });

export const mappingSchema = z.object({
  name: z.string().trim().default(''),
  jiraProjectKey: z.string().trim().regex(/^[A-Z][A-Z0-9_]*$/, 'Use an uppercase Jira project key.'),
  paseoProjectId: z.string().trim().min(1, 'Select a Paseo project.'),
  entrySkill: z.string().trim().default(''),
  provider: z.string().trim().default(''),
  model: z.string().trim().default(''),
  modeId: z.string().trim().optional(),
  isolation: z.enum(['worktree','directory']).optional(),
  startWorkColumn: z.string().optional(),
  startWorkStatusId: z.string().regex(/^\d*$/).optional(),
  autoUpdateJira: z.boolean().default(true),
}).overwrite(item=>{
  // Paseo validates parsed settings as JSON; cleared optional keys must be absent.
  const clean={...item};
  for(const key of Object.keys(clean) as (keyof typeof clean)[]){
    if(clean[key]===undefined)delete clean[key];
  }
  return clean;
});
export const mappingsSchema = z.object({ items: z.array(mappingSchema).default([]) }).superRefine((value, ctx) => {
  const keys = new Set<string>();
  value.items.forEach((item, index) => {
    if (keys.has(item.jiraProjectKey)) ctx.addIssue({code:'custom', path:['items',index,'jiraProjectKey'], message:'Each Jira project can have only one mapping.'});
    keys.add(item.jiraProjectKey);
  });
});
export const mappings = defineSettings({id:'mappings', scope:'host', version:1, schema:mappingsSchema});
export type Mapping = z.infer<typeof mappingSchema>;

export const workInput = z.object({key:z.string().regex(/^[A-Z][A-Z0-9_]*-\d+$/),sprintId:z.number().int().positive()});
export const startWork = defineRpc({name:'work.start',input:workInput.extend({selection:z.string().optional()}),output:z.object({workspaceId:z.string(),agentId:z.string(),warning:z.string().optional()})});

// Keep legacy unnamed mappings readable; require completion before saving the form.
export const mappingFormSchema = mappingsSchema.superRefine(({items},ctx)=>{
  items.forEach((item,index)=>{
    for(const [field,message] of [['name','Enter a mapping name.'],['provider','Enter an agent provider.'],['isolation','Choose workspace isolation.']] as const){
      if(!item[field])ctx.addIssue({code:'custom',path:['items',index,field],message});
    }
  });
});

export const issueDetailsSchema=z.object({relationships:relationshipsSchema.optional(),richDescription:z.array(richBlockSchema).optional(),description:z.array(z.object({text:z.string(),kind:z.enum(['paragraph','heading','code'])})),assignee:z.string().nullable(),reporter:z.string().nullable(),dueDate:z.string().nullable(),created:z.string().nullable(),updated:z.string().nullable()});
export const readIssueDetails=defineRpc({name:'issue.details',input:workInput,output:issueDetailsSchema});

export const workspaceIssueLink=defineRpc({name:'workspace.issue-link',input:z.object({workspaceId:z.string().min(1),candidates:z.array(workInput.shape.key).max(200)}),output:z.array(workInput.shape.key)});
export const readWorkspaceIssue=defineRpc({name:'workspace.issue-read',input:z.object({key:workInput.shape.key}),output:z.object({site:z.string(),issue:issueSchema,details:issueDetailsSchema}).nullable()});

export const prepareBranches=defineRpc({name:'work.branches',input:workInput,output:z.array(z.object({id:z.string(),branch:z.string(),path:z.string().optional()}))});
