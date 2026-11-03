import {z} from 'zod';
import {parseBoardUrl,loadCredentials,createReader,readSprints,readIssues} from './jira';
import type {connectionCheckResult} from '../shared/connection-check';
// Explicit diagnostics bypass metadata caches so revoked credentials are not reported as valid.
export async function checkConnection(input:{boardUrl:string;envPath:string},dependencies={loadCredentials,fetch}){
 const steps:z.infer<typeof connectionCheckResult>['steps']=[];
 let label='Board URL';
 const passed=(message:string)=>steps.push({label,state:'passed',message});
 try{
  const {site,id}=parseBoardUrl(input.boardUrl);passed('Valid Jira Cloud board URL.');
  label='Secret file';const auth=await dependencies.loadCredentials(input.envPath);passed('Private credentials loaded on this host.');
  label='Jira site';let cloudId:string;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);timer.unref();
  try{const response=await dependencies.fetch(`${site}/_edge/tenant_info`,{redirect:'error',signal:controller.signal});if(!response.ok)throw Error();cloudId=z.object({cloudId:z.string()}).parse(await response.json()).cloudId;}
  catch{throw Error('Cannot resolve the Jira site. Check the board URL and host network connection.');}finally{clearTimeout(timer);}
  passed('Jira Cloud site reached.');
  const get=createReader(cloudId,auth,dependencies.fetch);
  label='Authentication';const user=z.object({accountId:z.string(),displayName:z.string()}).parse(await get('/rest/api/3/myself'));passed(`Connected as ${user.displayName}.`);
  label='Board access';const board=z.object({id:z.number(),name:z.string(),columnConfig:z.object({columns:z.array(z.unknown())})}).parse(await get(`/rest/agile/1.0/board/${id}/configuration`));if(board.id!==id)throw Error('Jira returned a different board.');passed(`${board.name}: ${board.columnConfig.columns.length} columns.`);
  label='Sprint access';const sprints=await readSprints(get,`/rest/agile/1.0/board/${id}/sprint`);passed(`${sprints.length} active or future sprints available.`);
  label='Sprint issues';const sprint=sprints.find(s=>s.state==='active')??sprints[0];
  if(sprint){const issues=await readIssues(get,`/rest/software/1.0/board/${id}/sprint/${sprint.id}/issue`,user.accountId);passed(`${issues.length} assigned issues readable in ${sprint.name}.`);}
  else steps.push({label,state:'skipped',message:'No active or future sprint; sprint issue access could not be checked.'});
  label='Workspace issue search';await get('/rest/api/3/search/jql',{jql:'assignee = currentUser()',maxResults:'1',fields:'key'});passed('Independent issue search is available.');
  return {ok:true,steps};
 }catch(error){steps.push({label,state:'failed',message:error instanceof z.ZodError?'Jira returned an unexpected response format.':error instanceof Error?error.message:'Connection check failed.'});return {ok:false,steps};}
}
