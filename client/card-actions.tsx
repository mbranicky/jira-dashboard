import {useState} from 'react';
import {Text,View} from 'react-native';
import {copyText} from '@getpaseo/plugin/client/ui';
import type {PluginScreenProps} from '@getpaseo/plugin/client';
import {OverlayMenu} from './overlay-menu';
import {IconAction} from './icon-action';
import {Action} from './settings-ui';

export function CardActions({theme,issueKey,jiraUrl,onOpenJira,onOpenWorkspace}:{theme:PluginScreenProps['theme'];issueKey:string;jiraUrl?:string;onOpenJira:()=>void;onOpenWorkspace?:()=>void}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function copy(value:string,label:string){if(busy)return;setBusy(true);setMessage('');try{await copyText(value);setMessage(`${label} copied.`);}catch{setMessage('Could not copy. Please try again.');}finally{setBusy(false);}}
 function close(){setOpen(false);setMessage('');}
 return <OverlayMenu theme={theme} open={open} onOpenChange={value=>{setOpen(value);setMessage('');}} trigger={toggle=><IconAction theme={theme} label={`Actions for ${issueKey}`} icon="Ellipsis" onPress={toggle}/>}>
  <View style={{padding:6,gap:2}}>
   <Action theme={theme} label="Copy issue key" icon="Copy" disabled={busy} onPress={()=>void copy(issueKey,'Issue key')}/>
   {jiraUrl?<Action theme={theme} label="Copy Jira link" icon="Link" disabled={busy} onPress={()=>void copy(jiraUrl,'Jira link')}/>:null}
   <Action theme={theme} label="Open in Jira" icon="ExternalLink" onPress={()=>{close();onOpenJira();}}/>
   {onOpenWorkspace?<Action theme={theme} label="Open workspace" icon="PanelsTopLeft" onPress={()=>{close();onOpenWorkspace();}}/>:null}
   {message?<Text accessibilityLiveRegion="polite" style={{padding:8,fontSize:12,color:theme.colors.foregroundMuted}}>{message}</Text>:null}
  </View>
 </OverlayMenu>;
}
