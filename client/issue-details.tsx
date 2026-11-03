import {DetailsPanel} from './details-panel';
import {IssueFields} from './issue-fields';
import {Tooltip} from './tooltip';
import {StartWork} from './start-work';
import {canStartWork} from '../shared/work-eligibility';
import {JiraContent} from './jira-content';
import {SectionHeading} from './section-heading';
import {useState} from 'react';
import {IssueAttachments} from './attachments';
import {IssueComments} from './comments';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useRpc,type PluginScreenProps} from '@getpaseo/plugin/client';
import {useQuery} from '@tanstack/react-query';
import {Modal as NativeModal,SafeAreaView,KeyboardAvoidingView,Platform,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import type {ReactNode} from 'react';
import {readIssueDetails,type Issue} from '../shared/contracts';
import {Action} from './settings-ui';
export function IssueDetails({issue,sprintId,theme,onClose,onOpenJira,hostId,navigation,mappingReady,onConfigureMapping,onStarted,presentation='modal',panelWidth=480,panelCollapsed=false,onTogglePanel=onClose,onResizePanel=()=>{}}:{presentation?:'modal'|'panel'|'fullscreen';panelWidth?:number;panelCollapsed?:boolean;onTogglePanel?:()=>void;onResizePanel?:(width:number)=>void;navigation:PluginScreenProps['navigation'];mappingReady:boolean;onConfigureMapping?:()=>void;onStarted:()=>void;hostId:string;issue:Issue;sprintId:number;theme:PluginScreenProps['theme'];onClose:()=>void;onOpenJira:()=>void}){
 const [descriptionExpanded,setDescriptionExpanded]=useState(true);
 const [jiraTip,setJiraTip]=useState(false);
 const read=useRpc(readIssueDetails);
 const query=useQuery({queryKey:['jira-issue-details',issue.key,sprintId],queryFn:()=>read({key:issue.key,sprintId}),retry:false});
 const c=theme.colors;
 const {width}=useWindowDimensions();const wide=presentation==='modal'&&width>=760;
 return <DetailsShell panelCollapsed={panelCollapsed} onTogglePanel={onTogglePanel} onResizePanel={onResizePanel} presentation={presentation} panelWidth={panelWidth} issueKey={issue.key} theme={theme} onClose={onClose}>
  <Text selectable style={{color:c.foreground,fontSize:22,lineHeight:29,fontWeight:'700'}}>{issue.summary}</Text>
  <StartWork linkedWorkspace={issue.linkedWorkspace} canStart={canStartWork(issue)} mappingReady={mappingReady} onConfigureMapping={onConfigureMapping} theme={theme} navigation={navigation} issueKey={issue.key} sprintId={sprintId} onStarted={onStarted} footer={
   <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8,flex:1,minWidth:0}}><View style={{paddingHorizontal:10,paddingVertical:6,borderRadius:6,backgroundColor:c.surface2}}><Text style={{color:c.foreground,fontSize:13}}>{issue.status}</Text></View><Text style={{color:c.foregroundMuted,fontSize:13}}>{issue.type} · {issue.priority??'No priority'}</Text><View style={{position:'relative'}}>
    {jiraTip?<Tooltip theme={theme} text="Open in Jira" align="left" offset={42}/>:null}
    <Pressable accessibilityRole="link" accessibilityLabel="Open in Jira" onHoverIn={()=>setJiraTip(true)} onHoverOut={()=>setJiraTip(false)} onFocus={()=>setJiraTip(true)} onBlur={()=>setJiraTip(false)} onLongPress={()=>setJiraTip(true)} onPress={()=>{setJiraTip(false);onOpenJira();}} style={({pressed})=>({width:40,height:40,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:pressed?c.surface2:'transparent'})}><Icon name="ExternalLink" size={17} color={c.foregroundMuted}/></Pressable>
   </View></View>
  }/>

  <View style={{flexDirection:wide?'row':'column',gap:28,alignItems:'flex-start'}}>
  <View style={{gap:12,flex:wide?1:undefined,width:wide?undefined:'100%',minWidth:0}}><View style={{flexDirection:'row'}}><SectionHeading title="Description" theme={theme} expanded={descriptionExpanded} onPress={()=>setDescriptionExpanded(!descriptionExpanded)}/></View><View style={{display:descriptionExpanded?'flex':'none',gap:12}}>
   {query.isPending?<Text style={{color:c.foregroundMuted}}>Loading issue details…</Text>:query.error?<View><Text accessibilityRole="alert" style={{color:c.statusDanger}}>{query.error.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,'')}</Text><Action theme={theme} icon="RefreshCw" label="Retry" onPress={()=>void query.refetch()}/></View>:<JiraContent blocks={query.data?.richDescription??[]} theme={theme}/>}

   </View><IssueAttachments issueKey={issue.key} hostId={hostId} theme={theme}/><IssueComments issueKey={issue.key} hostId={hostId} theme={theme}/>
  </View>
  <View style={{padding:wide?20:0,paddingTop:20,borderRadius:wide?12:0,backgroundColor:wide?c.surface1:'transparent',borderTopWidth:wide?0:1,borderTopColor:c.border,width:wide?300:'100%',gap:20,flexShrink:0}}>
   <Text style={{color:c.foreground,fontSize:16,fontWeight:'600'}}>Jira fields</Text>
   <IssueFields issue={issue} details={query.data} theme={theme}/>
  </View>
  </View>
 </DetailsShell>;
}

function DetailsShell({issueKey,theme,onClose,children,presentation,panelWidth,panelCollapsed,onTogglePanel,onResizePanel}:{panelCollapsed:boolean;onTogglePanel:()=>void;onResizePanel:(width:number)=>void;presentation:'modal'|'panel'|'fullscreen';panelWidth:number;issueKey:string;theme:PluginScreenProps['theme'];onClose:()=>void;children:ReactNode}){
 const {width,height}=useWindowDimensions();const c=theme.colors;
 if(presentation==='panel')return <DetailsPanel theme={theme} issueKey={issueKey} width={panelWidth} collapsed={panelCollapsed} onToggle={onTogglePanel} onResize={onResizePanel}>{children}</DetailsPanel>;
 if(width<760||presentation==='fullscreen')return <NativeModal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={onClose}>
  <SafeAreaView style={{flex:1,backgroundColor:c.surface0}}>
   <View accessibilityViewIsModal style={{flex:1,minHeight:0}}>
    <View style={{paddingLeft:16,paddingRight:8,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:c.border,flexShrink:0}}><Icon name="FileText" size={18} color={c.accent}/><Text accessibilityRole="header" style={{color:c.foreground,fontSize:15,fontWeight:'600',flex:1}}>{issueKey}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close issue details" onPress={onClose} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="X" size={20} color={c.foregroundMuted}/></Pressable></View>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,minHeight:0}}><ScrollView testID="details-mobile-scroll" style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,gap:20,alignItems:'stretch'}}>{children}</ScrollView></KeyboardAvoidingView>
   </View>
  </SafeAreaView>
 </NativeModal>;
 return <NativeModal visible transparent animationType="fade" onRequestClose={onClose}>
  <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.6)',padding:24}}>
   <Pressable accessibilityLabel="Dismiss issue details" onPress={onClose} style={{position:'absolute',top:0,right:0,bottom:0,left:0}}/>
   <View accessibilityViewIsModal style={{width:Math.min(1180,width-48),maxHeight:height-48,backgroundColor:c.surface0,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden'}}>
    <View style={{paddingHorizontal:24,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:c.border}}><Icon name="FileText" size={18} color={c.accent}/><Text accessibilityRole="header" style={{color:c.foreground,fontSize:15,fontWeight:'600',flex:1}}>{issueKey}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close issue details" onPress={onClose} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="X" size={20} color={c.foregroundMuted}/></Pressable></View>
    <ScrollView style={{flexShrink:1}} contentContainerStyle={{padding:28,gap:20}}>{children}</ScrollView>
   </View>
  </View>
 </NativeModal>;
}
