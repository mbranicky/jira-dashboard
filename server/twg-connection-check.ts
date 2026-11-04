import {z} from 'zod';
import {TwgConnection,TwgCompatibilityError} from './twg-client';
import {TwgFailure} from './twg-errors';
import {decodeTwgIdentity} from './twg-identity';
import {sprintsPage,issuesPage,pages} from './twg-dashboard';
import type {connectionCheckResult} from '../shared/connection-check';
import {twgTarget} from '../shared/twg';

/** Explicit fresh reads only: no metadata cache, credential files or mutations. */
export async function checkTwgConnection(cli:TwgConnection,input:{site:string;profile:string;boardId:number}):Promise<z.infer<typeof connectionCheckResult>>{
 const steps:z.infer<typeof connectionCheckResult>['steps']=[];
 let label='Board URL';
 const passed=(message:string)=>steps.push({label,state:'passed',message});
 try{
  const target=twgTarget.parse(input);z.number().int().positive().parse(input.boardId);passed('Valid Jira Cloud board URL.');
  label='CLI compatibility';await cli.requireProfileSupport();passed('Executable supports explicit OAuth profiles.');
  label='Authentication';const user=decodeTwgIdentity(await cli.readDashboard('identity',target));passed(`Connected as ${user.displayName}.`);
  label='Board access';const board=await cli.boardColumns(target,input.boardId);passed(`${board.name}: ${board.columns.length} columns.`);
  label='Sprint access';const sprints=(await pages(async offset=>sprintsPage.parse(await cli.readDashboard('sprints',target,input.boardId,offset)).data,'sprints')).filter(s=>s.state==='active'||s.state==='future');passed(`${sprints.length} active or future sprints available.`);
  label='Sprint issues';const sprint=sprints.find(s=>s.state==='active')??sprints[0];
  if(sprint){const issues=await pages(async offset=>issuesPage.parse(await cli.readDashboard('issues',target,sprint.id,offset)).data,'issues');passed(`${issues.filter(i=>i.fields.assignee?.accountId===user.accountId).length} assigned issues readable in ${sprint.name}.`);}
  else steps.push({label,state:'skipped',message:'No active or future sprint; sprint issue access could not be checked.'});
  label='Workspace issue search';
  z.object({apiVersion:z.literal('v2'),command:z.literal('jira.workitem.query'),data:z.object({issues:z.array(z.object({key:z.string().regex(/^[A-Z][A-Z0-9_]*-[1-9]\d*$/)}))})}).parse(await cli.searchAssignedIssues(target));
  passed('Independent issue search is available.');
  return {ok:true,steps};
 }catch(error){
  const message=error instanceof TwgFailure||error instanceof TwgCompatibilityError?error.message:error instanceof z.ZodError?'Incomplete or unsupported Teamwork Graph response.':'Teamwork Graph could not verify this step. Check authorization and CLI compatibility on the host, then retry.';
  steps.push({label,state:'failed',message});return {ok:false,steps};
 }
}
