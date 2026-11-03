import {useRpc,useSettings,type PluginSurfaceProps} from '@getpaseo/plugin/client';
import {useQuery} from '@tanstack/react-query';
import {View,Text} from 'react-native';
import {ResponsiveSelect} from './responsive-select';
import {Action} from './settings-ui';
import {projectStatuses} from '../shared/moves';
import {connection} from '../shared/contracts';
export function StartStatusSelect({projectKey,value,legacyStatusId,onChange,theme,compact}:{projectKey:string;value?:string;legacyStatusId?:string;onChange:(id:string)=>void;theme:PluginSurfaceProps['theme'];compact:boolean}){
 const rpc=useRpc(projectStatuses),settings=useSettings(connection);
 const enabled=/^[A-Z][A-Z0-9_]*$/.test(projectKey)&&settings.status==='ready';
 const query=useQuery({queryKey:['jira-project-statuses',settings.status==='ready'?settings.revision:'',projectKey],queryFn:()=>rpc({projectKey}),enabled,retry:false,staleTime:60000});
 const selected=value??query.data?.find(s=>s.statusIds?.includes(legacyStatusId??''))?.id??'';
 const missing=!!selected&&!!query.data&&!query.data.some(s=>s.id===selected);
 return <View style={{gap:8}}>
 <ResponsiveSelect theme={theme} compact={compact} label="Start work on move to column" value={selected} options={[
 {value:'',label:'Do not start work on moves'},
 ...(selected&&!query.data?.some(s=>s.id===selected)?[{value:selected,label:missing?'Previously selected column (unavailable)':selected.split('/')[0].trim().toUpperCase()}]:[]),
 ...(query.data??[]).map(s=>({value:s.id,label:s.name.split('/')[0].trim().toUpperCase()}))
 ]} onValueChange={onChange}/>
 <Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>Choose a board column. Moving an issue into this column starts or reuses its workspace and agent after Jira confirms the transition. Play creates the workspace and agent without changing Jira.</Text>
 {!enabled?<Text style={{color:theme.colors.foregroundMuted}}>Enter the Jira project key to load board columns.</Text>:query.isFetching?<Text style={{color:theme.colors.foregroundMuted}}>Loading board columns…</Text>:null}
 {query.error?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{query.error.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,'')}</Text>:null}
 {missing?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>This column is no longer on the configured board. Choose another column or disable the trigger.</Text>:null}
 {enabled?<Action theme={theme} icon="RefreshCw" label="Refresh columns" disabled={query.isFetching} onPress={()=>void rpc({projectKey,refresh:true}).then(()=>query.refetch()).catch(()=>query.refetch())}/>:null}
 </View>;
}
