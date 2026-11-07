import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {Tooltip} from './tooltip';
import type {SettingsTheme} from './settings-ui';

export function IconAction({theme,label,icon,onPress,align='right'}:{theme:SettingsTheme;label:string;icon:string;onPress:()=>void;align?:'left'|'right'}){
 const [tip,setTip]=useState(false);
 return <View style={{position:'relative',flexShrink:0,zIndex:tip?10:0}}>
  {tip?<Tooltip theme={theme} text={label} align={align} placement="below" offset={46}/>:null}
  <Pressable accessibilityRole="button" accessibilityLabel={label} onHoverIn={()=>setTip(true)} onHoverOut={()=>setTip(false)} onFocus={()=>setTip(true)} onBlur={()=>setTip(false)} onLongPress={()=>setTip(true)} onPress={()=>{setTip(false);onPress();}} style={({pressed})=>({width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:pressed||tip?theme.colors.surface2:'transparent',transform:[{scale:pressed?.96:1}]})}><Icon name={icon} size={18} color={theme.colors.foregroundMuted}/></Pressable>
 </View>;
}
