import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Text,TextInput,View} from 'react-native';
import {useRpc} from '@getpaseo/plugin/client';
import type {z} from 'zod';
import {twgStart,twgPoll,twgCancel,twgState,twgTarget} from '../shared/twg';
import {Action,SectionTitle,type SettingsTheme} from './settings-ui';
export function TwgSettings({theme,boardUrl,executable:path,profile,onChange}:{theme:SettingsTheme;boardUrl:string;executable:string;profile:string;onChange:(path:string,profile:string)=>void}) {
 const start=useRpc(twgStart),poll=useRpc(twgPoll),cancel=useRpc(twgCancel);
 const [job,setJob]=useState<z.infer<typeof twgState>>(),[starting,setStarting]=useState(false),[error,setError]=useState('');
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
  try{const next=await start({action,executable:path.trim(),site,profile,...(boardId?{boardId}:{})});active.current=next.id;if(mounted.current)setJob(next);else{void cancel({id:next.id}).catch(()=>{});}}
  catch{if(mounted.current)setError('Unable to start TWG. Use twg or an absolute executable path, and check whether another operation is running.');}
  finally{if(mounted.current)setStarting(false);}
 };
 const boardId=Number(boardUrl.match(/\/boards\/(\d+)\/?(?:[?#].*)?$/)?.[1])||undefined;
 let site='';try{site=new URL(boardUrl).origin;}catch{}
 const target=twgTarget.safeParse({site,profile});
 const busy=starting||job?.state==='running';const c=theme.colors;
 return <View style={{gap:12,padding:16,borderWidth:1,borderColor:c.border,borderRadius:16,backgroundColor:c.surface1}}>
  <SectionTitle theme={theme} icon="Terminal" title="TWG CLI · experimental" description="Sign in from a terminal on your Paseo host, then check CLI access here. Enable TWG above to load the dashboard through TWG."/>
  <Text style={{color:c.foregroundMuted,fontSize:13,lineHeight:19}}>On your desktop, open a terminal on the Paseo host and run twg login. Complete browser consent, then return here to test access. No token needs to be pasted here.</Text>
  <Text style={{color:c.foreground}}>TWG executable on host</Text>
  <TextInput accessibilityLabel="TWG executable on host" value={path} editable={!busy} autoCapitalize="none" autoCorrect={false} onChangeText={value=>{onChange(value,profile);setJob(undefined);setError('');}} style={{color:c.foreground,borderWidth:1,borderColor:c.border,borderRadius:8,padding:12}}/>
  <Text style={{color:c.foregroundMuted,fontSize:12}}>Save connection stores the executable and profile on this host.</Text>
  <Text style={{color:c.foreground}}>TWG profile</Text>
  <TextInput accessibilityLabel="TWG profile" value={profile} editable={!busy} autoCapitalize="none" autoCorrect={false} onChangeText={value=>{onChange(path,value);setJob(undefined);setError('');}} style={{color:c.foreground,borderWidth:1,borderColor:c.border,borderRadius:8,padding:12}}/>
  <Text style={{color:c.foregroundMuted}}>Jira site: {site||'Enter a board URL above'}</Text>
  {!target.success?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>Enter a valid Jira Cloud board URL and TWG profile name.</Text>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}>
   <Action theme={theme} icon="PlugZap" label="Test TWG access" disabled={busy||!path.trim()||!target.success} onPress={()=>void run('check')}/>
   {busy?<ActivityIndicator color={c.accent}/>:null}
   {job?.state==='running'?<Action theme={theme} icon="X" label="Cancel TWG operation" onPress={()=>void cancel({id:job.id}).then(next=>{setJob(next);active.current=undefined;}).catch(()=>setError('Unable to cancel. Retry or wait for the operation timeout.'))}/>:null}
  </View>
  {job?<Text accessibilityLiveRegion="polite" style={{color:job.state==='failed'?c.statusDanger:c.foregroundMuted}}>{job.message}</Text>:null}
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
 </View>;
}
