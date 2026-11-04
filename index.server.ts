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
import {fetchProjectStatuses,issueSession,fetchWorkspaceIssue} from './server/jira';
import type { PluginServerContext } from '@getpaseo/plugin/server';
import { prepareBranches,workspaceIssueLink,readWorkspaceIssue,dashboardPreferences,connection, readBoard, readIssueDetails, mappings, startWork } from './shared/contracts';
import { fetchBoard } from './server/jira';
export default function contribute(server:PluginServerContext){
  const twg=twgSettings();
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
    const {mapping,issue}=await validateWork(current.values,saved.values.items,key,sprintId);
    return {config:current.values,mapping,issue};
  }
  server.handle(projectStatuses,async({projectKey,refresh})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure Jira first.');
    return fetchProjectStatuses(current.values,projectKey,refresh);
  });
  server.handle(readMoves,async({key,sprintId})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure Jira first.');
    const saved=await projectMappings.read();if(saved.status!=='ready')throw new Error('Mappings unavailable.');
    return (await availableMoves(current.values,key,sprintId,saved.values.items)).options;
  });
  const moving=new Set<string>();
  server.handle(moveIssue,async(input,{paseo})=>{
    if(moving.has(input.key))throw new Error('A move is already running for this issue.');
    moving.add(input.key);
    try{
      const current=await settings.read();if(current.status!=='ready')throw new Error('Configure Jira first.');
      const saved=await projectMappings.read();if(saved.status!=='ready')throw new Error('Mappings unavailable.');
      const available=await availableMoves(current.values,input.key,input.sprintId,saved.values.items);
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
    const board=await fetchBoard(current.values,sprintId);
    if(!board.issues.some(issue=>issue.key===key))throw new Error('This issue is no longer assigned to you in the selected sprint.');
    return (await issueSession(current.values,key)).details(sprintId);
  });
  server.handle(workspaceIssueLink,async({workspaceId,candidates},{paseo})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    return savedWorkspaceIssues(paseo,current.values,workspaceId,candidates);
  });
  server.handle(readWorkspaceIssue,async({key})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    return fetchWorkspaceIssue(current.values,key);
  });
  server.handle(listComments,async({key,startAt})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    const {site,request}=await commentsSession(current.values);return readCommentPage(request,site,key,startAt);
  });
  server.handle(postComment,async({key,markdown,requestId,parentId})=>{
    const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');
    const {site,request}=await commentsSession(current.values);
    return postOnce(`${site}/${key}`,requestId,JSON.stringify({markdown,parentId}),()=>createComment(request,site,key,markdown,parentId));
  });
  server.handle(readBoard,async({sprintId},{paseo})=>{
    const current=await settings.read();
    if(current.status!=='ready')throw new Error('Connection settings are unavailable. Open Jira Dashboard settings.');
    const board=await fetchBoard(current.values,sprintId);
    const links=await boardWorkspaceLinks(paseo,current.values,board.issues.map(issue=>issue.key));
    return {...board,issues:board.issues.map(issue=>({...issue,linkedWorkspace:links[issue.key]}))};
  });
  async function attachmentContext(){const current=await settings.read();if(current.status!=='ready')throw new Error('Configure the Jira connection first.');return attachmentsSession(current.values);}
  server.handle(listAttachments,async({key})=>attachmentList(await attachmentContext(),key));
  server.handle(attachmentSettings,async()=>readAttachmentSettings(await attachmentContext()));
  server.handle(readAttachment,async({key,id,offset})=>attachmentBytes(await attachmentContext(),key,id,offset));
  server.handle(beginUpload,async input=>uploads.begin(await attachmentContext(),input));
  server.handle(uploadChunk,async({uploadId,offset,base64})=>uploads.chunk(uploadId,offset,base64));
  server.handle(finishUpload,async({uploadId})=>uploads.finish(await attachmentContext(),uploadId));
  server.handle(cancelUpload,async({uploadId})=>uploads.cancel(uploadId));
  server.handle(prepareBrowserPreview,async()=>previews.prepare());
  server.handle(loadBrowserPreview,async({key,id,token})=>previews.load(await attachmentContext(),key,id,token));
  return ()=>{twg.close();uploads.close();previews.close();};
}
