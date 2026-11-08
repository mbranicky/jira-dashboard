import {usePaseo,type PluginScreenProps} from '@getpaseo/plugin/client';
import {useQuery} from '@tanstack/react-query';
import {Text,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {activityKey,activityLabel,readWorkspaceActivity,type ActivityLink,type WorkspaceActivity} from '../shared/workspace-activity';
import {SectionHeading} from './section-heading';
import {Action} from './settings-ui';
import {useState} from 'react';

export function useWorkspaceActivity(hostId:string,links:ActivityLink[]){
 const paseo=usePaseo();const keys=[...new Set(links.map(activityKey))].sort();
 return useQuery({queryKey:['jira-workspace-activity',hostId,keys],queryFn:()=>readWorkspaceActivity(paseo,keys.map(key=>{const [workspaceId,agentId]=JSON.parse(key) as string[];return {workspaceId,agentId:agentId||undefined};})),enabled:!!keys.length,retry:false,refetchInterval:15000,refetchIntervalInBackground:false,staleTime:10000});
}
export function ActivityBadge({value,theme}:{value?:WorkspaceActivity;theme:PluginScreenProps['theme']}){
 if(!value)return null;const c=theme.colors;
 const color=value.state==='failed'?c.statusDanger:value.state==='needs-input'?c.statusWarning:value.state==='working'?c.accent:c.foregroundMuted;
 const icon=value.state==='working'?'Activity':value.state==='needs-input'?'MessageCircleQuestion':value.state==='finished'?'CircleCheck':value.state==='failed'?'CircleAlert':'CircleDot';
 return <View testID="workspace-activity" style={{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:3}}><Icon name={icon} size={12} color={color}/><Text style={{fontSize:11,color}}>{activityLabel(value)}</Text></View>;
}
export function WorkspaceActivityDetails({link,hostId,theme,navigation}:{link?:ActivityLink;hostId:string;theme:PluginScreenProps['theme'];navigation:PluginScreenProps['navigation']}){
 const [expanded,setExpanded]=useState(false);const query=useWorkspaceActivity(hostId,expanded&&link?[link]:[]);
 if(!link)return null;const value=query.data?.[activityKey(link)];
 return <View style={{gap:8,borderTopWidth:1,borderTopColor:theme.colors.border,paddingTop:14}}>
  <SectionHeading theme={theme} icon="Activity" title="Workspace activity" expanded={expanded} onPress={()=>setExpanded(!expanded)}/>
  {expanded?<View style={{gap:8}}>{value?<ActivityBadge value={value} theme={theme}/>:<Text style={{color:theme.colors.foregroundMuted}}>Loading activity…</Text>}
   {value?.updatedAt&&Number.isFinite(Date.parse(value.updatedAt))?<Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>Last activity: {new Date(value.updatedAt).toLocaleString()}</Text>:null}
   <Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>Paseo activity is separate from Jira status. Updated every 15 seconds while visible.</Text>
   {value?.agentId?<Action theme={theme} disabled={!navigation} label="Open agent" icon="Bot" onPress={()=>navigation?.openAgent({agentId:value.agentId!})}/>:<Action theme={theme} disabled={!navigation} label="Open workspace" icon="PanelsTopLeft" onPress={()=>navigation?.openWorkspace({workspaceId:link.workspaceId})}/>}
  </View>:null}
 </View>;
}
