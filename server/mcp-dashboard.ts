import {z} from 'zod';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import {boardSchema,type Board} from '../shared/contracts';
import {parseBoardUrl,rawIssue} from './jira';
import {MCP_BOARD_TOOLS,type McpBoardTool} from './mcp-tools';
import type {McpBinding} from './mcp-binding';
export interface McpBoardReader {
 verifiedBinding():McpBinding;
 boardTools():Promise<Tool[]>;
 readBoardTool(name:McpBoardTool,args:Record<string,unknown>):Promise<unknown>;
}
const configSchema=z.object({id:z.number().int().positive(),name:z.string().min(1),columnConfig:z.object({columns:z.array(z.object({name:z.string().min(1),statuses:z.array(z.object({id:z.string().min(1)}))})).min(1)})});
const sprintSchema=z.object({id:z.number().int().positive(),name:z.string(),state:z.string()});
const pagination={startAt:z.number().int().nonnegative().optional(),total:z.number().int().nonnegative().optional(),isLast:z.boolean().optional(),nextPageToken:z.string().min(1).optional()};
const sprintPage=z.object({...pagination,values:z.array(sprintSchema)});
const issuePage=z.object({...pagination,issues:z.array(rawIssue)});
/** MCP v2 wraps tool payloads in data; older fixtures expose the payload directly. */
function boardPayload(value:unknown):unknown {
 if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.prototype.hasOwnProperty.call(value,'data'))return (value as {data:unknown}).data;
 return value;
}
export function createMcpDashboard(now=Date.now,progress?:{board:(name:string,columns:number)=>void;sprints:(sprints:z.infer<typeof sprintSchema>[])=>void;issues:(count:number,sprint:z.infer<typeof sprintSchema>|undefined)=>void}){
 const metadata=new WeakMap<McpBoardReader,Map<number,{until:number;value:z.infer<typeof configSchema>}>>();
 const pending=new WeakMap<McpBoardReader,Map<string,Promise<Board>>>();
 async function load(reader:McpBoardReader,boardUrl:string,sprintId?:number):Promise<Board>{
  const {site,id}=parseBoardUrl(boardUrl),binding=reader.verifiedBinding();
  if(binding.siteUrl!==site)throw new Error('Reconnect MCP for the configured Jira site.');
  const tools=await reader.boardTools();
  for(const name of MCP_BOARD_TOOLS)if(tools.filter(t=>t.name===name).length!==1)throw new Error(`Required MCP tool is unavailable: ${name}.`);
  const input=(name:McpBoardTool,values:Record<string,unknown>)=>{
   const props=tools.find(t=>t.name===name)!.inputSchema.properties??{};
   const output:Record<string,unknown>={cloudId:binding.cloudId,...values};
   for(const key of ['boardId'])if(key in output&&(props[key] as {type?:string})?.type==='string')output[key]=String(output[key]);
   return output;
  };
  const read=async(name:McpBoardTool,args:Record<string,unknown>)=>boardPayload(await reader.readBoardTool(name,input(name,args)));
  let cache=metadata.get(reader);if(!cache){cache=new Map();metadata.set(reader,cache);}
  let configuration=cache.get(id);
  if(!configuration||configuration.until<=now()){
   const value=configSchema.parse(await read('getJiraBoardConfig',{boardId:id}));
   if(value.id!==id)throw new Error('MCP returned a different board.');
   const statusIds=value.columnConfig.columns.flatMap(c=>c.statuses.map(s=>s.id));
   if(new Set(statusIds).size!==statusIds.length)throw new Error('MCP returned ambiguous column mappings.');
   configuration={value,until:now()+600_000};
   if(cache.size>=32)cache.delete(cache.keys().next().value!);cache.set(id,configuration);
  }
  progress?.board(configuration.value.name,configuration.value.columnConfig.columns.length);
  const stateSchema=tools.find(t=>t.name==='listJiraBoardSprints')!.inputSchema.properties?.state as {enum?:unknown[]}|undefined;
  const sprintFilter=stateSchema?.enum?(stateSchema.enum.includes('all')?{state:'all'}:{}):{state:'active,future'};
  const sprints=await collect(async(startAt)=>{const page=sprintPage.parse(await read('listJiraBoardSprints',{boardId:id,...sprintFilter,startAt,maxResults:50}));return {...page,items:page.values};});
  const available=sprints.filter(s=>s.state==='active'||s.state==='future');
  progress?.sprints(available);
  if(sprintId!==undefined&&!available.some(s=>s.id===sprintId))throw new Error('Selected sprint is no longer available. Choose another sprint.');
  const active=available.filter(s=>s.state==='active');
  const selectedSprintId=sprintId??(active.length===1?active[0].id:null);
  const properties=tools.find(t=>t.name==='getJiraBoardIssueData')!.inputSchema.properties??{};
  const cursorPaging='nextPageToken' in properties;
  const raw=selectedSprintId===null?[]:await collect(async(startAt,nextPageToken)=>{
   const fields=['summary','status','assignee','issuetype','priority','project','parent','fixVersions','labels'];
   const page=issuePage.parse(await read('getJiraBoardIssueData',{boardId:id,...('view' in properties?{view:'full'}:{}),...('searchResultMode' in properties?{searchResultMode:'issues'}:{}),jql:`sprint = ${selectedSprintId} AND assignee = currentUser()`,fields:(properties.fields as {type?:string})?.type==='array'?fields:fields.join(','),maxResults:50,...(cursorPaging?(nextPageToken?{nextPageToken}:{}):{startAt})}));
   return {...page,items:page.issues};
  },cursorPaging);
  const columns=configuration.value.columnConfig.columns.map(c=>({name:c.name,statusIds:c.statuses.map(s=>s.id)}));
  const statuses=new Set(columns.flatMap(c=>c.statusIds));
  const issues=raw.map(issue=>{
   const f=issue.fields;
   if(f.assignee?.accountId!==binding.accountId)throw new Error('MCP returned an issue assigned to another user.');
   if(!statuses.has(f.status.id))throw new Error('MCP returned an unmapped issue status. Refresh the board configuration.');
   return {key:issue.key,summary:f.summary,statusId:f.status.id,status:f.status.name,statusCategory:f.status.statusCategory?.key,type:f.issuetype.name,priority:f.priority?.name??null,projectKey:f.project.key,parent:f.parent?{key:f.parent.key,summary:f.parent.fields.summary}:null,fixVersions:f.fixVersions?.map(v=>v.name)??[],labels:f.labels??[]};
  });
  const verified=reader.verifiedBinding();
  if(verified.accountId!==binding.accountId||verified.cloudId!==binding.cloudId||verified.siteUrl!==binding.siteUrl)throw new Error('MCP account or site changed. Reconnect.');
  progress?.issues(issues.length,available.find(s=>s.id===selectedSprintId));
  return boardSchema.parse({site,boardId:id,name:configuration.value.name,checkedAt:new Date(now()).toISOString(),user:{displayName:binding.displayName},columns,sprints:available,selectedSprintId,issues});
 }
 return {fetchBoard(reader:McpBoardReader,boardUrl:string,sprintId?:number){
  const key=JSON.stringify([boardUrl,sprintId]);let flights=pending.get(reader);if(!flights){flights=new Map();pending.set(reader,flights);}
  const existing=flights.get(key);if(existing)return existing;
  const result=load(reader,boardUrl,sprintId).catch(error=>{metadata.delete(reader);if(error instanceof z.ZodError)throw new Error('Unsupported MCP board response. No partial dashboard was loaded.');throw error;}).finally(()=>flights!.delete(key));
  flights.set(key,result);return result;
 },clear(reader:McpBoardReader){metadata.delete(reader);}};
}
async function collect<T extends {id?:number;key?:string}>(read:(offset:number,cursor?:string)=>Promise<{items:T[];startAt?:number;total?:number;isLast?:boolean;nextPageToken?:string}>,cursorPaging=false):Promise<T[]>{
 const output:T[]=[];const seen=new Set<string>();const cursors=new Set<string>();let cursor:string|undefined;
 for(let count=0;count<100;count++){
  const page=await read(output.length,cursor);
  if(page.startAt!==undefined&&page.startAt!==output.length)throw new Error('Unexpected MCP page offset.');
  for(const item of page.items){const key=String(item.key??item.id);if(seen.has(key))throw new Error('Repeated MCP page or item.');seen.add(key);output.push(item);}
  if(page.total!==undefined&&output.length>page.total)throw new Error('Inconsistent MCP pagination total.');
  if(page.isLast===true){if(page.nextPageToken||page.total!==undefined&&output.length!==page.total)throw new Error('Incomplete MCP pagination.');return output;}
  if(page.total!==undefined&&output.length===page.total&&page.isLast!==false&&!page.nextPageToken)return output;
  if(!page.items.length)throw new Error('Incomplete MCP pagination.');
  if(cursorPaging){if(!page.nextPageToken||cursors.has(page.nextPageToken))throw new Error('Missing or repeated MCP page cursor.');cursor=page.nextPageToken;cursors.add(cursor);}
  else if(page.nextPageToken||page.total===undefined&&page.isLast===undefined)throw new Error('MCP did not confirm complete pagination.');
 }
 throw new Error('MCP pagination limit exceeded.');
}
