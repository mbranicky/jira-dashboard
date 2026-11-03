import { readFile, stat, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { credentials, reader, collect } from './rest-core.mjs';
process.umask(0o077);
try {
  const file=resolve(process.argv[2] || '.local/jira.env');
  const info=await stat(file);
  if(!info.isFile() || (info.mode & 0o077)) throw new Error('jira.env must be a regular owner-only file (chmod 600).');
  const auth=credentials(await readFile(file,'utf8'));
  if(!process.argv[3]) throw new Error('Pass a Jira Cloud board URL as the second argument after the secret-file path.');
  const boardUrl=new URL(process.argv[3]);
  if(boardUrl.protocol!=='https:' || !/^[a-z0-9-]+\.atlassian\.net$/.test(boardUrl.hostname) || boardUrl.port || boardUrl.username || boardUrl.password) throw new Error('Expected a Jira Cloud board URL.');
  const boardId=boardUrl.pathname.match(/\/boards\/(\d+)\/?$/)?.[1];
  if(!boardId) throw new Error('Board URL must end with /boards/<number>.');
  // Tenant discovery is public. Never send credentials to the site URL.
  const tenantResponse=await fetch(`${boardUrl.origin}/_edge/tenant_info`,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!tenantResponse.ok) throw new Error(`Cloud ID discovery failed (${tenantResponse.status}).`);
  const {cloudId}=await tenantResponse.json();
  const get=reader(cloudId,auth);
  const me=await get('/rest/api/3/myself');
  if(!me.accountId) throw new Error('Jira identity response has no account ID.');
  console.log('Authenticated with Jira.');
  const board=await get(`/rest/agile/1.0/board/${boardId}/configuration`);
  if(String(board.id)!==boardId || !Array.isArray(board.columnConfig?.columns)) throw new Error('Unexpected board configuration.');
  const sprints=await collect(get,`/rest/agile/1.0/board/${boardId}/sprint`,{state:'active'},'values','offset');
  const results=[];
  for(const sprint of sprints) {
    if(!Number.isSafeInteger(sprint.id)) throw new Error('Invalid sprint ID.');
    const issues=await collect(get,`/rest/software/1.0/board/${boardId}/sprint/${sprint.id}/issue`,{jql:'assignee = currentUser()',fields:'summary,status,assignee,issuetype,priority,project'},'issues','token');
    if(issues.some(i=>i.fields?.assignee?.accountId!==me.accountId)) throw new Error('Assignee validation failed; refusing to save results.');
    results.push({id:sprint.id,name:sprint.name,issues:issues.map(i=>({key:i.key,summary:i.fields.summary,status:i.fields.status,type:i.fields.issuetype?.name,priority:i.fields.priority?.name,project:i.fields.project?.key}))});
  }
  const columns=board.columnConfig.columns.map(c=>({name:c.name,statusIds:c.statuses.map(s=>s.id)}));
  const report={checkedAt:new Date().toISOString(),site:boardUrl.origin,boardId,boardName:board.name,user:{accountId:me.accountId,displayName:me.displayName},columns,sprints:results};
  await mkdir('.local/rest',{recursive:true,mode:0o700});
  await writeFile('.local/rest/board-51.tmp',JSON.stringify(report,null,2),{mode:0o600});
  await rename('.local/rest/board-51.tmp',`.local/rest/board-${boardId}.json`);
  console.log(JSON.stringify({boardId,boardName:board.name,columns:columns.map(c=>c.name),activeSprints:results.map(s=>({id:s.id,name:s.name,assignedIssues:s.issues.length})),result:`.local/rest/board-${boardId}.json`},null,2));
} catch(error) {
  console.error(error.code==='ENOENT' ? 'Credential file not found. Create .local/jira.env or pass its absolute path.' : error.message);
  process.exitCode=1;
}
