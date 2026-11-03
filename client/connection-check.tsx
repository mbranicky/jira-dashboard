import {useState} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import {useRpc} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {z} from 'zod';
import {testConnection,type connectionCheckResult} from '../shared/connection-check';
import {Action,type SettingsTheme} from './settings-ui';
export function ConnectionCheck({theme,boardUrl,envPath}:{theme:SettingsTheme;boardUrl:string;envPath:string}){
 const check=useRpc(testConnection);const [busy,setBusy]=useState(false);const [result,setResult]=useState<z.infer<typeof connectionCheckResult>>();const [error,setError]=useState('');
 const c=theme.colors;
 return <View style={{gap:8}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Action theme={theme} icon="PlugZap" label={busy?'Checking…':'Test connection'} disabled={busy||!boardUrl.trim()||!envPath.trim()} onPress={()=>{setBusy(true);setError('');setResult(undefined);void check({boardUrl,envPath}).then(setResult).catch(e=>setError(e.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,''))).finally(()=>setBusy(false));}}/>{busy?<ActivityIndicator size="small" color={c.accent}/>:null}</View>
  {result?<View accessibilityLiveRegion="polite" style={{gap:10,padding:14,borderRadius:10,backgroundColor:c.surface2}}>
   <Text style={{color:result.ok?c.foreground:c.statusDanger,fontWeight:'600'}}>{result.ok?'Read connection verified':'Connection needs attention'}</Text>
   {result.steps.map(step=><View key={step.label} style={{flexDirection:'row',alignItems:'flex-start',gap:8}}><Icon name={step.state==='passed'?'Check':step.state==='failed'?'CircleAlert':'Minus'} size={16} color={step.state==='failed'?c.statusDanger:c.foregroundMuted}/><View style={{flex:1,gap:2}}><Text style={{color:c.foreground,fontSize:13,fontWeight:'600'}}>{step.label}</Text><Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>{step.message}</Text></View></View>)}
   <Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>Read-only check of the values above. Settings are not saved. Comment, attachment, and transition permissions are not tested.</Text>
  </View>:null}
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
 </View>;
}
