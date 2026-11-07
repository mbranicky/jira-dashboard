import {useState} from 'react';
import {Text,View} from 'react-native';
import {useSettings} from '@getpaseo/plugin/client';
import {connection} from '../shared/contracts';
import type {Relationships} from '../shared/relationships';
import {SectionHeading} from './section-heading';
import {Action,type SettingsTheme} from './settings-ui';
import {openExternal} from './web';
export function IssueRelationships({value,theme}:{value?:Relationships;theme:SettingsTheme}){
 const [expanded,setExpanded]=useState(true);const [error,setError]=useState('');const settings=useSettings(connection);const c=theme.colors;
 async function open(key:string){setError('');try{if(settings.status!=='ready')throw Error();const site=new URL(settings.values.boardUrl);if(site.protocol!=='https:'||!site.hostname.endsWith('.atlassian.net')||site.username||site.password)throw Error();await openExternal(`${site.origin}/browse/${encodeURIComponent(key)}`);}catch{setError('Could not open related issue in Jira.');}}
 return <View style={{gap:8,borderTopWidth:1,borderTopColor:c.border,paddingTop:14}}>
  <SectionHeading theme={theme} title="Related issues and subtasks" expanded={expanded} onPress={()=>setExpanded(!expanded)}/>
  {expanded?<>
   {!value?.complete?<Text style={{color:c.foregroundMuted}}>Some relationship details were not supplied by Jira. Open Jira for the complete list.</Text>:!value.items.length?<Text style={{color:c.foregroundMuted}}>No linked issues or subtasks.</Text>:null}
   {value?.items.map(item=><View key={`${item.relationship}/${item.key}`} style={{gap:4,padding:10,borderRadius:8,backgroundColor:c.surface1}}><Text style={{color:c.foregroundMuted,fontSize:12}}>{item.relationship} · {item.status??'Status unavailable'}</Text><Text selectable style={{color:c.foreground}}>{item.summary}</Text><Action theme={theme} icon="ExternalLink" label={`Open ${item.key} in Jira`} onPress={()=>void open(item.key)}/></View>)}
   {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
  </>:null}
 </View>;
}
