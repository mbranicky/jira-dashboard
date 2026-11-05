import {ConnectionCheckResult} from './connection-check';
import type {connectionCheckResult} from '../shared/connection-check';
import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,Switch,Text,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useRpc} from '@getpaseo/plugin/client';
import type {z} from 'zod';
import {mcpTestConnection,mcpStart,mcpStatus,mcpCancel,mcpDisconnect,mcpState} from '../shared/mcp';
import {SectionTitle,type SettingsTheme} from './settings-ui';
import {openExternal} from './web';

export function McpSettings({theme,hostId,boardUrl,writeAccess=false}:{theme:SettingsTheme;hostId:string;boardUrl:string;writeAccess?:boolean}){
 let site='';try{site=new URL(boardUrl).origin;}catch{}
 return <McpConnection key={`${hostId}:${boardUrl}`} theme={theme} hostId={hostId} site={site} boardUrl={boardUrl} writeAccess={writeAccess}/>;
}
function McpConnection({theme,hostId,site,boardUrl,writeAccess}:{theme:SettingsTheme;hostId:string;site:string;boardUrl:string;writeAccess:boolean}){
 const test=useRpc(mcpTestConnection);
 const [checking,setChecking]=useState(false),[report,setReport]=useState<z.infer<typeof connectionCheckResult>>();
 const status=useRpc(mcpStatus),start=useRpc(mcpStart),cancel=useRpc(mcpCancel),disconnect=useRpc(mcpDisconnect);
 const [state,setState]=useState<z.infer<typeof mcpState>>({state:'idle',message:'Sign in or check a saved MCP connection.'});
 const [reauthorizing,setReauthorizing]=useState(false);
 const [confirmed,setConfirmed]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const operation=useRef(0),working=useRef(false);
 const alive=useRef(true),active=useRef<string|undefined>(undefined);
 const target={hostId,site};const valid=mcpStatus.input.safeParse(target).success;
 const busy=checking||pending||['connecting','authorizing','disconnecting'].includes(state.state);
 const accept=(next:z.infer<typeof mcpState>)=>{active.current=['connecting','authorizing'].includes(next.state)?next.id:undefined;if(alive.current)setState(next);};
 useEffect(()=>{
  alive.current=true;let stopped=false;let timer:ReturnType<typeof setTimeout>;
  const refresh=async()=>{const version=operation.current;try{const next=await status({hostId,site});if(!stopped){if(version===operation.current&&!working.current)accept(next);timer=setTimeout(refresh,1000);}}catch{if(!stopped)setError('Unable to check MCP progress. Reopen settings to retry.');}};
  if(valid)void refresh();
  return()=>{stopped=true;alive.current=false;clearTimeout(timer);if(active.current)void cancel({hostId,site,id:active.current}).catch(()=>{});};
 },[hostId,site,valid,status,cancel]);
 async function run(action:'signin'|'disconnect'|'cancel'){
  operation.current++;working.current=true;setPending(true);setError('');setReport(undefined);
  try{
   const next=action==='disconnect'?await disconnect(target):action==='cancel'&&active.current?await cancel({...target,id:active.current}):await start({...target,authorize:action==='signin',writeAccess:action==='signin'&&writeAccess,browserOnHost:confirmed});
   if(alive.current){accept(next);setReauthorizing(false);}else if(next.id&&['connecting','authorizing'].includes(next.state))void cancel({...target,id:next.id}).catch(()=>{});
  }catch{if(alive.current)setError('Unable to complete this action. Check whether another MCP operation is running, then retry.');}
  finally{working.current=false;if(alive.current)setPending(false);}
 }
 async function testAccess(){
  setChecking(true);setReport(undefined);setError('');
  try{const result=await test({hostId,boardUrl});if(alive.current)setReport(result);}
  catch{if(alive.current)setError('Unable to complete the connection test. Retry after the current MCP operation finishes.');}
  finally{if(alive.current)setChecking(false);}
 }
 const c=theme.colors;
 const connected=state.state==='connected'&&!reauthorizing;
 const authorizing=state.state==='authorizing'&&!!state.authorizationUrl;
 const statusTitle=checking?'Checking access…':connected?'Connected':authorizing?'Finish signing in':busy?'Connecting…':state.state==='failed'?'Connection needs attention':'Connect your account';
 return <View accessibilityLabel="Atlassian MCP connection" style={{padding:16,gap:16,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.surface1}}>
  <SectionTitle theme={theme} icon="ShieldCheck" title="Atlassian MCP" description="Secure sign-in through your Atlassian account."/>
  <View style={{backgroundColor:c.surface0,borderRadius:10,padding:14,gap:8}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
    {busy?<ActivityIndicator size="small" color={c.accent}/>:<Icon name={connected?'CircleCheck':state.state==='failed'?'CircleAlert':'Link'} size={17} color={connected?c.statusSuccess:state.state==='failed'?c.statusDanger:c.foregroundMuted}/>}
    <Text style={{color:c.foreground,fontWeight:'600',fontSize:14}}>{statusTitle}</Text>
   </View>
   {connected?<View style={{gap:4}}><Text style={{color:c.foreground,fontSize:13}}>{state.account}</Text><Text selectable accessibilityLabel="Atlassian account ID" style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>{state.accountId}</Text></View>:
    <Text accessibilityRole={state.state==='failed'?'alert':undefined} style={{color:state.state==='failed'?c.statusDanger:c.foregroundMuted,fontSize:13,lineHeight:19}}>{authorizing?'Complete authorization in the browser on your Paseo host. This panel will update automatically.':busy?state.message:state.state==='failed'?state.message:'Sign in here, or restore a connection saved on this host.'}</Text>}
  </View>
  {connected&&writeAccess&&!state.writeAccess?<Text style={{color:c.foregroundMuted,fontSize:12}}>Reconnect MCP and sign in to authorize Jira changes. Your saved read access is kept until authorization succeeds.</Text>:null}
  {!busy&&!connected?<View style={{gap:8}}>
   <View style={{flexDirection:'row',gap:12,alignItems:'center',minHeight:40}}><Text style={{flex:1,color:c.foreground,fontSize:13}}>I will complete sign-in on the Paseo host</Text><Switch accessibilityLabel="Complete MCP sign-in on the Paseo host" value={confirmed} onValueChange={setConfirmed}/></View>
   <Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>On a phone or remote device, sign in from Settings on the host computer.</Text>
  </View>:null}
  {!valid?<Text style={{color:c.statusDanger,fontSize:13}}>Enter a valid Jira Cloud board URL above.</Text>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}>
   {authorizing?<McpAction theme={theme} icon="ExternalLink" label="Continue in browser" primary onPress={()=>void openExternal(state.authorizationUrl!).catch(()=>setError('Could not open the browser. Retry from Settings on the Paseo host.'))}/>:null}
   {busy?<>{active.current?<McpAction theme={theme} icon="X" label="Cancel sign-in" disabled={pending} onPress={()=>void run('cancel')}/>:null}</>:<>
    {connected?<McpAction theme={theme} icon="RefreshCw" label="Reconnect MCP" onPress={()=>{setConfirmed(false);setReauthorizing(true);}}/>:<McpAction theme={theme} icon="LogIn" label="Sign in to Atlassian" primary disabled={!valid||!confirmed} onPress={()=>void run('signin')}/>}
    <McpAction theme={theme} icon="PlugZap" label="Test connection" disabled={!valid||!boardUrl.trim()} onPress={()=>void testAccess()}/>
    <McpAction theme={theme} icon="Unplug" label="Disconnect MCP" danger disabled={!valid} onPress={()=>void run('disconnect')}/>
   </>}
  </View>
  {report?<ConnectionCheckResult theme={theme} result={report}/>:null}
  <Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>Credentials are stored securely on this host. Dashboard access uses the connection selected above.</Text>
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger,fontSize:13,lineHeight:19}}>{error}</Text>:null}
 </View>;
}
function McpAction({theme,label,icon,onPress,primary=false,danger=false,disabled=false}:{theme:SettingsTheme;label:string;icon:string;onPress:()=>void;primary?:boolean;danger?:boolean;disabled?:boolean}){
 const c=theme.colors,color=primary?c.accentForeground:danger?c.statusDanger:c.foreground;
 return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:40,paddingHorizontal:12,paddingVertical:9,borderRadius:8,borderWidth:1,borderColor:primary?c.accent:c.border,backgroundColor:primary?c.accent:pressed?c.surface2:'transparent',flexDirection:'row',alignItems:'center',gap:7,opacity:disabled?.5:1,transform:[{scale:pressed?.96:1}]})}><Icon name={icon} size={16} color={color}/><Text style={{color,fontSize:13,fontWeight:'600'}}>{label}</Text></Pressable>;
}
