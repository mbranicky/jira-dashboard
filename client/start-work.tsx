import {useStartWorkState} from './start-work-state';
import {radii} from './radii';
import {Action} from './settings-ui';
import {Tooltip} from './tooltip';
import {FocusScope} from './focus-scope';
import {OpenWorkspaceIssue} from './workspace-issue';
import {useRpc, type PluginScreenProps} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useState,useContext,type ReactNode} from 'react';
import {Modal,ScrollView,ActivityIndicator,Pressable,Text,View,useWindowDimensions} from 'react-native';
import {prepareBranches,startWork} from '../shared/contracts';

type Props=Pick<PluginScreenProps,'theme'|'navigation'> & {linkedWorkspace?:{workspaceId:string;agentId?:string};canStart:boolean;mappingReady:boolean;onConfigureMapping?:()=>void;issueKey:string;sprintId:number;onStarted:()=>void;footer:ReactNode;showLabel?:boolean;dense?:boolean};
export function StartWork({linkedWorkspace,canStart,theme,navigation,issueKey,mappingReady,onConfigureMapping,sprintId,onStarted,footer,showLabel=false,dense=false}:Props){
  const compact=useWindowDimensions().width<760;
  const openIssue=useContext(OpenWorkspaceIssue);
  const start=useRpc(startWork);const prepare=useRpc(prepareBranches);
  const [choices,setChoices]=useState<{id:string;branch:string;path?:string}[]>([]);
  const [tip,setTip]=useState(false);
  const operation=useStartWorkState(issueKey),busy=operation.busy;
  const [error,setError]=useState('');
  const result=linkedWorkspace??operation.result;
  const configure=result?undefined:onConfigureMapping;
  const text={color:theme.colors.foreground};
  const errorText=(e:unknown)=>e instanceof Error?e.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,''):'Could not start work. Please retry.';
  async function execute(selection?:string,alreadyAcquired=false){
    if(!alreadyAcquired&&!operation.acquire())return;setError('');
    try{const value=await start({key:issueKey,sprintId,selection});setChoices([]);operation.complete(value);onStarted();
      if(value.warning)setError(value.warning);
      if(!value.warning)navigation?.openAgent({agentId:value.agentId});
      openIssue(value.workspaceId);
    }catch(e){setError(errorText(e));}
    finally{operation.finish();}
  }
  async function prepareWork(){
    if(!operation.acquire())return;setError('');
    try{const options=await prepare({key:issueKey,sprintId});
      if(options.length>1){setChoices(options);operation.finish();}
      else await execute(options[0]?.id,true);
    }catch(e){setError(errorText(e));operation.finish();}
  }
  return <View style={{gap:8}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:0}}>
      {footer}
      {(canStart||result)?<View style={{position:'relative'}}>
        {tip&&!showLabel?<Tooltip theme={theme} text={configure?'Configure mapping':result?'Open workspace':busy?'Starting…':'Start work'}/>:null}
        <Pressable aria-busy={busy} accessibilityRole="button" accessibilityLabel={`${configure?'Configure mapping for':result?'Open workspace':busy?'Starting':'Start work'} ${issueKey}`} accessibilityHint={configure?'Set up the Jira project mapping before starting work':result?'Open the linked agent':'Create or reuse a workspace and agent for this issue'} accessibilityState={{disabled:busy||(!configure&&!navigation)||(!result&&!mappingReady),busy}} disabled={busy||(!configure&&!navigation)||(!result&&!mappingReady)}
          onHoverIn={()=>setTip(true)} onHoverOut={()=>setTip(false)} onFocus={()=>setTip(true)} onBlur={()=>setTip(false)} onLongPress={()=>setTip(true)}
          onPress={()=>{
            setTip(false);
            if(configure){configure();return;}
            if(result){navigation?.openWorkspace({workspaceId:result.workspaceId});openIssue(result.workspaceId);return;}
            void prepareWork();
          }}
          style={({pressed})=>({width:showLabel?undefined:dense&&!compact?34:44,minHeight:(showLabel||dense)&&!compact?34:44,paddingHorizontal:showLabel?12:0,flexDirection:'row',gap:8,borderRadius:radii.control,alignItems:'center',justifyContent:'center',backgroundColor:showLabel?theme.colors.accent:pressed?theme.colors.surface2:'transparent',opacity:busy||(!configure&&!navigation)||(!result&&!mappingReady)?.5:1,transform:[{scale:pressed?.96:1}]})}>
          <View style={{width:showLabel?18:30,height:showLabel?18:30,borderRadius:radii.control,backgroundColor:configure?theme.colors.surface2:theme.colors.accent,alignItems:'center',justifyContent:'center'}}>{busy?<ActivityIndicator color={theme.colors.accentForeground} size="small"/>:<Icon name={configure?'FolderGit2':result?'ArrowUpRight':'Play'} size={16} color={configure?theme.colors.accent:theme.colors.accentForeground}/>}</View>
          {showLabel?<Text style={{color:theme.colors.accentForeground,fontSize:14}}>{configure?'Configure mapping':result?'Open workspace':busy?'Starting…':'Start work'}</Text>:null}
        </Pressable>
      </View>:null}
    </View>
    {choices.length||error?<Modal visible transparent animationType="fade" onRequestClose={()=>{if(!busy){setChoices([]);setError('');}}}><FocusScope>
      <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:20,backgroundColor:'rgba(0,0,0,.6)'}}>
       <View accessibilityViewIsModal style={{width:'100%',maxWidth:560,maxHeight:'85%',backgroundColor:theme.colors.surface0,borderRadius:radii.overlay,padding:20,gap:12}}>
        <Text style={{...text,fontSize:18,fontWeight:'600'}}>{choices.length?'Choose existing work':'Start work'} · {issueKey}</Text>
        {error?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{error}</Text>:null}
        <ScrollView contentContainerStyle={{gap:8}}>{choices.map(choice=><Pressable key={choice.id} accessibilityRole="button" disabled={busy} onPress={()=>void execute(choice.id)} style={{padding:14,minHeight:44,borderRadius:radii.control,backgroundColor:theme.colors.surface2}}>
         <Text style={text}>{choice.branch}</Text><Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>{choice.path??'Reuse branch in a new worktree'}</Text>
        </Pressable>)}</ScrollView>
        <View style={{flexDirection:'row',justifyContent:'flex-end',gap:8}}>
          <Action theme={theme} icon="X" label="Close" disabled={busy} onPress={()=>{setChoices([]);setError('');}}/>
          {error&&!result&&!choices.length?<Action theme={theme} icon="RotateCw" primary label="Retry start" disabled={busy} onPress={()=>void prepareWork()}/>:null}
        </View>
       </View>
      </View>
    </FocusScope></Modal>:null}
  </View>;
}
