import {CardActions} from './card-actions';
import {ActivityBadge} from './workspace-activity';
import type {WorkspaceActivity} from '../shared/workspace-activity';
import {issueSearchHighlights} from '../shared/search-highlights';
import {SearchHighlight} from './search-highlight';
import {canStartWork} from '../shared/work-eligibility';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {PluginScreenProps} from '@getpaseo/plugin/client';
import {Pressable,Text,View} from 'react-native';
import {useState} from 'react';
import type {Issue} from '../shared/contracts';
import {StartWork} from './start-work';

type Props=Pick<PluginScreenProps,'theme'|'navigation'> & {jiraUrl?:string;activity?:WorkspaceActivity;selected?:boolean;search?:string;startAvailable?:boolean;detailsAvailable?:boolean;readOnly?:boolean;hostId:string;issue:Issue;onOpenDetails:()=>void;mappingReady:boolean;onConfigureMapping?:()=>void;sprintId:number;onOpenJira:()=>void;onStarted:()=>void};
export function IssueCard({jiraUrl,activity,selected=false,search='',startAvailable=true,detailsAvailable=true,readOnly=false,hostId,theme,navigation,issue,mappingReady,onConfigureMapping,sprintId,onOpenJira,onStarted,onOpenDetails}:Props){
 const [expanded,setExpanded]=useState(false);const [focused,setFocused]=useState(false);
 const colors=theme.colors;
 const matches=issueSearchHighlights(issue,search);
 const kind=issue.type.toLowerCase();
 const typeIcon=kind==='bug'?'Bug':kind==='story'?'Bookmark':kind==='task'?'SquareCheck':'CircleDot';
 const typeColor=kind==='bug'?colors.statusDanger:kind==='story'?colors.statusSuccess:colors.accent;
 const important=/highest|high|critical|blocker/i.test(issue.priority??'');
 const priorityIcon=important?'ChevronUp':/low/i.test(issue.priority??'')?'ChevronDown':'Equal';
 const chip=(name:string,icon:string,key:string)=><View key={key} style={{flexDirection:'row',alignItems:'center',gap:5,maxWidth:'100%',paddingHorizontal:6,paddingVertical:3,borderRadius:4,backgroundColor:colors.surface2}}><Icon name={icon} size={11} color={colors.foregroundMuted}/><Text numberOfLines={1} style={{color:colors.foregroundMuted,fontSize:11,flexShrink:1}}>{name}</Text></View>;
 return <View testID={`issue-card-${issue.key}`} style={{backgroundColor:colors.surface0,borderWidth:1,borderColor:selected?colors.accent:colors.border,borderRadius:12,borderLeftWidth:3,borderLeftColor:selected?colors.accent:important?colors.statusWarning:colors.border,boxShadow:'0 1px 2px rgba(0,0,0,0.08)',paddingHorizontal:11,paddingTop:11,paddingBottom:4,gap:6}}>
   <Pressable testID="keyboard-issue-title" onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} disabled={!detailsAvailable} accessibilityRole={detailsAvailable?"button":undefined} aria-expanded={selected} accessibilityLabel={detailsAvailable?`Open details for ${issue.key}: ${issue.summary}`:issue.summary} onPress={onOpenDetails} style={{minHeight:44,justifyContent:'center',borderRadius:4,backgroundColor:focused?colors.surface2:'transparent',borderWidth:1,borderColor:focused?colors.accent:'transparent'}}>
     <Text style={{color:colors.foreground,fontSize:14,lineHeight:21,fontWeight:'600'}}><SearchHighlight text={issue.summary} ranges={matches.summary} theme={theme}/></Text>
   </Pressable>
   {issue.parent||issue.fixVersions.length||issue.labels.length?<Pressable accessibilityRole="button" accessibilityLabel={`${expanded?'Collapse':'Expand'} parent and tags for ${issue.key}`} accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={{minHeight:44,gap:6,justifyContent:'center'}}>
   {issue.parent?<View>
     <View style={{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:2}}><Icon name="Layers" size={12} color={colors.accent}/><Text numberOfLines={expanded?undefined:1} style={{color:colors.foregroundMuted,fontSize:11,flex:1}}>{issue.parent.summary}</Text></View>
   </View>:null}
   {issue.fixVersions.length||issue.labels.length?<View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}}>
     {(expanded?issue.fixVersions:issue.fixVersions.slice(0,2)).map(v=>chip(v,'Tag',`version-${v}`))}
     {(expanded?issue.labels:issue.labels.slice(0,1)).map(v=>chip(v,'Hash',`label-${v}`))}
     {!expanded&&issue.fixVersions.length+issue.labels.length>Math.min(2,issue.fixVersions.length)+Math.min(1,issue.labels.length)?<Text style={{color:colors.foregroundMuted,fontSize:11}}>+{issue.fixVersions.length+issue.labels.length-Math.min(2,issue.fixVersions.length)-Math.min(1,issue.labels.length)}</Text>:null}
   </View>:null}
   </Pressable>:null}
   <Text style={{color:colors.foregroundMuted,fontSize:12,lineHeight:17}}>{issue.status}</Text>
   <ActivityBadge value={activity} theme={theme}/>
   <StartWork linkedWorkspace={issue.linkedWorkspace} canStart={startAvailable&&canStartWork(issue)} mappingReady={mappingReady} onConfigureMapping={startAvailable?onConfigureMapping:undefined} theme={theme} navigation={navigation} issueKey={issue.key} sprintId={sprintId} onStarted={onStarted} footer={
     <View style={{flex:1,flexDirection:'row',alignItems:'center',gap:5}}>
       <Pressable accessibilityRole="link" accessibilityLabel={`${issue.type} ${issue.key}. Open in Jira`} onPress={onOpenJira} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:6,flexShrink:1}}><Icon name={typeIcon} size={14} color={typeColor}/><Text style={{color:colors.foregroundMuted,fontSize:11,fontWeight:'600'}}><SearchHighlight text={issue.key} ranges={matches.key} theme={theme}/></Text><Icon name="ExternalLink" size={10} color={colors.foregroundMuted}/></Pressable>
       {issue.priority?<View accessibilityLabel={`Priority: ${issue.priority}`} style={{flexDirection:'row',alignItems:'center',gap:2,marginLeft:'auto',flexShrink:1}}><Icon name={priorityIcon} size={14} color={important?colors.statusWarning:colors.foregroundMuted}/><Text numberOfLines={1} style={{color:colors.foregroundMuted,fontSize:10,flexShrink:1}}>{issue.priority}</Text></View>:null}
       <CardActions theme={theme} issueKey={issue.key} jiraUrl={jiraUrl} onOpenJira={onOpenJira} onOpenWorkspace={issue.linkedWorkspace&&navigation?()=>navigation.openWorkspace({workspaceId:issue.linkedWorkspace!.workspaceId}):undefined}/>
     </View>
   }/>
 </View>;
}
