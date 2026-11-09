import {radii} from './radii';
import {createElement,useMemo,useRef,useState,type ReactNode} from 'react';
import {PanResponder,Pressable,ScrollView,Text,View,Platform} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {Tooltip} from './tooltip';
import type {SettingsTheme} from './settings-ui';

export function DetailsPanel({theme,issueKey,width,collapsed,onToggle,onResize,children}:{theme:SettingsTheme;issueKey:string;width:number;collapsed:boolean;onToggle:()=>void;onResize:(width:number)=>void;children:ReactNode}){
 const c=theme.colors;const start=useRef(width);const latest=useRef({width,onResize});latest.current={width,onResize};const [dragging,setDragging]=useState(false);const [hover,setHover]=useState(false);const [tip,setTip]=useState(false);
 const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponderCapture:()=>true,onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:()=>{setDragging(true);start.current=latest.current.width;},onPanResponderMove:(_,gesture)=>latest.current.onResize(start.current-gesture.dx),onPanResponderRelease:()=>setDragging(false),onPanResponderTerminate:()=>setDragging(false),onPanResponderTerminationRequest:()=>false}),[]);
 const label=collapsed?'Expand issue details':'Collapse issue details';
 return <View testID="details-panel" style={{width:collapsed?48:width,flexShrink:0,minHeight:0,borderLeftWidth:1,borderLeftColor:c.border,backgroundColor:c.surface0}}>
  {Platform.OS==='web'&&dragging?createElement('style',null,'html, body, body * { cursor: col-resize !important; user-select: none !important; }'):null}
  <View style={{height:52,paddingHorizontal:4,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:c.border}}>
   <View style={{position:'relative'}}>{tip?<Tooltip theme={theme} text={label} placement="below" align="left" offset={44}/>:null}
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded:!collapsed}} onHoverIn={()=>setTip(true)} onHoverOut={()=>setTip(false)} onFocus={()=>setTip(true)} onBlur={()=>setTip(false)} onPress={()=>{setTip(false);onToggle();}} style={({pressed})=>({width:40,height:40,borderRadius:radii.control,alignItems:'center',justifyContent:'center',backgroundColor:pressed?c.surface2:'transparent'})}><Icon name={collapsed?'PanelRightOpen':'PanelRightClose'} size={18} color={c.foregroundMuted}/></Pressable>
   </View>
   {!collapsed?<><Icon name="FileText" size={16} color={c.accent}/><Text accessibilityRole="header" style={{flex:1,color:c.foreground,fontSize:13,fontWeight:'600'}}>{issueKey}</Text></>:null}
  </View>
  <View style={{display:collapsed?'none':'flex',flex:1,minHeight:0}}><ScrollView testID="details-panel-scroll" keyboardShouldPersistTaps="handled" style={{flex:1,minHeight:0}} contentContainerStyle={{padding:16,gap:18,alignItems:'stretch'}}>{children}</ScrollView></View>
  {!collapsed?<View {...responder.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Resize issue details panel" accessibilityHint="Drag left to widen or right to narrow" accessibilityValue={{now:Math.round(width)}} accessibilityActions={[{name:'increment',label:'Widen panel'},{name:'decrement',label:'Narrow panel'}]} onAccessibilityAction={event=>onResize(width+(event.nativeEvent.actionName==='increment'?40:-40))} style={{position:'absolute',left:-4,top:52,bottom:0,width:8,zIndex:2,...(Platform.OS==='web'?{cursor:'col-resize' as any}: {})}}><Pressable onHoverIn={()=>setHover(true)} onHoverOut={()=>setHover(false)} style={{flex:1,alignItems:'center',...(Platform.OS==='web'?{cursor:'col-resize' as any}:{})}}><View pointerEvents="none" style={{width:2,flex:1,backgroundColor:hover?c.accent:'transparent'}}/></Pressable></View>:null}
 </View>;
}
