import {z} from 'zod';
import type {connectionCheckResult} from '../shared/connection-check';
import {parseBoardUrl} from './jira';
import {createMcpDashboard,type McpBoardReader} from './mcp-dashboard';
import type {McpIssueReader} from './mcp-issue';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import type {McpBinding} from './mcp-binding';
import {MCP_BOARD_TOOLS,boardTool} from './mcp-tools';
interface CheckReader extends McpBoardReader,McpIssueReader {checkReadAccess():Promise<McpBinding>;listTools():Promise<Tool[]>}
/** Explicit read-only check of draft settings; never reconnects or launches consent. */
export async function checkMcpConnection(input:{hostId:string;boardUrl:string},connect:(target:{hostId:string;site:string})=>Promise<CheckReader>){
 const steps:z.infer<typeof connectionCheckResult>['steps']=[];
 let label='Board URL';
 const report=(state:'passed'|'skipped',message:string)=>{const step={label,state,message},index=steps.findIndex(s=>s.label===label);if(index>=0)steps[index]=step;else steps.push(step);};
 const failures:Record<string,string>={
  'Board URL':'Enter a valid Jira Cloud board URL.',
  'Authentication':'Saved MCP access could not be verified for this host and site. Check the connection or sign in in Settings.',
  'MCP compatibility':'Required MCP read tools are unavailable or incompatible. Check granted access and organization permissions.',
  'Board access':'MCP could not read the board configuration. Check the board URL and board permissions.',
  'Sprint access':'MCP could not read all board sprints. Check sprint access and tool compatibility.',
  'Sprint issues':'MCP could not read the assigned sprint issues completely. Check issue access and tool compatibility.',
  'Workspace issue search':'Independent issue search failed. Check search access and MCP tool compatibility.',
 };
 try{
  const {site}=parseBoardUrl(input.boardUrl);report('passed','Valid Jira Cloud board URL.');
  label='Authentication';const connection=await connect({hostId:input.hostId,site});const binding=await connection.checkReadAccess();
  if(binding.siteUrl!==site)throw Error();report('passed',`Connected as ${binding.displayName}.`);
  label='MCP compatibility';const tools=await connection.listTools();
  for(const name of [...MCP_BOARD_TOOLS,'searchJiraIssuesUsingJql']){
   const matches=tools.filter(t=>t.name===name);if(matches.length!==1||matches[0].annotations?.destructiveHint===true||matches[0].annotations?.readOnlyHint===false)throw Error();
  }
  report('passed','Required board, sprint and issue-search tools are available.');
  // Fresh catalogue and a new dashboard adapter bypass cached metadata and pending board reads.
  const reader:CheckReader={verifiedBinding:()=>connection.verifiedBinding(),boardTools:async()=>tools,listTools:async()=>tools,checkReadAccess:()=>connection.checkReadAccess(),readIssueTool:args=>connection.readIssueTool(args),readBoardTool:(name,args)=>{boardTool(tools,name,args);return connection.readBoardTool(name,args);}};
  const dashboard=createMcpDashboard(Date.now,{
   board:(name,columns)=>{label='Board access';report('passed',`${name}: ${columns} columns.`);label='Sprint access';},
   sprints:sprints=>{label='Sprint access';report('passed',`${sprints.length} active or future sprints available.`);label='Sprint issues';},
   issues:(count,sprint)=>{label='Sprint issues';if(sprint)report('passed',`${count} assigned issues readable in ${sprint.name}.`);else report('skipped','No active or future sprint; sprint issue access could not be checked.');},
  });
  label='Board access';const board=await dashboard.fetchBoard(reader,input.boardUrl);
  if(board.selectedSprintId===null&&board.sprints.length){
   // Diagnostics may sample one available sprint without changing the user's saved selection.
   const sprint=board.sprints.find(s=>s.state==='active')??board.sprints[0];
   label='Sprint access';await dashboard.fetchBoard(reader,input.boardUrl,sprint.id);
  }
  label='Workspace issue search';const props=tools.find(t=>t.name==='searchJiraIssuesUsingJql')!.inputSchema.properties??{};
  const args:Record<string,unknown>={cloudId:binding.cloudId,jql:'assignee = currentUser()'};
  if('maxResults' in props)args.maxResults=1;
  if('fields' in props)args.fields=(props.fields as {type?:string}).type==='string'?'key':['key'];
  if('view' in props)args.view='full';if('searchResultMode' in props)args.searchResultMode='issues';
  boardTool(tools,'searchJiraIssuesUsingJql',args);
  const result=await connection.readIssueTool(args);
  const data=result&&typeof result==='object'&&'data' in result?(result as {data:unknown}).data:result;
  z.object({issues:z.array(z.object({key:z.string().min(1)}))}).parse(data);
  const after=connection.verifiedBinding();if(after.accountId!==binding.accountId||after.cloudId!==binding.cloudId||after.siteUrl!==site)throw Error();
  report('passed','Independent issue search is available.');return {ok:true,steps};
 }catch{steps.push({label,state:'failed',message:failures[label]??'MCP connection check failed.'});return {ok:false,steps};}
}
