import {publicAttachmentSettings} from './server/attachment-settings';
import {checkMcpConnection} from './server/mcp-connection-check';
import {mcpWrites,assertMcpWrites} from './server/mcp-writes';
import {mcpContent} from './server/mcp-content';
import {readMcpIssue} from './server/mcp-issue';
import {createMcpDashboard} from './server/mcp-dashboard';
import {parseBoardUrl} from './server/jira';
import {mcpSettings} from './server/mcp-settings';
import {mcpTestConnection,mcpStart,mcpStatus,mcpCancel,mcpDisconnect} from './shared/mcp';
import {twgWrites,assertTwgWrites} from './server/twg-writes';
import {twgContent} from './server/twg-content';
import {createTwgDashboard} from './server/twg-dashboard';
import {twgStart,twgPoll,twgCancel} from './shared/twg';
import {twgSettings} from './server/twg-settings';
import {testConnection} from './shared/connection-check';
import {checkConnection} from './server/connection-check';
import {projectStatuses,readMoves,moveIssue} from './shared/moves';
import {availableMoves,performMove} from './server/moves';
import {browserPreviews} from './server/browser-preview';
import {prepareBrowserPreview,loadBrowserPreview} from './shared/attachments';
import {listAttachments,attachmentSettings,readAttachment,beginUpload,uploadChunk,finishUpload,cancelUpload} from './shared/attachments';
import {attachmentsSession,attachmentList,attachmentBytes,settings as readAttachmentSettings,attachmentUploads} from './server/attachments';
import {listComments,postComment} from './shared/comments';
import {commentsSession,readCommentPage,createComment,commentPoster} from './server/comments';
import {prepareIssueBranches,boardWorkspaceLinks,validateWork,startIssue,hasExistingWork,savedWorkspaceIssues} from './server/work';
import {boardColumnOptions,fetchProjectStatuses,issueSession,fetchWorkspaceIssue} from './server/jira';
import type { PluginServerContext } from '@getpaseo/plugin/server';
import { prepareBranches,workspaceIssueLink,readWorkspaceIssue,dashboardPreferences,connection, readBoard, readIssueDetails, mappings, startWork } from './shared/contracts';
import { fetchBoard } from './server/jira';
export default function contribute(server:PluginServerContext){
  const mcp=mcpSettings();const mcpFiles=mcpContent();
  const mcpDashboard=createMcpDashboard();
  async function mcpBoard(config:import('./shared/contracts').Connection,sprintId?:number){
    const reader=await mcp.ensureConnection({hostId:config.mcpHostId,site:parseBoardUrl(config.boardUrl).site});
    return mcpDashboard.fetchBoard(reader,config.boardUrl,sprintId);
  }
  server.handle(mcpTestConnection,input=>checkMcpConnection(input,target=>mcp.checkConnection(target)));
  server.handle(mcpStart,input=>mcp.start(input));
  server.handle(mcpStatus,input=>mcp.status(input));
  server.handle(mcpCancel,input=>mcp.cancel(input));
  server.handle(mcpDisconnect,input=>mcp.disconnect(input));
  const twg=twgSettings();
  const content=twgContent();
  const writes=twgWrites();
  const twgDashboard=createTwgDashboard();
  server.handle(twgStart,input=>twg.start(input));
  server.handle(twgPoll,({id})=>twg.poll(id));
  server.handle(twgCancel,({id})=>twg.cancel(id));
  server.handle(testConnection,input=>checkConnection(input));
  const postOnce=commentPoster();
  const uploads=attachmentUploads();
  const previews=browserPreviews();
  server.registerSettings(dashboardPreferences);
  const settings=server.registerSettings(connection);
  const projectMappings=server.registerSettings(mappings);
  async function context(key:string,sprintId:number){
    const current=await settings.read(); const saved=await projectMappings.read();
    if(current.status!=='ready'||saved.status!=='ready')throw new Error('Configure the connection and project mappings first.');
    const {mapping,issue}=await validateWork(current.values,saved.values.items,key,sprintId,current.values.transport==='mcp'?mcpBoard:current.values.transport==='twg'?twgDashboard.fetchBoard:fetchBoard);
    return {config:current.values,mapping,issue};
  }
  server.handle(projectStatuses,async({projectKey,refresh})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure Jira first.');
    if(current.values.transport==='mcp'){const reader=await mcp.ensureConnection({hostId:current.values.mcpHostId,site:parseBoardUrl(current.values.boardUrl).site});if(refresh)mcpDashboard.clear(reader);const board=await mcpBoard(current.values);return boardColumnOptions(board.columns.map(c=>({name:c.name,statuses:c.statusIds.map(id=>({id}))})));}
    if(current.values.transport==='twg'){const columns=await twgDashboard.columns(current.values,refresh);return boardColumnOptions(columns.map(c=>({name:c.name,statuses:c.statusIds.map(id=>({id}))})));}
    return fetchProjectStatuses(current.values,projectKey,refresh);
  });
  async function moves(config:Parameters<typeof availableMoves>[0],key:string,sprintId:number,items:Parameters<typeof availableMoves>[3]){
    if(config.transport==='mcp'){assertMcpWrites(config);const site=parseBoardUrl(config.boardUrl).site;const writer=mcpWrites(await mcp.ensureConnection({hostId:config.mcpHostId,site}),site);return availableMoves(config,key,sprintId,items,mcpBoard,async()=>writer.workflow(key));}
    if(config.transport!=='twg')return availableMoves(config,key,sprintId,items);
    assertTwgWrites(config);
    const columns=await twgDashboard.columns(config);
    return availableMoves(config,key,sprintId,items,twgDashboard.fetchBoard,(c,k)=>writes.workflow(c,k,columns.flatMap(column=>column.statusIds)));
  }
  server.handle(readMoves,async({key,sprintId})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure Jira first.');
    const saved=await projectMappings.read();if(saved.status!=='ready')throw new Error('Mappings unavailable.');
    return (await moves(current.values,key,sprintId,saved.values.items)).options;
  });
  const moving=new Set<string>();
  server.handle(moveIssue,async(input,{paseo})=>{
    if(moving.has(input.key))throw new Error('A move is already running for this issue.');
    moving.add(input.key);
    try{
      const current=await settings.read();if(current.status!=='ready')throw new Error('Configure Jira first.');
      const saved=await projectMappings.read();if(saved.status!=='ready')throw new Error('Mappings unavailable.');
      const available=await moves(current.values,input.key,input.sprintId,saved.values.items);
      const target=available.options.find(o=>o.id===input.transitionId&&o.statusId===input.statusId);
      const mapping=target?.development?(await context(input.key,input.sprintId)).mapping:undefined;
      return await performMove(input,available.options,available.jira.transition,()=>startIssue(paseo,current.values,{...mapping!,autoUpdateJira:false},input.key,undefined,undefined,available.issue.type));
    }finally{moving.delete(input.key);}
  });
  server.handle(prepareBranches,async({key,sprintId},{paseo})=>{
    const {config,mapping}=await context(key,sprintId);
    if(await hasExistingWork(paseo,config,key))return [];
    return prepareIssueBranches(paseo,mapping,key);
  });
  server.handle(startWork,async({key,sprintId,selection},{paseo})=>{
    const {config,mapping,issue}=await context(key,sprintId);
    return startIssue(paseo,config,mapping,key,selection,undefined,issue.type);
  });
  server.handle(readIssueDetails,async({key,sprintId})=>{
    const current=await settings.read();
    if(current.status!=='ready')throw new Error('Connection settings are unavailable.');
    if(current.values.transport==='mcp'){const config=current.values;const board=await mcpBoard(config,sprintId);if(!board.issues.some(i=>i.key===key))throw new Error('This issue is no longer assigned to you in the selected sprint.');const site=parseBoardUrl(config.boardUrl).site;const result=await readMcpIssue(await mcp.ensureConnection({hostId:config.mcpHostId,site}),site,key);if(!result)throw new Error('Issue details are unavailable.');return result.details;}
    const board=await (current.values.transport==='twg'?twgDashboard.fetchBoard(current.values,sprintId):fetchBoard(current.values,sprintId));
    if(!board.issues.some(issue=>issue.key===key))throw new Error('This issue is no longer assigned to you in the selected sprint.');
    if(current.values.transport==='twg'){const result=await twgDashboard.issue(current.values,key);if(!result)throw new Error('Issue details are unavailable.');return result.details;}
    return (await issueSession(current.values,key)).details(sprintId);
  });
  server.handle(workspaceIssueLink,async({workspaceId,candidates},{paseo})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    return savedWorkspaceIssues(paseo,current.values,workspaceId,candidates);
  });
  server.handle(readWorkspaceIssue,async({key})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    if(current.values.transport==='mcp'){const site=parseBoardUrl(current.values.boardUrl).site;return readMcpIssue(await mcp.ensureConnection({hostId:current.values.mcpHostId,site}),site,key);}
    return current.values.transport==='twg'?twgDashboard.issue(current.values,key):fetchWorkspaceIssue(current.values,key);
  });
  server.handle(listComments,async({key,startAt})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    if(current.values.transport==='mcp'){const site=parseBoardUrl(current.values.boardUrl).site;return mcpFiles.comments(await mcp.ensureConnection({hostId:current.values.mcpHostId,site}),site,key,startAt);}
    if(current.values.transport==='twg')return content.comments(current.values,key,startAt);
    const {site,request}=await commentsSession(current.values);return readCommentPage(request,site,key,startAt);
  });
  server.handle(postComment,async({key,markdown,requestId,parentId})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    if(current.values.transport==='mcp'){const config=current.values;assertMcpWrites(config);const site=parseBoardUrl(config.boardUrl).site;const writer=mcpWrites(await mcp.ensureConnection({hostId:config.mcpHostId,site}),site);return postOnce(writer.identity,requestId,JSON.stringify({key,markdown,parentId}),()=>writer.post(key,markdown,parentId));}
    if(current.values.transport==='twg'){assertTwgWrites(current.values);return postOnce(JSON.stringify([current.values.boardUrl,current.values.twgExecutable,current.values.twgProfile,key]),requestId,JSON.stringify({markdown,parentId}),()=>writes.post(current.values,key,markdown,parentId));}
    const {site,request}=await commentsSession(current.values);
    return postOnce(`${site}/${key}`,requestId,JSON.stringify({markdown,parentId}),()=>createComment(request,site,key,markdown,parentId));
  });
  server.handle(readBoard,async({sprintId},{paseo})=>{
    const current=await settings.read();
    if(current.status!=='ready')throw new Error('Connection settings are unavailable. Open Jira Dashboard settings.');
    const board=await (current.values.transport==='mcp'?mcpBoard(current.values,sprintId):current.values.transport==='twg'?twgDashboard.fetchBoard(current.values,sprintId):fetchBoard(current.values,sprintId));
    const savedMappings=await projectMappings.read();
    const workspaceLinks=await boardWorkspaceLinks(paseo,current.values,board.issues.map(issue=>issue.key),savedMappings.status==='ready'?savedMappings.values.items:[]);
    return {...board,...(workspaceLinks.workspaceWarning?{workspaceWarning:workspaceLinks.workspaceWarning}:{}),issues:board.issues.map(issue=>({...issue,linkedWorkspace:workspaceLinks.links[issue.key]}))};
  });
  async function attachmentContext(key?:string){
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    const config=current.values;
    if(config.transport==='mcp'){
     const site=parseBoardUrl(config.boardUrl).site,reader=await mcp.ensureConnection({hostId:config.mcpHostId,site});
     if(key)return mcpFiles.session(reader,site,key);
     assertMcpWrites(config);const writer=mcpWrites(reader,site);
     return {site,identity:writer.identity,uploadSettings:async()=>{await writer.uploadSettings();return publicAttachmentSettings(site);},upload:writer.upload,
      request:async(path:string)=>{const match=/^\/rest\/api\/3\/issue\/([A-Z][A-Z0-9_]*-[1-9]\d*)\?fields=attachment$/.exec(path);if(!match)throw Error('Unsupported MCP attachment read.');return mcpFiles.session(reader,site,match[1]).request(path);}};
    }
    if(config.transport!=='twg')return attachmentsSession(config);
    const session=content.session(config,key??'');
    if(key)return session;
    assertTwgWrites(config);
    return {...session,identity:JSON.stringify([session.site,'twg',config.twgExecutable,config.twgProfile]),
      uploadSettings:()=>publicAttachmentSettings(session.site),
      upload:(issueKey:string,filename:string,bytes:Buffer)=>writes.upload(config,issueKey,filename,bytes)};
  }
  server.handle(listAttachments,async({key})=>attachmentList(await attachmentContext(key),key));
  server.handle(attachmentSettings,async()=>readAttachmentSettings(await attachmentContext()));
  server.handle(readAttachment,async({key,id,offset})=>attachmentBytes(await attachmentContext(key),key,id,offset));
  server.handle(beginUpload,async input=>uploads.begin(await attachmentContext(),input));
  server.handle(uploadChunk,async({uploadId,offset,base64})=>uploads.chunk(uploadId,offset,base64));
  server.handle(finishUpload,async({uploadId})=>uploads.finish(await attachmentContext(),uploadId));
  server.handle(cancelUpload,async({uploadId})=>uploads.cancel(uploadId));
  server.handle(prepareBrowserPreview,async()=>previews.prepare());
  server.handle(loadBrowserPreview,async({key,id,token})=>previews.load(await attachmentContext(key),key,id,token));
  return ()=>{mcpFiles.close();mcp.close();writes.close();content.close();twgDashboard.close();twg.close();uploads.close();previews.close();};
}
