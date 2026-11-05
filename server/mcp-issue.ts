import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import type {McpBinding} from './mcp-binding';
import {readWorkspaceIssueByKey} from './jira';
export interface McpIssueReader {
 verifiedBinding():McpBinding;
 boardTools():Promise<Tool[]>;
 readIssueTool(args:Record<string,unknown>):Promise<unknown>;
}
export async function readMcpIssue(reader:McpIssueReader,site:string,key:string){
 if(!/^[A-Z][A-Z0-9_]*-[1-9]\d*$/.test(key))throw new Error('Invalid Jira issue key.');
 const binding=reader.verifiedBinding();
 if(binding.siteUrl!==site)throw new Error('MCP site binding does not match.');
 const tools=await reader.boardTools();const matches=tools.filter(t=>t.name==='searchJiraIssuesUsingJql');
 if(matches.length!==1)throw new Error('MCP issue search is unavailable. Open the issue in Jira.');
 const props=matches[0].inputSchema.properties??{};
 const result=await readWorkspaceIssueByKey(async(_path,params)=>{
  const fields=String(params?.fields??'').split(',');
  const args:Record<string,unknown>={cloudId:binding.cloudId,jql:`key = "${key}"`};
  if('fields' in props)args.fields=(props.fields as {type?:string}).type==='string'?fields.join(','):fields;
  if('maxResults' in props)args.maxResults=2;
  if('view' in props)args.view='full';
  if('searchResultMode' in props)args.searchResultMode='issues';
  const response=await reader.readIssueTool(args);
  return response&&typeof response==='object'&&'data' in response?(response as {data:unknown}).data:response;
 },site,key);
 const after=reader.verifiedBinding();
 if(after.accountId!==binding.accountId||after.cloudId!==binding.cloudId||after.siteUrl!==site)throw new Error('MCP account or site changed. Reconnect.');
 if(result&&result.issue.key!==key)throw new Error('MCP returned a different issue.');
 return result;
}
