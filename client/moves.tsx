import {radii,columnGeometry} from './radii';
import {Tooltip} from './tooltip';
import type {TransitionField} from '../shared/transition-fields';
import {openExternal} from './web';
import {createContext,useContext,useState,useEffect,useRef,createElement,type ReactNode} from 'react';
import {Platform,View,Text,Pressable} from 'react-native';
import {TransitionDialog} from './transition-dialog';
import {useRpc,type PluginScreenProps} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import {readMoves,moveIssue} from '../shared/moves';
type Option={id:string;name:string;statusId:string;column:string;development:boolean;existingWorkspace?:boolean;required:string[];destinations?:{projectId:string;name:string}[];fields?:TransitionField[]};
type MoveContext={begin:(key:string,statusId:string,existingWorkspace:boolean)=>void;drop:(statuses:string[])=>void;cancel:()=>void;allowed:(statuses:string[])=>boolean;busy:boolean;issueKey:string;dragging:boolean;end:()=>void};
const Context=createContext<MoveContext>({begin:()=>{},drop:()=>{},cancel:()=>{},allowed:()=>false,busy:false,issueKey:'',dragging:false,end:()=>{}});
function TransitionChoice({option,theme,disabled,onPress}:{option:Option;theme:PluginScreenProps['theme'];disabled:boolean;onPress:()=>void}){
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const c=theme.colors;
 return <Pressable accessibilityRole="button" accessibilityLabel={`Choose transition: ${option.name}`} accessibilityHint="Review this transition before confirming the move." accessibilityState={{disabled}} disabled={disabled} onPress={onPress} onHoverIn={()=>setHovered(true)} onHoverOut={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>({flexGrow:1,flexBasis:200,minWidth:0,minHeight:44,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:focused?c.accent:c.border,borderRadius:radii.control,backgroundColor:hovered||focused||pressed?c.surface2:c.surface0,opacity:disabled?.5:1})}>
  <Icon name="ArrowRight" size={18} color={c.accent}/>
  <Text style={{flex:1,minWidth:0,fontSize:14,lineHeight:20,color:c.foreground}}>{option.name}</Text>
  <Icon name="ChevronRight" size={16} color={c.foregroundMuted}/>
 </Pressable>;
}
export function BoardMoves({children,sprintId,theme,onChanged,onOptimistic,site,disabled=false}:{disabled?:boolean;children:ReactNode;site:string;sprintId:number;theme:PluginScreenProps['theme'];onChanged:()=>void;onOptimistic:(key:string,statusId:string|undefined,pending?:boolean)=>void}){
 const read=useRpc(readMoves),move=useRpc(moveIssue);
 const [dragging,setDragging]=useState(false);
 const [key,setKey]=useState(''),[options,setOptions]=useState<Option[]>([]),[targets,setTargets]=useState<string[]>();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [jiraTip,setJiraTip]=useState(false);
 const [panelWidth,setPanelWidth]=useState(0);
 const wide=panelWidth>=900;
 const [projectId,setProjectId]=useState<string>();
 const [selected,setSelected]=useState<Option>();const [values,setValues]=useState<Record<string,string>>({});
 const sourceStatus=useRef('');const existingWorkspace=useRef(false);const optimistic=useRef(false);
 const generation=useRef(0);const latest=useRef({key:'',options:[] as Option[]});
 function begin(issueKey:string,statusId:string,linked:boolean){
  if(busy||disabled)return;
  setDragging(true);sourceStatus.current=statusId;existingWorkspace.current=linked;optimistic.current=false;
  setProjectId(undefined);++generation.current;setKey(issueKey);setOptions([]);setTargets(undefined);setSelected(undefined);setValues({});setMessage('Choose a destination column.');latest.current={key:issueKey,options:[]};
 }
 function rollback(){if(optimistic.current){onOptimistic(latest.current.key,undefined);optimistic.current=false;}}
 async function resolve(ids:string[]){
  if(busy)return;setBusy(true);setTargets(ids);setMessage(optimistic.current?'Moving issue… Waiting for Jira.':'Checking this move with Jira…');
  try{
   const choices=(await read({key:latest.current.key,sprintId})).filter(o=>ids.includes(o.statusId));
   latest.current.options=choices;setOptions(choices);
   setMessage(choices.length?'':'Jira offers no transition to this column from the current status. The issue remains in its original position.');
   if(choices.length===1){
    const choice=choices[0];
    if(choice.existingWorkspace&&!choice.development&&!choice.required.length&&!choice.fields?.length){await execute(choice,true);}
    else{rollback();setSelected(choice);setValues({});}
   }else rollback();
  }catch(e){rollback();setMessage((e instanceof Error?e.message:String(e)).replace(/^.*?Request failed: /,'').replace(/\s+requestType=.*$/,''));}finally{setBusy(false);}
 }
 async function execute(option:Option,direct=false){
  if(busy&&!direct)return;setBusy(true);setMessage(optimistic.current?'Moving issue… Waiting for Jira.':'');
  try{const result=await move({key:latest.current.key,sprintId,transitionId:option.id,statusId:option.statusId,fields:direct?{}:values,...(option.existingWorkspace?{jiraOnly:true}:{}),...(projectId?{projectId}:{})});if(optimistic.current){onOptimistic(latest.current.key,option.statusId,false);optimistic.current=false;}setOptions([]);latest.current.options=[];setSelected(undefined);setMessage(result.warning??'Issue moved.');}
  catch(e){rollback();setMessage((e instanceof Error?e.message:String(e)).replace(/^.*?Request failed: /,'').replace(/\s+requestType=.*$/,''));
   if(!direct)try{const fresh=(await read({key:latest.current.key,sprintId})).find(o=>o.id===option.id&&o.statusId===option.statusId);if(fresh)setSelected(fresh);else setSelected(undefined);}catch{}
}
  finally{setBusy(false);onChanged();}
 }
 const allowed=(_ids:string[])=>!disabled&&!busy&&!!latest.current.key;
 function drop(ids:string[]){setDragging(false);if(!allowed(ids))return;if(ids.includes(sourceStatus.current)){cancel();return;}if(existingWorkspace.current&&ids.length){optimistic.current=true;onOptimistic(latest.current.key,ids[0]);}void resolve(ids);}
 function cancel(){if(busy)return;++generation.current;setSelected(undefined);setKey('');setOptions([]);setMessage('');latest.current={key:'',options:[]};}
 const controls=(  <View style={{flexDirection:'row',alignItems:'center',gap:0}}>
  <View style={{position:'relative'}}>
   {jiraTip?<Tooltip theme={theme} text="Open in Jira"/>:null}
   <Pressable accessibilityRole="link" accessibilityLabel={`Open ${key} in Jira`} onHoverIn={()=>setJiraTip(true)} onHoverOut={()=>setJiraTip(false)} onFocus={()=>setJiraTip(true)} onBlur={()=>setJiraTip(false)} onPress={()=>void openExternal(site+'/browse/'+key)} style={({pressed})=>({width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.control,backgroundColor:pressed?theme.colors.surface2:'transparent'})}><Icon name="ExternalLink" size={16} color={theme.colors.foregroundMuted}/></Pressable>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel="Dismiss move status" disabled={busy} onPress={cancel} style={({pressed})=>({width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.control,opacity:busy?.5:1,backgroundColor:pressed?theme.colors.surface2:'transparent'})}><Icon name="X" size={16} color={theme.colors.foregroundMuted}/></Pressable>
  </View>);
 const choices=options.length>1;
 return <Context.Provider value={{begin,drop,cancel,allowed,busy:busy||disabled,issueKey:key,dragging,end:()=>setDragging(false)}}>
 {key&&targets?<View testID="move-status-panel" onLayout={event=>setPanelWidth(event.nativeEvent.layout.width)} style={{width:'100%',paddingHorizontal:12,paddingVertical:8,gap:10,borderWidth:1,borderColor:theme.colors.border,borderRadius:radii.surface,backgroundColor:theme.colors.surface1,flexDirection:choices&&wide?'row':'column',alignItems:choices&&wide?'center':undefined}}>
 {choices?<>
  <View style={{flex:wide?1:undefined,maxWidth:wide?460:undefined,minWidth:0,gap:4}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
    <Text accessibilityRole="header" style={{flex:1,minWidth:0,fontSize:14,lineHeight:20,color:theme.colors.foreground}}>{key} · Choose a transition</Text>
    {!wide?controls:null}
   </View>
   <Text style={{fontSize:12,lineHeight:18,color:theme.colors.foregroundMuted}}>To {options[0].column} · Review before confirming</Text>
   {message?<Text accessibilityRole="alert" style={{fontSize:13,lineHeight:19,color:theme.colors.foregroundMuted}}>{message}</Text>:null}
  </View>
  <View style={{flex:wide?1:undefined,minWidth:0,flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(o=><TransitionChoice key={o.id} option={o} theme={theme} disabled={busy} onPress={()=>{setProjectId(undefined);setSelected(o);setValues({});setMessage('');}}/>)}</View>
  {wide?controls:null}
 </>:<View style={{flexDirection:'row',alignItems:'center',gap:8}}>
  <Icon name="Info" size={16} color={theme.colors.foregroundMuted}/>
  <Text accessibilityRole={message?'alert':undefined} style={{flex:1,minWidth:0,color:theme.colors.foregroundMuted,fontSize:13,lineHeight:19}}><Text style={{color:theme.colors.foreground}}>{key}</Text>{message?' · '+message:''}</Text>
  {controls}
 </View>}
 </View>:null}
 {selected?<TransitionDialog destinations={selected.destinations} projectId={projectId} onProjectChange={setProjectId} theme={theme} issueKey={key} site={site} column={selected.column} development={selected.development} fields={selected.fields??[]} values={values} message={message} busy={busy} onChange={(id,value)=>setValues(v=>({...v,[id]:value}))} onClose={()=>setSelected(undefined)} onConfirm={()=>void execute(selected)}/>:null}
 {children}
 </Context.Provider>;
}
export function DragIssue({issueKey,statusId,existingWorkspace=false,children}:{issueKey:string;statusId:string;existingWorkspace?:boolean;children:ReactNode}){
 const moves=useContext(Context);
 if(Platform.OS!=='web')return <>{children}</>;
 return createElement('div',{draggable:!moves.busy,onDragEnd:()=>moves.end(),onDragStart:(event:any)=>{event.dataTransfer.setData('text/plain',issueKey);event.dataTransfer.effectAllowed='move';moves.begin(issueKey,statusId,existingWorkspace);}},children);
}
export function DropColumn({statusIds,children,compact}:{statusIds:string[];children:(hovered:boolean)=>ReactNode;compact:boolean}){
 const moves=useContext(Context);
 const [hovered,setHovered]=useState(false);
 useEffect(()=>{if(!moves.dragging)setHovered(false);},[moves.dragging]);
 if(Platform.OS!=='web')return <>{children(false)}</>;
 return createElement('div',{style:{display:'flex',flexDirection:'column',borderRadius:columnGeometry.radius,flexShrink:0,minHeight:0,...(compact?{width:'100%'}:{height:'100%',overflow:'hidden'})},onDragLeave:(event:any)=>{if(!event.currentTarget.contains(event.relatedTarget))setHovered(false);},onDragOver:(event:any)=>{if(moves.allowed(statusIds)){event.preventDefault();setHovered(true);event.dataTransfer.dropEffect='move';}},onDrop:(event:any)=>{setHovered(false);event.preventDefault();if(event.dataTransfer.getData('text/plain')===moves.issueKey)moves.drop(statusIds);}},children(hovered&&moves.dragging));
}
