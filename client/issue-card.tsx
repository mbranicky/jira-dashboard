import {canStartWork} from '../shared/work-eligibility';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {PluginScreenProps} from '@getpaseo/plugin/client';
import {Pressable,Text,View} from 'react-native';
import {useState} from 'react';
import type {Issue} from '../shared/contracts';
import {StartWork} from './start-work';

type Props=Pick<PluginScreenProps,'theme'|'navigation'> & {readOnly?:boolean;hostId:string;issue:Issue;onOpenDetails:()=>void;mappingReady:boolean;onConfigureMapping?:()=>void;sprintId:number;onOpenJira:()=>void;onStarted:()=>void};
export function IssueCard({readOnly=false,hostId,theme,navigation,issue,mappingReady,onConfigureMapping,sprintId,onOpenJira,onStarted,onOpenDetails}:Props){
 const [expanded,setExpanded]=useState(false);
 const colors=theme.colors;
 const kind=issue.type.toLowerCase();
 const typeIcon=kind==='bug'?'Bug':kind==='story'?'Bookmark':kind==='task'?'SquareCheck':'CircleDot';
 const typeColor=kind==='bug'?colors.statusDanger:kind==='story'?colors.statusSuccess:colors.accent;
 const important=/highest|high|critical|blocker/i.test(issue.priority??'');
 const priorityIcon=important?'ChevronUp':/low/i.test(issue.priority??'')?'ChevronDown':'Equal';
 const chip=(name:string,icon:string,key:string)=><View key={key} style={{flexDirection:'row',alignItems:'center',gap:5,maxWidth:'100%',paddingHorizontal:6,paddingVertical:3,borderRadius:4,backgroundColor:colors.surface2}}><Icon name={icon} size={11} color={colors.foregroundMuted}/><Text numberOfLines={1} style={{color:colors.foregroundMuted,fontSize:11,flexShrink:1}}>{name}</Text></View>;
 return <View style={{backgroundColor:colors.surface0,borderWidth:1,borderColor:colors.border,borderRadius:9,borderLeftWidth:3,borderLeftColor:important?colors.statusWarning:colors.border,paddingHorizontal:11,paddingTop:11,paddingBottom:4,gap:6}}>
   <Pressable accessibilityRole="button" accessibilityLabel={`Open details for ${issue.key}: ${issue.summary}`} onPress={onOpenDetails} style={{minHeight:44,justifyContent:'center'}}>
     <Text style={{color:colors.foreground,fontSize:14,lineHeight:20,fontWeight:'500'}}>{issue.summary}</Text>
   </Pressable>
   {issue.parent||issue.fixVersions.length||issue.labels.length?<Pressable accessibilityRole="button" accessibilityLabel={`${expanded?'Collapse':'Expand'} parent and tags for ${issue.key}`} accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={{minHeight:44,gap:6,justifyContent:'center'}}>
   {issue.parent?<View>
     <View style={{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderColor:colors.border,borderRadius:4,paddingHorizontal:6,paddingVertical:4}}><Icon name="Layers" size={12} color={colors.accent}/><Text numberOfLines={expanded?undefined:1} style={{color:colors.foregroundMuted,fontSize:11,flex:1}}>{issue.parent.summary}</Text></View>
   </View>:null}
   {issue.fixVersions.length||issue.labels.length?<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}}>
     {(expanded?issue.fixVersions:issue.fixVersions.slice(0,2)).map(v=>chip(v,'Tag',`version-${v}`))}
     {(expanded?issue.labels:issue.labels.slice(0,1)).map(v=>chip(v,'Hash',`label-${v}`))}
     {!expanded&&issue.fixVersions.length+issue.labels.length>Math.min(2,issue.fixVersions.length)+Math.min(1,issue.labels.length)?<Text style={{color:colors.foregroundMuted,fontSize:11}}>+{issue.fixVersions.length+issue.labels.length-Math.min(2,issue.fixVersions.length)-Math.min(1,issue.labels.length)}</Text>:null}
   </View>:null}
   </Pressable>:null}
   <Text style={{color:colors.foregroundMuted,fontSize:12,lineHeight:17}}>{issue.status}</Text>
   <StartWork linkedWorkspace={issue.linkedWorkspace} canStart={canStartWork(issue)} mappingReady={mappingReady} onConfigureMapping={onConfigureMapping} theme={theme} navigation={navigation} issueKey={issue.key} sprintId={sprintId} onStarted={onStarted} footer={
     <View style={{flex:1,flexDirection:'row',alignItems:'center',gap:5}}>
       <Pressable accessibilityRole="link" accessibilityLabel={`${issue.type} ${issue.key}. Open in Jira`} onPress={onOpenJira} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:6,flexShrink:1}}><Icon name={typeIcon} size={14} color={typeColor}/><Text style={{color:colors.foregroundMuted,fontSize:11,fontWeight:'600'}}>{issue.key}</Text><Icon name="ExternalLink" size={10} color={colors.foregroundMuted}/></Pressable>
       {issue.priority?<View accessibilityLabel={`Priority: ${issue.priority}`} style={{flexDirection:'row',alignItems:'center',gap:2,marginLeft:'auto',flexShrink:1}}><Icon name={priorityIcon} size={14} color={important?colors.statusWarning:colors.foregroundMuted}/><Text numberOfLines={1} style={{color:colors.foregroundMuted,fontSize:10,flexShrink:1}}>{issue.priority}</Text></View>:null}
     </View>
   }/>
 </View>;
}
