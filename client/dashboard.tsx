import {DisplayPreferencesMenu,useDisplayPreferences} from './display-preferences';
import {issueNavigation} from '../shared/issue-navigation';
import {useWorkspaceActivity} from './workspace-activity';
import {activityKey} from '../shared/workspace-activity';
import {SavedBoards} from './saved-boards';
import {bindBoardKeyboard,focusIssueCard} from './web';
import {useEffect,useRef} from 'react';
import {BoardFilterBar} from './board-filters';
import {emptyFilters,matchesBoardView} from '../shared/board-filters';
import boardIcon from './board-icon.json';
import {ResponsiveSelect} from './responsive-select';
import {McpSettings} from './mcp-settings';
import {sprintSelectionKey} from '../shared/sprint-selection';
import {TwgSettings} from './twg-settings';
import {ConnectionCheck} from './connection-check';
import {BoardLoading} from './board-loading';
import {useDashboardSession} from './dashboard-session';
import {clampPanelWidth,detailsPresentation} from '../shared/details-presentation';
import {DashboardPreferences} from './dashboard-preferences';
import {IssueDetails} from './issue-details';
import {OverlayMenu} from './overlay-menu';
import {BoardMoves,DragIssue,DropColumn} from './moves';
import { Action, SectionTitle } from './settings-ui';
import { IssueCard } from './issue-card';
import { MappingSettings } from './mappings';
import { Icon } from '@getpaseo/plugin/client/ui';
import { useRpc, useSettings, type PluginScreenProps, type PluginSurfaceProps } from '@getpaseo/plugin/client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { connection, dashboardPreferences, mappings, readBoard, type Connection } from '../shared/contracts';
import { openExternal } from './web';

type Surface=Pick<PluginScreenProps,'theme'|'layout'>;
function Button({label,onPress,theme,disabled=false}:{label:string;onPress:()=>void;theme:Surface['theme'];disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{minHeight:44,justifyContent:'center',paddingHorizontal:14,paddingVertical:10,borderRadius:8,backgroundColor:theme.colors.surface2,opacity:disabled?0.5:1}}><Text style={{color:theme.colors.foreground,fontWeight:'600'}}>{label}</Text></Pressable>;
}
export function ConnectionSettings(props:PluginSurfaceProps){return <ScrollView style={{flex:1,backgroundColor:props.theme.colors.surface0}}><ConnectionEditor {...props} hostId={props.host.id}/></ScrollView>;}
function ConnectionEditor({theme,layout,onSaving,hostId}:{hostId:string;theme:Surface['theme'];layout:Surface['layout'];onSaving?:()=>void}){
  const settings=useSettings(connection);
  const [saved,setSaved]=useState(false);
  if(settings.status==='loading')return <Text style={{color:theme.colors.foreground}}>Loading settings…</Text>;
  if(settings.status!=='ready')return <View style={{padding:20,gap:12}}><Text style={{color:theme.colors.foreground}}>Cannot load connection settings.</Text><Button theme={theme} label="Retry" onPress={()=>void settings.reload()}/></View>;
  return <Editor hostId={hostId} key={settings.revision} theme={theme} layout={layout} initial={settings.values} saved={saved} setSaved={setSaved} saving={settings.saving} error={settings.saveError?String(settings.saveError):null} onSave={async value=>{onSaving?.();const ok=await settings.save(value,settings.revision);setSaved(ok);return ok;}}/>;
}
function Editor({theme,layout,hostId,initial,onSave,saving,error,saved,setSaved}:Surface & {hostId:string;saved:boolean;setSaved:(value:boolean)=>void;initial:Connection;onSave:(v:Connection)=>Promise<boolean>;saving:boolean;error:string|null}){
  const [draft,setDraft]=useState(initial);
  const [interval,setInterval]=useState(String(initial.refreshSeconds));
  const [intervalTouched,setIntervalTouched]=useState(false);
  const [intervalMenu,setIntervalMenu]=useState(false);
  const validInterval=/^\d+$/.test(interval.trim())&&Number.isSafeInteger(Number(interval))&&Number(interval)>=30;
  const intervalError=intervalTouched&&!validInterval?'Enter a whole number of at least 30 seconds.':null;
  const input={color:theme.colors.foreground,backgroundColor:theme.colors.surface1,borderColor:theme.colors.border,borderWidth:1,borderRadius:8,padding:12};
  return <View style={{padding:layout.compact?16:24,gap:16,maxWidth:960,width:'100%',alignSelf:'center'}}>
    <SectionTitle theme={theme} icon="Link" title="Jira connection" description="Choose how this host connects to your Jira board."/>
    <View style={{padding:layout.compact?16:24,gap:14,borderRadius:16,backgroundColor:theme.colors.surface1,borderWidth:1,borderColor:theme.colors.border}}>
    <Text style={{color:theme.colors.foreground}}>Jira board URL</Text>
    <TextInput accessibilityLabel="Jira board URL" autoCapitalize="none" autoCorrect={false} value={draft.boardUrl} onChangeText={boardUrl=>{setSaved(false);setDraft({...draft,boardUrl});}} placeholder="https://your-site.atlassian.net/jira/software/c/projects/KEY/boards/51" placeholderTextColor={theme.colors.foregroundMuted} style={input}/>
    <ResponsiveSelect theme={theme} compact={layout.compact} label="Connection method" value={draft.transport??'rest'} options={[{label:'REST API',value:'rest'},{label:'Teamwork Graph CLI',value:'twg'},{label:'Atlassian MCP',value:'mcp'}]} onValueChange={value=>{setSaved(false);setDraft({...draft,transport:value as Connection['transport'],...(value==='mcp'?{mcpHostId:hostId}:{})});}}/>
    {draft.transport==='mcp'?<Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>Read your board, issue details, comments and attachments. Start work creates or reuses a Paseo workspace and agent.</Text>:null}
    {draft.transport==='mcp'?<View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,gap:4}}><Text style={{color:theme.colors.foreground,fontWeight:'600'}}>Allow Jira changes through MCP</Text><Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>Enable workflow moves, comments and attachment uploads. Play itself does not change Jira.</Text></View><Switch accessibilityLabel="Allow Jira changes through MCP" value={draft.mcpWrites??false} onValueChange={mcpWrites=>{setSaved(false);setDraft({...draft,mcpWrites});}}/></View>:null}
    {draft.transport==='twg'?<View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,gap:4}}><Text style={{color:theme.colors.foreground,fontWeight:'600'}}>Allow Jira changes</Text><Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>Enable workflow moves, comments and attachment uploads. Play itself does not change Jira.</Text></View><Switch accessibilityLabel="Allow Jira changes" value={draft.twgWrites} onValueChange={enabled=>{setSaved(false);setDraft({...draft,twgWrites:enabled});}}/></View>:null}
    {draft.transport!=='twg'&&draft.transport!=='mcp'?<>
    <Text style={{color:theme.colors.foreground}}>Secret file path on this host</Text>
    <TextInput accessibilityLabel="Secret file path" autoCapitalize="none" autoCorrect={false} value={draft.envPath} onChangeText={envPath=>{setSaved(false);setDraft({...draft,envPath});}} placeholder="/absolute/path/to/jira.env" placeholderTextColor={theme.colors.foregroundMuted} style={input}/>
    <Text style={{color:theme.colors.foregroundMuted}}>Use JIRA_EMAIL and JIRA_API_TOKEN in this file. Only the path is saved here. Protect the file with owner-only permissions (chmod 600).</Text>
    <ConnectionCheck key={`${draft.boardUrl}|${draft.envPath}`} theme={theme} boardUrl={draft.boardUrl} envPath={draft.envPath}/>
    </>:null}
    </View>
    {draft.transport==='mcp'?<McpSettings theme={theme} hostId={hostId} boardUrl={draft.boardUrl} writeAccess={draft.mcpWrites}/>:null}
    {draft.transport==='twg'?<TwgSettings theme={theme} boardUrl={draft.boardUrl} executable={draft.twgExecutable??'twg'} profile={draft.twgProfile??'default'} onChange={(executable,profile)=>{setSaved(false);setDraft({...draft,twgExecutable:executable,twgProfile:profile});}}/>:null}
    <View style={{flexDirection:layout.compact?'column':'row',gap:16,alignItems:layout.compact?'stretch':'center',paddingVertical:8}}>
    <View style={{flex:1,gap:6}}><Text style={{color:theme.colors.foreground,fontWeight:'600'}}>Refresh interval</Text><Text style={{color:theme.colors.foregroundMuted,fontSize:13}}>How often the board checks Jira for updates.</Text></View>
    <View style={{width:layout.compact?'100%':260,gap:8}}>
    <Text style={{color:theme.colors.foregroundMuted}}>Seconds · minimum 30</Text>
    {intervalError?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{intervalError}</Text>:null}
    <OverlayMenu open={intervalMenu} onOpenChange={setIntervalMenu} theme={theme} trigger={toggle=>
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:theme.colors.surface1,borderColor:intervalError?theme.colors.statusDanger:theme.colors.border,borderWidth:intervalError?2:1,borderRadius:8}}>
        <TextInput accessibilityLabel="Refresh interval in seconds" accessibilityHint="Type a whole number of at least 30 seconds, or use the preset dropdown button" keyboardType="number-pad" value={interval} onBlur={()=>setIntervalTouched(true)} onChangeText={value=>{setSaved(false);setInterval(value);setIntervalTouched(true);setIntervalMenu(false);}} onKeyPress={event=>{if(event.nativeEvent.key==='Escape')setIntervalMenu(false);if(event.nativeEvent.key==='ArrowDown')toggle();}} style={{color:theme.colors.foreground,flex:1,minWidth:0,minHeight:48,padding:12}}/>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh interval presets" accessibilityState={{expanded:intervalMenu}} onPress={toggle} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderLeftWidth:1,borderLeftColor:theme.colors.border}}><Text style={{color:theme.colors.foreground,fontSize:18}}>{intervalMenu?'▴':'▾'}</Text></Pressable>
      </View>}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:240}}>
        {[30,60,120,300].map(seconds=><Pressable key={seconds} accessibilityRole="button" accessibilityLabel={`${seconds} seconds`} accessibilityState={{selected:validInterval&&Number(interval)===seconds}} onPress={()=>{setSaved(false);setInterval(String(seconds));setIntervalTouched(true);setIntervalMenu(false);}} style={{minHeight:48,padding:12,justifyContent:'center',backgroundColor:validInterval&&Number(interval)===seconds?theme.colors.surface2:theme.colors.surface1}}><Text style={{color:theme.colors.foreground}}>{seconds} seconds{validInterval&&Number(interval)===seconds?' ✓':''}</Text></Pressable>)}
      </ScrollView>
    </OverlayMenu>
    </View></View>
    {error?<Text accessibilityRole="alert" style={{color:theme.colors.foreground}}>{error}</Text>:null}
    {saved?<Text style={{color:theme.colors.foreground}}>Settings saved. Open Jira Sprint Workspace to test the connection.</Text>:null}
    <View style={{flexDirection:'row',justifyContent:'flex-end',borderTopWidth:1,borderTopColor:theme.colors.border,paddingTop:12}}><Action theme={theme} icon="Check" primary disabled={saving||!draft.boardUrl.trim()||(draft.transport==='twg'? !(draft.twgExecutable??'twg').trim()||!(draft.twgProfile??'default').trim():draft.transport==='mcp'?false:!draft.envPath.trim())} label={saving?'Saving…':'Save connection'} onPress={()=>{setIntervalTouched(true);if(!validInterval)return;void onSave({...draft,refreshSeconds:Number(interval),boardUrl:draft.boardUrl.trim(),envPath:draft.envPath.trim()}).then(ok=>setSaved(ok));}}/></View>
  </View>;
}
export function Dashboard({host,theme,layout,navigation}:PluginScreenProps){
  const display=useDisplayPreferences(host.id);
  const keyboardRoot=useRef<View>(null);
  useEffect(()=>bindBoardKeyboard(keyboardRoot.current));
  const preferences=useSettings(dashboardPreferences);
  const {boardViews,updateBoard,selected:savedSelection,setSelected,panelWidth,setPanelWidth,panelCollapsed,setPanelCollapsed}=useDashboardSession(host.id);
  const [availableWidth,setAvailableWidth]=useState(0);
  const settings=useSettings(connection);const projectMappings=useSettings(mappings);const rpc=useRpc(readBoard);
  const [mappingProject,setMappingProject]=useState<string>();
  const [sprintMenu,setSprintMenu]=useState(false);const [searchFocused,setSearchFocused]=useState(false);const [editing,setEditing]=useState(false);const [linkError,setLinkError]=useState<string>();
  const sprintKey=settings.status==='ready'?sprintSelectionKey(settings.values.boardUrl):'';
  const boardView=boardViews?.[sprintKey];
  const selected=savedSelection?.boardKey===sprintKey?savedSelection:undefined;
  const lastSelected=useRef<string|undefined>(undefined);
  useEffect(()=>{if(selected)lastSelected.current=selected.issue.key;else if(lastSelected.current){focusIssueCard(keyboardRoot.current,lastSelected.current);lastSelected.current=undefined;}},[selected]);
  const search=boardView?.search??'';
  const filters=boardView?.filters??emptyFilters();
  const setSearch=(value:string)=>updateBoard(sprintKey,{search:value});
  const sprint=preferences.status==='ready'?preferences.values.sprintByBoard?.[sprintKey]??undefined:undefined;
  const [sprintSaveError,setSprintSaveError]=useState('');
  async function setSprint(value:number|undefined){
    if(preferences.status!=='ready'||preferences.saving)return;
    setSprintSaveError('');
    try{const ok=await preferences.save({...preferences.values,sprintByBoard:{...preferences.values.sprintByBoard,[sprintKey]:value??null}},preferences.revision);
      if(!ok)setSprintSaveError('Could not save sprint selection. Please retry.');
    }catch{setSprintSaveError('Could not save sprint selection. Please retry.');}
  }
  const revision=settings.status==='ready'?settings.revision:'';
  const twgPreview=settings.status==='ready'&&settings.values.transport==='twg';
  const mcpPreview=settings.status==='ready'&&settings.values.transport==='mcp';
  const twgReadOnly=mcpPreview&&!settings.values.mcpWrites||twgPreview&&!settings.values.twgWrites;
  const configured=settings.status==='ready'&&!!settings.values.boardUrl&&(mcpPreview?!!settings.values.mcpHostId:twgPreview?!!settings.values.twgExecutable&&!!settings.values.twgProfile:!!settings.values.envPath);
  const board=useQuery({queryKey:['jira-board',host.id,sprintKey,revision,sprint],queryFn:()=>rpc(sprint?{sprintId:sprint}:{}),enabled:configured&&!editing&&preferences.status==='ready',retry:false,refetchInterval:settings.status==='ready'?settings.values.refreshSeconds*1000:false,refetchIntervalInBackground:false});
  const data=board.data;
  const activity=useWorkspaceActivity(host.id,editing?[]:data?.issues.flatMap(issue=>issue.linkedWorkspace?[issue.linkedWorkspace]:[])??[]);
  const initialLoading=settings.status==='loading'||preferences.status==='loading'||(configured&&board.isLoading&&!data);
  const text={color:theme.colors.foreground};const muted={color:theme.colors.foregroundMuted};
  if(editing || (settings.status==='ready'&&!configured))return <ScrollView style={{flex:1,backgroundColor:theme.colors.surface0}}>{configured?<View style={{maxWidth:960,width:'100%',alignSelf:'center',paddingHorizontal:layout.compact?16:24,paddingTop:16}}><Action theme={theme} icon="ArrowLeft" label="Back to board" onPress={()=>setEditing(false)}/></View>:null}{!mappingProject?<DashboardPreferences theme={theme} layout={layout}/>:null}{!mappingProject?<ConnectionEditor hostId={host.id} theme={theme} layout={layout} onSaving={()=>{setEditing(true);}}/>:null}<MappingSettings embedded prefillProjectKey={mappingProject} theme={theme} layout={layout}/></ScrollView>;
  const filtered=data?.issues.filter(i=>matchesBoardView(i,search,filters,i.linkedWorkspace?activity.data?.[activityKey(i.linkedWorkspace)]:undefined))??[];
  const columns=data?[...data.columns]:[];
  if(data && filtered.some(i=>!data.columns.some(c=>c.statusIds.includes(i.statusId))))columns.push({name:'Unmapped status',statusIds:filtered.filter(i=>!data.columns.some(c=>c.statusIds.includes(i.statusId))).map(i=>i.statusId)});
  // Use configured status IDs so a reordered board still opens the same column.
  const columnKeys=columns.map((c,index)=>index===data?.columns.length?'unmapped':JSON.stringify([c.name,...c.statusIds.slice().sort()]));
  const selectedColumn=Math.max(0,columnKeys.findIndex(key=>key===boardView?.columnKey));
  const panel=preferences.status==='ready'&&preferences.values.detailsView==='panel';
  const presentation=detailsPresentation(panel?'panel':'modal',layout.compact,availableWidth);
  const currentIssue=selected&&(data?.selectedSprintId===selected.sprintId?data.issues.find(i=>i.key===selected.issue.key):undefined)||selected?.issue;
  const detailNav=issueNavigation(filtered,columns,currentIssue?.key??'');
  const goToIssue=(issue:typeof currentIssue)=>{if(issue&&data?.selectedSprintId){setPanelCollapsed(false);if(layout.compact){const index=columns.findIndex(column=>column.statusIds.includes(issue.statusId));if(index>=0)updateBoard(sprintKey,{columnKey:columnKeys[index]});}setSelected({boardKey:sprintKey,issue,sprintId:data.selectedSprintId,site:data.site});}};
  return <View onLayout={event=>setAvailableWidth(event.nativeEvent.layout.width)} style={{flex:1,minHeight:0,flexDirection:'row',backgroundColor:theme.colors.surface0}}>
  <View ref={keyboardRoot} style={{flex:1,minWidth:0,minHeight:0,padding:layout.compact?12:24,gap:16}}>
    <View style={{gap:14,paddingBottom:16,borderBottomWidth:1,borderBottomColor:theme.colors.border}}>
      <View style={{flexDirection:layout.compact?'column':'row',justifyContent:'space-between',alignItems:layout.compact?'stretch':'center',gap:8}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:12,flexShrink:1}}>
          <Image accessible={false} source={boardIcon} resizeMode="contain" style={{width:40,height:40,flexShrink:0}}/>
          <View style={{gap:4,flexShrink:1}}><Text style={{...text,fontSize:22,fontWeight:'700'}}>{data?.name??'Jira Sprint Workspace'}</Text><Text style={{...muted,fontSize:12}}>{data?`${data.user.displayName} · Assigned to me`:'Your assigned sprint issues'}</Text></View>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,alignSelf:'flex-end'}}>
          <DisplayPreferencesMenu hostId={host.id} theme={theme}/>
          <Action theme={theme} icon="RefreshCw" label={board.isFetching?'Refreshing…':'Refresh'} disabled={board.isFetching||!configured} onPress={()=>void board.refetch()}/>
          <Action theme={theme} icon="Settings2" label="Settings" onPress={()=>{setMappingProject(undefined);setEditing(true);}}/>
        </View>
      </View>
      {!layout.compact?<Text style={{...muted,fontSize:11}}>Keyboard: / search · J next issue · K previous issue · Enter open focused issue</Text>:null}
      {data?.workspaceWarning?<Text accessibilityRole="alert" style={{...muted,fontSize:13}}>{data.workspaceWarning}</Text>:null}
      <SavedBoards theme={theme} compact={layout.compact} onSelected={()=>setSelected(undefined)}>
        {data?<View style={{width:260,maxWidth:'100%',flexGrow:layout.compact?1:0,gap:4}}>
          <OverlayMenu open={sprintMenu} onOpenChange={setSprintMenu} theme={theme} trigger={toggle=><Pressable accessibilityRole="button" accessibilityLabel="Select sprint" accessibilityState={{expanded:sprintMenu}} onPress={toggle} style={({pressed})=>({minHeight:34,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12,borderRadius:8,borderWidth:1,borderColor:theme.colors.border,backgroundColor:pressed?theme.colors.surface2:theme.colors.surface1})}>
            <Icon name="CalendarDays" size={16} color={theme.colors.accent}/>
            <Text numberOfLines={1} style={{...text,fontSize:13,flex:1}}>{data.sprints.find(s=>s.id===data.selectedSprintId)?.name??'Select sprint'}</Text>
            {sprint===undefined?<Text style={{color:theme.colors.accent,fontSize:11,fontWeight:'600'}}>Auto</Text>:null}
            <Icon name={sprintMenu?'ChevronUp':'ChevronDown'} size={15} color={theme.colors.foregroundMuted}/>
          </Pressable>}>
          <ScrollView nestedScrollEnabled style={{maxHeight:220,padding:4,backgroundColor:theme.colors.surface1}}>
            {[{label:'Follow active sprint',value:'auto'},...data.sprints.filter(s=>s.state==='active'||s.state==='future').sort((a,b)=>Number(b.state==='active')-Number(a.state==='active')||b.id-a.id).map(s=>({label:`${s.name} · ${s.state}`,value:String(s.id)}))].map(option=><Pressable key={option.value} accessibilityRole="button" accessibilityState={{selected:option.value===(sprint===undefined?'auto':String(sprint))}} disabled={preferences.status!=='ready'||preferences.saving} onPress={()=>{void setSprint(option.value==='auto'?undefined:Number(option.value));setSprintMenu(false);}} style={({pressed})=>({minHeight:34,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:8,borderRadius:5,backgroundColor:pressed?theme.colors.surface2:'transparent'})}><View style={{width:16}}>{option.value===(sprint===undefined?'auto':String(sprint))?<Icon name="Check" size={15} color={theme.colors.accent}/>:null}</View><Text style={{...text,fontSize:13,flex:1}}>{option.label}</Text></Pressable>)}
          </ScrollView></OverlayMenu>
        </View>:null}
        <View style={{flexGrow:1,flexBasis:280,minWidth:0,maxWidth:'100%',minHeight:34,flexDirection:'row',alignItems:'center',gap:8,paddingLeft:12,borderRadius:8,borderWidth:1,borderColor:searchFocused?theme.colors.accent:theme.colors.border,backgroundColor:theme.colors.surface1}}>
          <Icon name="Search" size={16} color={theme.colors.foregroundMuted}/>
          <TextInput accessibilityLabel="Search issues" value={search} onChangeText={setSearch} onFocus={()=>setSearchFocused(true)} onBlur={()=>setSearchFocused(false)} autoCapitalize="none" autoCorrect={false} placeholder="Search issue key or title…" placeholderTextColor={theme.colors.foregroundMuted} style={{...text,flex:1,minWidth:0,minHeight:34,fontSize:13,paddingVertical:6,paddingRight:12}}/>
          {search?<Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={()=>setSearch('')} style={{width:34,height:34,alignItems:'center',justifyContent:'center'}}><Icon name="X" size={16} color={theme.colors.foregroundMuted}/></Pressable>:null}
        </View>
      </SavedBoards>
      {data?<BoardFilterBar key={sprintKey} theme={theme} issues={data.issues} filters={filters} search={search} onChange={(filters,search)=>updateBoard(sprintKey,{filters,search})} views={preferences.status==='ready'?preferences.values.viewsByBoard[sprintKey]??[]:[]} disabled={preferences.status!=='ready'||preferences.saving} onSave={async views=>preferences.status==='ready'&&await preferences.save({...preferences.values,viewsByBoard:{...preferences.values.viewsByBoard,[sprintKey]:views}},preferences.revision)}/>:null}
      {data?<View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12}}><Text style={{...muted,fontSize:11,fontVariant:['tabular-nums']}}>{`${filtered.length} of ${data.issues.length}`} issues</Text><View style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:12,height:12,flexShrink:0,alignItems:'center',justifyContent:'center'}}>{board.isFetching?<ActivityIndicator size={12} color={theme.colors.accent}/>:<Icon name="Clock3" size={12} color={theme.colors.foregroundMuted}/>}</View><Text style={{...muted,fontSize:11,fontVariant:['tabular-nums']}}>Updated {new Date(data.checkedAt).toLocaleTimeString()}</Text></View></View>:null}
    </View>
    {settings.status==='error'||settings.status==='invalid'?<Text accessibilityRole="alert" style={text}>Connection settings could not be loaded. Open Settings to retry.</Text>:null}
    {filters.activity?.length&&activity.isFetching?<Text style={muted}>Updating activity filters…</Text>:null}
    {filters.activity?.length&&Object.values(activity.data??{}).some(value=>value.state==='unavailable')?<Text style={muted}>Some workspace activity is unavailable. Those issues only match workspace-presence filters.</Text>:null}
    {board.error?<View style={{padding:14,backgroundColor:theme.colors.surface1,borderRadius:8,gap:8}}><Text accessibilityRole="alert" style={text}>{board.error.message}</Text>{data?<Text style={muted}>Showing the last successful snapshot. It may be out of date.</Text>:null}</View>:null}
    {sprintSaveError?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{sprintSaveError}</Text>:null}
    {preferences.status==='error'||preferences.status==='invalid'?<Action theme={theme} icon="RefreshCw" label="Retry dashboard preferences" onPress={()=>void preferences.reload()}/>:null}
    {board.error&&sprint!==undefined?<Action theme={theme} icon="CalendarDays" label="Choose another sprint" onPress={()=>void setSprint(undefined)}/>:null}
    {linkError?<Text accessibilityRole="alert" style={text}>{linkError}</Text>:null}
    {data&&!data.selectedSprintId?<Text style={text}>{data.sprints.filter(s=>s.state==='active').length>1?'Several sprints are active. Select one above.':'No active sprint. Select another sprint above.'}</Text>:null}
    {data?.selectedSprintId && !data.issues.length?<Text style={muted}>No issues in this sprint are assigned to you.</Text>:null}
    {layout.compact&&!initialLoading?<ScrollView horizontal style={{flexGrow:0,maxHeight:48}} contentContainerStyle={{gap:8}}>{columns.map((c,index)=><Button key={index} theme={theme} label={`${selectedColumn===index?'✓ ':''}${c.name} · ${filtered.filter(i=>c.statusIds.includes(i.statusId)).length}`} onPress={()=>updateBoard(sprintKey,{columnKey:columnKeys[index]})}/>)}</ScrollView>:null}
    {initialLoading?<BoardLoading theme={theme} compact={layout.compact}/>:<BoardMoves disabled={twgReadOnly} site={data?.site??''} sprintId={data?.selectedSprintId??0} theme={theme} onChanged={()=>void board.refetch()}>
    <ScrollView horizontal={!layout.compact} style={{flex:1,minHeight:0}} contentContainerStyle={{gap:16,...(layout.compact?{}:{alignItems:'stretch' as const})}}>
      {columns.map((c,index)=>{
        if(layout.compact&&index!==selectedColumn)return null;
        const issues=filtered.filter(i=>c.statusIds.includes(i.statusId));
        return <DropColumn key={index} statusIds={c.statusIds} compact={layout.compact}>{hovered=><View style={{width:layout.compact?'100%':display.values.columnWidth,...(layout.compact?{}:{flex:1,minHeight:0}),backgroundColor:theme.colors.surface1,borderRadius:16,padding:12,gap:12}}>
          {hovered?<View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0,borderRadius:12,backgroundColor:'rgba(0,0,0,0.08)'}}/>:null}
          <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Text style={{...text,fontWeight:'700',flex:1}}>{c.name}</Text><Text style={muted}>{issues.length}</Text></View>
          <ScrollView testID={`board-column-${index}`} scrollEnabled={!layout.compact} style={layout.compact?undefined:{flex:1,minHeight:0}} contentContainerStyle={{gap:10,paddingBottom:8}}>
            {issues.map(i=><DragIssue key={i.key} issueKey={i.key} statusId={i.statusId}><IssueCard display={display.values} jiraUrl={`${data!.site}/browse/${encodeURIComponent(i.key)}`} activity={i.linkedWorkspace?activity.data?.[activityKey(i.linkedWorkspace)]:undefined} selected={selected?.issue.key===i.key} search={search} startAvailable={true} detailsAvailable={true} readOnly={twgReadOnly} onOpenDetails={()=>{setPanelCollapsed(false);setSelected({boardKey:sprintKey,issue:i,sprintId:data!.selectedSprintId!,site:data!.site});}} hostId={host.id} key={i.key} issue={i} mappingReady={projectMappings.status==='ready'} onConfigureMapping={projectMappings.status==='ready'&&!projectMappings.values.items.some(m=>m.jiraProjectKey===i.projectKey)?()=>{setMappingProject(i.projectKey);setEditing(true);}:undefined} theme={theme} navigation={navigation} sprintId={data!.selectedSprintId!} onOpenJira={()=>{setLinkError(undefined);void openExternal(`${data!.site}/browse/${encodeURIComponent(i.key)}`).catch(()=>setLinkError('Could not open Jira. Please try again.'));}} onStarted={()=>void board.refetch()}/></DragIssue>)}
            {!issues.length?<Text style={{...muted,paddingVertical:12}}>{search?'No matching issues':'No issues'}</Text>:null}
          </ScrollView>
        </View>}</DropColumn>;
      })}
    </ScrollView>
    </BoardMoves>}
  </View>
  {selected&&currentIssue&&preferences.status==='ready'&&availableWidth>0?<IssueDetails issueNavigation={{position:detailNav.index+1,total:detailNav.total,onPrevious:detailNav.previous?()=>goToIssue(detailNav.previous):undefined,onNext:detailNav.next?()=>goToIssue(detailNav.next):undefined}} startAvailable={true} readOnly={twgReadOnly} connectionRevision={revision} key={`${host.id}:${selected.sprintId}:${currentIssue.key}`} presentation={presentation} panelWidth={clampPanelWidth(panelWidth,availableWidth)} panelCollapsed={panelCollapsed} onTogglePanel={()=>setPanelCollapsed(value=>!value)} onResizePanel={width=>setPanelWidth(clampPanelWidth(width,availableWidth))} navigation={navigation} mappingReady={projectMappings.status==='ready'} onConfigureMapping={projectMappings.status==='ready'&&!projectMappings.values.items.some(m=>m.jiraProjectKey===currentIssue.projectKey)?()=>{setSelected(undefined);setMappingProject(currentIssue.projectKey);setEditing(true);}:undefined} onStarted={()=>void board.refetch()} hostId={host.id} issue={currentIssue} sprintId={selected.sprintId} theme={theme} onClose={()=>setSelected(undefined)} onOpenJira={()=>{void openExternal(`${selected.site}/browse/${currentIssue.key}`).catch(()=>setLinkError('Could not open Jira. Please try again.'));}}/>:null}
  </View>;
}
