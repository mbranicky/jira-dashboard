import {FocusScope} from './client/focus-scope';
import type {ComponentType} from 'react';
function scoped<P extends object>(Component:ComponentType<P>){return (props:P)=><FocusScope><Component {...props}/></FocusScope>;}
import {WorkspaceIssue,OpenWorkspaceIssue} from './client/workspace-issue';
import { MappingSettings } from './client/mappings';
import type { PluginClientContext, PluginSidebarItemProps } from '@getpaseo/plugin/client';
import { SidebarRow } from '@getpaseo/plugin/client/ui';
import { Dashboard, ConnectionSettings } from './client/dashboard';
function Item({currentScreen,openScreen}:PluginSidebarItemProps){return <SidebarRow icon="Columns3" active={currentScreen?.screenId==='board'} onPress={()=>openScreen({screenId:'board'})}/>;}
export default function contribute(client:PluginClientContext){
  client.addWorkspacePanel({id:'jira-issue',title:'Jira',icon:'FileText',locations:['explorer'],Component:scoped(WorkspaceIssue)});
  client.addCommandCenterItem({id:'jira-issue',context:'workspace',title:'Open workspace Jira issue',icon:'FileText',onSelect:({openPanel})=>openPanel('jira-issue',{location:'explorer'})});
  client.addSettingsScreen({id:'mappings',title:'Jira project mappings',icon:'Folder',Component:scoped(MappingSettings)});
  client.addScreen({id:'mappings',title:'Jira project mappings',Component:scoped(MappingSettings)});
  client.addCommandCenterItem({id:'mappings',context:'global',title:'Jira project mappings',icon:'Folder',onSelect:({openScreen})=>openScreen({screenId:'mappings'})});
  client.addScreen({id:'board',title:'Jira Dashboard',Component:(props)=><FocusScope><OpenWorkspaceIssue.Provider value={workspaceId=>client.openPanel('jira-issue',{workspaceId,location:'explorer'})}><Dashboard {...props}/></OpenWorkspaceIssue.Provider></FocusScope>});
  client.addSidebarHeaderItem({id:'board',title:'Jira Dashboard',Component:scoped(Item)});
  client.addSettingsScreen({id:'connection',title:'Jira connection',icon:'Settings',Component:scoped(ConnectionSettings)});
  client.addCommandCenterItem({id:'open',context:'global',title:'Open Jira Dashboard',icon:'Columns3',onSelect:({openScreen})=>openScreen({screenId:'board'})});
  return ()=>{};
}
