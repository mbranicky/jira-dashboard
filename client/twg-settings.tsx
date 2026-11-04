import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Text,TextInput,View} from 'react-native';
import {useRpc} from '@getpaseo/plugin/client';
import type {z} from 'zod';
import {twgStart,twgPoll,twgCancel,twgState} from '../shared/twg';
import {Action,SectionTitle,type SettingsTheme} from './settings-ui';
export function TwgSettings({theme}:{theme:SettingsTheme}) {
 const start=useRpc(twgStart),poll=useRpc(twgPoll),cancel=useRpc(twgCancel);
 const [path,setPath]=useState('twg'),[job,setJob]=useState<z.infer<typeof twgState>>(),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true);const active=useRef<string|undefined>(undefined);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(active.current)void cancel({id:active.current}).catch(()=>{});};},[cancel]);
 useEffect(()=>{
  if(job?.state!=='running')return;
  let stopped=false;let timer:ReturnType<typeof setTimeout>;
  const tick=async()=>{try{const next=await poll({id:job.id});if(!stopped){setJob(next);if(next.state==='running')timer=setTimeout(tick,1000);else active.current=undefined;}}catch{if(!stopped)setError('Unable to check progress. Cancel and retry.');}};
  timer=setTimeout(tick,1000);return()=>{stopped=true;clearTimeout(timer);};
 },[job?.id,job?.state,poll]);
 const run=async(action:'login'|'check')=>{
  setStarting(true);setError('');setJob(undefined);
  try{const next=await start({action,executable:path.trim()});active.current=next.id;if(mounted.current)setJob(next);else{void cancel({id:next.id}).catch(()=>{});}}
  catch{if(mounted.current)setError('Unable to start TWG. Use twg or an absolute executable path, and check whether another operation is running.');}
  finally{if(mounted.current)setStarting(false);}
 };
 const busy=starting||job?.state==='running';const c=theme.colors;
 return <View style={{gap:12,padding:16,borderWidth:1,borderColor:c.border,borderRadius:16,backgroundColor:c.surface1}}>
  <SectionTitle theme={theme} icon="Terminal" title="TWG CLI · experimental" description="Test browser OAuth on this Paseo host. The dashboard continues to use the REST connection above."/>
  <Text style={{color:c.foregroundMuted,fontSize:13,lineHeight:19}}>Use your desktop for sign-in: the browser opens on the host, not this phone. No token needs to be pasted here.</Text>
  <Text style={{color:c.foreground}}>TWG executable on host</Text>
  <TextInput accessibilityLabel="TWG executable on host" value={path} editable={!busy} autoCapitalize="none" autoCorrect={false} onChangeText={value=>{setPath(value);setJob(undefined);setError('');}} style={{color:c.foreground,borderWidth:1,borderColor:c.border,borderRadius:8,padding:12}}/>
  <Text style={{color:c.foregroundMuted,fontSize:12}}>Path is used for this check only; it is not saved.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}>
   <Action theme={theme} icon="LogIn" label="Sign in with TWG" disabled={busy||!path.trim()} onPress={()=>void run('login')}/>
   <Action theme={theme} icon="PlugZap" label="Test TWG access" disabled={busy||!path.trim()} onPress={()=>void run('check')}/>
   {busy?<ActivityIndicator color={c.accent}/>:null}
   {job?.state==='running'?<Action theme={theme} icon="X" label="Cancel TWG operation" onPress={()=>void cancel({id:job.id}).then(next=>{setJob(next);active.current=undefined;}).catch(()=>setError('Unable to cancel. Retry or wait for the operation timeout.'))}/>:null}
  </View>
  {job?<Text accessibilityLiveRegion="polite" style={{color:job.state==='failed'?c.statusDanger:c.foregroundMuted}}>{job.message}</Text>:null}
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
 </View>;
}
