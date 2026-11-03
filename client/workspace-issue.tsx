import {IssueFields} from './issue-fields';
import {JiraContent} from './jira-content';
import {SectionHeading} from './section-heading';
import {useState} from 'react';
import {IssueAttachments} from './attachments';
import {IssueComments} from './comments';
import {createContext,useEffect} from 'react';
import {usePaseo,useRpc,useWorkspace,type PluginWorkspacePanelProps} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useQuery} from '@tanstack/react-query';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {workspaceIssueLink,readWorkspaceIssue} from '../shared/contracts';
import {detectIssue,issueKeys} from '../shared/issue-detection';
import {openExternal} from './web';

export const OpenWorkspaceIssue=createContext<(workspaceId:string)=>void>(()=>{});
export function WorkspaceIssue({workspaceId,theme,host}:PluginWorkspacePanelProps){
 const [descriptionExpanded,setDescriptionExpanded]=useState(true);
 const c=theme.colors;const paseo=usePaseo();
 const workspace=useWorkspace(workspaceId,w=>({name:w.name,title:w.title}));
 const links=useRpc(workspaceIssueLink);const read=useRpc(readWorkspaceIssue);
 const agents=useQuery({queryKey:['jira-workspace-agents',workspaceId],queryFn:async()=>{
  const names:string[]=[];let cursor:string|undefined;const seen=new Set<string>();
  for(let page=0;page<1000;page++){
   const result=await paseo.agents.list({filter:{includeArchived:false},page:{limit:100,...(cursor?{cursor}:{})}});
   for(const entry of result.entries){if(entry.agent.workspaceId===workspaceId&&entry.agent.title)names.push(entry.agent.title);}
   if(!result.pageInfo.hasMore)return names;
   const next=result.pageInfo.nextCursor;
   if(!next||seen.has(next))throw new Error('Could not load all workspace agents.');
   seen.add(next);cursor=next;
  }
  throw new Error('Too many agents to resolve this workspace.');
 },retry:false,refetchInterval:30000});
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const stop=paseo.agents.subscribe(()=>{if(!timer)timer=setTimeout(()=>{timer=undefined;void agents.refetch();},1000);});
  return ()=>{stop();if(timer)clearTimeout(timer);};
 },[paseo,workspaceId,agents.refetch]);
 const names=[workspace?.name??'',workspace?.title??''];
 const candidates=issueKeys([...names,...(agents.data??[])]).sort();
 const saved=useQuery({queryKey:['jira-workspace-link',workspaceId,candidates],queryFn:()=>links({workspaceId,candidates}),enabled:!!workspace&&agents.isSuccess,retry:false});
 const detected=detectIssue(saved.data??[],names,agents.data??[]);
 const key=detected.status==='found'?detected.key:undefined;
 const issue=useQuery({queryKey:['jira-workspace-issue',key],queryFn:()=>read({key:key!}),enabled:saved.isSuccess&&!!key,retry:false,staleTime:60000});
 const error=agents.error??saved.error??issue.error;
 const loading=!workspace||agents.isPending||saved.isPending||(!!key&&issue.isPending);
 const data=issue.data;
 const refresh=()=>{void agents.refetch();void saved.refetch();if(key)void issue.refetch();};
 const button=(label:string,icon:'RefreshCw'|'ExternalLink',onPress:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>({width:34,height:44,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:pressed?c.surface2:'transparent',transform:[{scale:pressed?.96:1}]})}><Icon name={icon} size={17} color={c.foregroundMuted}/></Pressable>;
 return <View style={{flex:1,minWidth:0,backgroundColor:c.surface0}}>
  <View style={{flexDirection:'row',alignItems:'center',paddingLeft:16,paddingRight:4,borderBottomWidth:1,borderBottomColor:c.border,gap:8}}><Icon name="FileText" size={16} color={c.accent}/><Text style={{flex:1,color:c.foreground,fontSize:13,fontWeight:'600'}}>{data&&!error&&!loading?data.issue.key:'Jira issue'}</Text><View style={{flexDirection:'row',alignItems:'center',gap:0}}>{data&&!error&&!loading?button('Open in Jira','ExternalLink',()=>void openExternal(`${data.site}/browse/${data.issue.key}`)):null}{button('Refresh Jira issue','RefreshCw',refresh)}</View></View>
  <ScrollView key={key??workspaceId} style={{flex:1}} contentContainerStyle={{padding:16,gap:18,alignItems:'stretch'}}>
   {error?<Text accessibilityRole="alert" style={{color:c.statusDanger,fontSize:13,lineHeight:20}}>{error.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,'')}</Text>:loading?<Text style={{color:c.foregroundMuted}}>Loading Jira issue…</Text>:detected.status==='ambiguous'?<Text style={{color:c.foregroundMuted,lineHeight:20}}>Multiple Jira issue keys found. This workspace’s issue is ambiguous.</Text>:!data?<Text style={{color:c.foregroundMuted}}>No Jira issue found.</Text>:<>
    <Text selectable style={{color:c.foreground,fontSize:18,lineHeight:25,fontWeight:'600'}}>{data.issue.summary}</Text>
    <View style={{gap:8}}><Text style={{color:c.accent,fontSize:12,fontWeight:'600'}}>{data.issue.status}</Text><Text style={{color:c.foregroundMuted,fontSize:12}}>{data.issue.type} · {data.issue.priority??'No priority'}</Text></View>
    <View style={{gap:10}}><View style={{flexDirection:'row'}}><SectionHeading title="Description" theme={theme} expanded={descriptionExpanded} onPress={()=>setDescriptionExpanded(!descriptionExpanded)}/></View><View style={{display:descriptionExpanded?'flex':'none',gap:10}}><JiraContent blocks={data.details.richDescription??[]} theme={theme}/></View></View>
    <View style={{borderTopWidth:1,borderTopColor:c.border,paddingTop:16,gap:16}}><Text style={{color:c.foreground,fontWeight:'600',fontSize:14}}>Jira fields</Text><IssueFields issue={data.issue} details={data.details} theme={theme}/></View>
    <IssueAttachments issueKey={data.issue.key} hostId={host.id} theme={theme}/><IssueComments issueKey={data.issue.key} hostId={host.id} theme={theme}/>
   </>}
  </ScrollView>
 </View>;
}
