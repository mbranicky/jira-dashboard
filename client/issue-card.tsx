import {radii} from './radii';
import {PriorityBadge,priorityStyle} from './priority-badge';
import {defaultDisplayPreferences,type DisplayPreferences} from '../shared/display-preferences';
import {CardActions} from './card-actions';
import {ActivityBadge} from './workspace-activity';
import type {WorkspaceActivity} from '../shared/workspace-activity';
import {issueSearchHighlights} from '../shared/search-highlights';
import {SearchHighlight} from './search-highlight';
import {canStartWork} from '../shared/work-eligibility';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {PluginScreenProps} from '@getpaseo/plugin/client';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {useState} from 'react';
import type {Issue} from '../shared/contracts';
import {StartWork} from './start-work';

type Props=Pick<PluginScreenProps,'theme'|'navigation'> & {preview?:boolean;display?:DisplayPreferences;jiraUrl?:string;activity?:WorkspaceActivity;selected?:boolean;search?:string;startAvailable?:boolean;detailsAvailable?:boolean;readOnly?:boolean;hostId:string;issue:Issue;onOpenDetails:()=>void;mappingReady:boolean;onConfigureMapping?:()=>void;sprintId:number;onOpenJira:()=>void;onStarted:()=>void};
export function IssueCard({preview=false,display=defaultDisplayPreferences,jiraUrl,activity,selected=false,search='',startAvailable=true,detailsAvailable=true,readOnly=false,hostId,theme,navigation,issue,mappingReady,onConfigureMapping,sprintId,onOpenJira,onStarted,onOpenDetails}:Props){
 const [expanded,setExpanded]=useState(false);
 const colors=theme.colors;
 const dense=display.density==='compact';
 const touchLayout=useWindowDimensions().width<760;
 const rowHeight=dense&&!touchLayout?34:44;
 const matches=issueSearchHighlights(issue,search);
 const kind=issue.type.toLowerCase();
 const typeIcon=kind==='bug'?'Bug':kind==='story'?'Bookmark':kind==='task'?'SquareCheck':'CircleDot';
 const typeColor=kind==='bug'?colors.statusDanger:kind==='story'?colors.statusSuccess:colors.accent;
 const chip=(name:string,icon:string,key:string)=><View key={key} style={{flexDirection:'row',alignItems:'center',gap:5,maxWidth:'100%',paddingHorizontal:6,paddingVertical:3,borderRadius:radii.small,backgroundColor:colors.surface2}}><Icon name={icon} size={11} color={colors.foregroundMuted}/><Text numberOfLines={1} style={{color:colors.foregroundMuted,fontSize:11,flexShrink:1}}>{name}</Text></View>;
 return <Pressable accessible={false} focusable={false} onPress={event=>{
   // Keep nested actions independent; the title remains the keyboard entry point.
   const target=event.target as unknown as {closest?:(selector:string)=>unknown};
   if(detailsAvailable&&!target.closest?.('[role="button"],a,input,textarea,select'))onOpenDetails();
 }} testID={`issue-card-${issue.key}`} style={{backgroundColor:selected?colors.surface2:colors.surface0,borderWidth:1,borderColor:colors.border,borderRadius:radii.card,borderLeftWidth:2,borderLeftColor:issue.priority?priorityStyle(issue.priority).color:colors.border,outlineColor:colors.foregroundMuted,outlineWidth:0,boxShadow:'0 1px 2px rgba(0,0,0,0.08)',paddingHorizontal:display.density==='compact'?11:15,paddingTop:display.density==='compact'?11:15,paddingBottom:display.density==='compact'?4:8,gap:dense?3:10}}>
   <Pressable testID="keyboard-issue-title" disabled={!detailsAvailable} accessibilityRole={detailsAvailable?"button":undefined} aria-expanded={selected} accessibilityLabel={detailsAvailable?`Open details for ${issue.key}: ${issue.summary}`:issue.summary} onPress={onOpenDetails} style={{minHeight:rowHeight,justifyContent:'center',borderRadius:radii.small,backgroundColor:'transparent',outlineWidth:0}}>
     <Text style={{color:colors.foreground,fontSize:13,lineHeight:19,fontWeight:'400',textDecorationLine:'none'}}><SearchHighlight text={issue.summary} ranges={matches.summary} theme={theme}/></Text>
   </Pressable>
   {display.showParent&&issue.parent||display.showTags&&(issue.fixVersions.length||issue.labels.length)?<Pressable accessibilityRole="button" accessibilityLabel={`${expanded?'Collapse':'Expand'} parent and tags for ${issue.key}`} accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={{minHeight:rowHeight,gap:dense?3:6,justifyContent:'center'}}>
   {display.showParent&&issue.parent?<View>
     <View style={{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:2}}><Icon name="Layers" size={12} color={colors.accent}/><Text numberOfLines={expanded?undefined:1} style={{color:colors.foregroundMuted,fontSize:11,flex:1}}>{issue.parent.summary}</Text></View>
   </View>:null}
   {display.showTags&&(issue.fixVersions.length||issue.labels.length)?<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}}>
     {(expanded?issue.fixVersions:issue.fixVersions.slice(0,2)).map(v=>chip(v,'Tag',`version-${v}`))}
     {(expanded?issue.labels:issue.labels.slice(0,1)).map(v=>chip(v,'Hash',`label-${v}`))}
     {!expanded&&issue.fixVersions.length+issue.labels.length>Math.min(2,issue.fixVersions.length)+Math.min(1,issue.labels.length)?<Text style={{color:colors.foregroundMuted,fontSize:11}}>+{issue.fixVersions.length+issue.labels.length-Math.min(2,issue.fixVersions.length)-Math.min(1,issue.labels.length)}</Text>:null}
   </View>:null}
   </Pressable>:null}
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:colors.foregroundMuted,fontSize:12,lineHeight:17,flex:1}}>{issue.status}</Text>{issue.priority?<PriorityBadge priority={issue.priority}/>:null}</View>
   <ActivityBadge dense={dense} value={activity} theme={theme}/>
   <StartWork dense={dense} linkedWorkspace={issue.linkedWorkspace} canStart={startAvailable&&canStartWork(issue)} mappingReady={mappingReady} onConfigureMapping={startAvailable?onConfigureMapping:undefined} theme={theme} navigation={navigation} issueKey={issue.key} sprintId={sprintId} onStarted={onStarted} footer={
     <View style={{flex:1,flexDirection:'row',alignItems:'center',gap:5,justifyContent:'space-between'}}>
       <View style={{minHeight:rowHeight,flexDirection:'row',alignItems:'center',gap:6,flexShrink:1}}><Icon name={typeIcon} size={14} color={typeColor}/><Text numberOfLines={1} style={{color:colors.foregroundMuted,fontSize:11,fontWeight:'400'}}><SearchHighlight text={issue.key} ranges={matches.key} theme={theme}/></Text></View>

       {!preview?<CardActions dense={dense} theme={theme} issueKey={issue.key} jiraUrl={jiraUrl} onOpenJira={onOpenJira} onOpenWorkspace={issue.linkedWorkspace&&navigation?()=>navigation.openWorkspace({workspaceId:issue.linkedWorkspace!.workspaceId}):undefined}/>:null}
     </View>
   }/>
 </Pressable>;
}
