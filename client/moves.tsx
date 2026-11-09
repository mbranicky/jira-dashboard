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
type Option={id:string;name:string;statusId:string;column:string;development:boolean;required:string[];fields?:TransitionField[]};
type MoveContext={begin:(key:string,statusId:string)=>void;drop:(statuses:string[])=>void;cancel:()=>void;allowed:(statuses:string[])=>boolean;busy:boolean;issueKey:string;dragging:boolean;end:()=>void};
const Context=createContext<MoveContext>({begin:()=>{},drop:()=>{},cancel:()=>{},allowed:()=>false,busy:false,issueKey:'',dragging:false,end:()=>{}});
export function BoardMoves({children,sprintId,theme,onChanged,site,disabled=false}:{disabled?:boolean;children:ReactNode;site:string;sprintId:number;theme:PluginScreenProps['theme'];onChanged:()=>void}){
 const read=useRpc(readMoves),move=useRpc(moveIssue);
 const [dragging,setDragging]=useState(false);
 const [key,setKey]=useState(''),[options,setOptions]=useState<Option[]>([]),[targets,setTargets]=useState<string[]>();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [jiraTip,setJiraTip]=useState(false);
 const [selected,setSelected]=useState<Option>();const [values,setValues]=useState<Record<string,string>>({});
 const sourceStatus=useRef('');
 const generation=useRef(0);const latest=useRef({key:'',options:[] as Option[]});
 function begin(issueKey:string,statusId:string){
  if(busy||disabled)return;
  setDragging(true);sourceStatus.current=statusId;
  ++generation.current;setKey(issueKey);setOptions([]);setTargets(undefined);setSelected(undefined);setValues({});setMessage('Choose a destination column.');latest.current={key:issueKey,options:[]};
 }
 async function resolve(ids:string[]){
  if(busy)return;setBusy(true);setTargets(ids);setMessage('Checking this move with Jira…');
  try{
   const choices=(await read({key:latest.current.key,sprintId})).filter(o=>ids.includes(o.statusId));
   latest.current.options=choices;setOptions(choices);
   setMessage(choices.length?'':'Jira offers no transition to this column from the current status. The issue remains in its original position.');
   if(choices.length===1){setSelected(choices[0]);setValues({});}
  }catch(e){setMessage((e instanceof Error?e.message:String(e)).replace(/^.*?Request failed: /,'').replace(/\s+requestType=.*$/,''));}finally{setBusy(false);}
 }
 async function execute(option:Option){
  if(busy)return;setBusy(true);setMessage('');
  try{const result=await move({key:latest.current.key,sprintId,transitionId:option.id,statusId:option.statusId,fields:values});setOptions([]);latest.current.options=[];setSelected(undefined);setMessage(result.warning??'Issue moved.');}
  catch(e){setMessage((e instanceof Error?e.message:String(e)).replace(/^.*?Request failed: /,'').replace(/\s+requestType=.*$/,''));
   try{const fresh=(await read({key:latest.current.key,sprintId})).find(o=>o.id===option.id&&o.statusId===option.statusId);if(fresh)setSelected(fresh);else setSelected(undefined);}catch{}
}
  finally{setBusy(false);onChanged();}
 }
 const allowed=(_ids:string[])=>!disabled&&!busy&&!!latest.current.key;
 function drop(ids:string[]){setDragging(false);if(!allowed(ids))return;if(ids.includes(sourceStatus.current)){cancel();return;}void resolve(ids);}
 function cancel(){if(busy)return;++generation.current;setSelected(undefined);setKey('');setOptions([]);setMessage('');latest.current={key:'',options:[]};}
 return <Context.Provider value={{begin,drop,cancel,allowed,busy:busy||disabled,issueKey:key,dragging,end:()=>setDragging(false)}}>
 {key&&targets?<View style={{paddingHorizontal:12,paddingVertical:4,gap:4,borderWidth:1,borderColor:theme.colors.border,borderRadius:radii.control}}>
 <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
  <Icon name="Info" size={16} color={theme.colors.foregroundMuted}/>
  <Text accessibilityRole={message?'alert':undefined} style={{flex:1,minWidth:0,color:theme.colors.foregroundMuted,fontSize:13,lineHeight:19,paddingVertical:6}}><Text style={{color:theme.colors.foreground,fontWeight:'600'}}>{key}</Text>{message?' · '+message:''}</Text>
  <View style={{flexDirection:'row',alignItems:'center',gap:0}}>
  <View style={{position:'relative'}}>
   {jiraTip?<Tooltip theme={theme} text="Open in Jira"/>:null}
   <Pressable accessibilityRole="link" accessibilityLabel={`Open ${key} in Jira`} onHoverIn={()=>setJiraTip(true)} onHoverOut={()=>setJiraTip(false)} onFocus={()=>setJiraTip(true)} onBlur={()=>setJiraTip(false)} onPress={()=>void openExternal(site+'/browse/'+key)} style={({pressed})=>({width:28,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.control,backgroundColor:pressed?theme.colors.surface2:'transparent'})}><Icon name="ExternalLink" size={16} color={theme.colors.foregroundMuted}/></Pressable>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel="Dismiss move status" disabled={busy} onPress={cancel} style={({pressed})=>({width:28,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.control,opacity:busy?.5:1,backgroundColor:pressed?theme.colors.surface2:'transparent'})}><Icon name="X" size={16} color={theme.colors.foregroundMuted}/></Pressable>
  </View>
 </View>
 {options.length>1?<View style={{gap:8,paddingBottom:8}}>{options.map(o=><Pressable key={o.id} accessibilityRole="button" disabled={busy} onPress={()=>{setSelected(o);setValues({});setMessage('');}} style={{padding:12,minHeight:44}}><Text style={{color:theme.colors.foreground}}>{o.name} → {o.column}</Text></Pressable>)}</View>:null}
 </View>:null}
 {selected?<TransitionDialog theme={theme} issueKey={key} site={site} column={selected.column} development={selected.development} fields={selected.fields??[]} values={values} message={message} busy={busy} onChange={(id,value)=>setValues(v=>({...v,[id]:value}))} onClose={()=>setSelected(undefined)} onConfirm={()=>void execute(selected)}/>:null}
 {children}
 </Context.Provider>;
}
export function DragIssue({issueKey,statusId,children}:{issueKey:string;statusId:string;children:ReactNode}){
 const moves=useContext(Context);
 if(Platform.OS!=='web')return <>{children}</>;
 return createElement('div',{draggable:!moves.busy,onDragEnd:()=>moves.end(),onDragStart:(event:any)=>{event.dataTransfer.setData('text/plain',issueKey);event.dataTransfer.effectAllowed='move';moves.begin(issueKey,statusId);}},children);
}
export function DropColumn({statusIds,children,compact}:{statusIds:string[];children:(hovered:boolean)=>ReactNode;compact:boolean}){
 const moves=useContext(Context);
 const [hovered,setHovered]=useState(false);
 useEffect(()=>{if(!moves.dragging)setHovered(false);},[moves.dragging]);
 if(Platform.OS!=='web')return <>{children(false)}</>;
 return createElement('div',{style:{display:'flex',flexDirection:'column',borderRadius:columnGeometry.radius,flexShrink:0,minHeight:0,...(compact?{width:'100%'}:{height:'100%',overflow:'hidden'})},onDragLeave:(event:any)=>{if(!event.currentTarget.contains(event.relatedTarget))setHovered(false);},onDragOver:(event:any)=>{if(moves.allowed(statusIds)){event.preventDefault();setHovered(true);event.dataTransfer.dropEffect='move';}},onDrop:(event:any)=>{setHovered(false);event.preventDefault();if(event.dataTransfer.getData('text/plain')===moves.issueKey)moves.drop(statusIds);}},children(hovered&&moves.dragging));
}
