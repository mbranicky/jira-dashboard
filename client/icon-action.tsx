import {radii} from './radii';
import {useReducedMotion} from './motion';
import {useState,useRef,useEffect} from 'react';
import {Pressable,View,useWindowDimensions} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {Tooltip} from './tooltip';
import type {SettingsTheme} from './settings-ui';

export function IconAction({theme,label,icon,onPress,align='right',dense=false,disabled=false,focusOnMount=false,compactVisual=false}:{theme:SettingsTheme;label:string;icon:string;onPress:()=>void;align?:'left'|'right';dense?:boolean;disabled?:boolean;focusOnMount?:boolean;compactVisual?:boolean}){
 const button=useRef<View>(null);
 useEffect(()=>{if(focusOnMount)button.current?.focus();},[focusOnMount]);
 const reduced=useReducedMotion();const touchLayout=useWindowDimensions().width<760;
 const [tip,setTip]=useState(false);
 return <View style={{position:'relative',flexShrink:0,zIndex:tip?10:0}}>
  {tip?<Tooltip theme={theme} text={label} align={align} placement="below" offset={dense&&!touchLayout?36:46}/>:null}
  <Pressable ref={button} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} onHoverIn={()=>setTip(true)} onHoverOut={()=>setTip(false)} onFocus={()=>setTip(true)} onBlur={()=>setTip(false)} onLongPress={()=>setTip(true)} onPress={()=>{setTip(false);onPress();}} style={({pressed})=>({opacity:disabled?.4:1,width:dense&&!touchLayout?34:44,height:dense&&!touchLayout?34:44,alignItems:'center',justifyContent:'center',borderRadius:compactVisual?radii.cardAction:radii.control,backgroundColor:!compactVisual&&(pressed||tip)?theme.colors.surface2:'transparent',transform:[{scale:pressed&&!reduced?.96:1}]})}><View style={compactVisual?{width:30,height:30,borderRadius:radii.cardAction,alignItems:'center',justifyContent:'center',backgroundColor:tip?theme.colors.surface2:'transparent'}:undefined}><Icon name={icon} size={compactVisual?16:18} color={theme.colors.foregroundMuted}/></View></Pressable>
 </View>;
}
