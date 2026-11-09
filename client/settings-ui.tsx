import {radii} from './radii';
import {useReducedMotion} from './motion';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {PluginSurfaceProps} from '@getpaseo/plugin/client';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
export type SettingsTheme=PluginSurfaceProps['theme'];
export function Action({theme,label,icon,onPress,disabled=false,primary=false,danger=false,flushLeft=false,paddingRight=14,paddingLeft=14,dense=false}:{theme:SettingsTheme;label:string;icon:string;onPress:()=>void;disabled?:boolean;primary?:boolean;danger?:boolean;flushLeft?:boolean;paddingRight?:number;paddingLeft?:number;dense?:boolean}){
 const reduced=useReducedMotion();const touchLayout=useWindowDimensions().width<760;
 const color=primary?theme.colors.accentForeground:danger?theme.colors.statusDanger:theme.colors.foreground;
 return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>({alignSelf:'flex-start',minHeight:dense&&!touchLayout?34:44,paddingLeft:flushLeft?0:paddingLeft,paddingRight,paddingVertical:dense?6:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderRadius:radii.control,backgroundColor:primary?theme.colors.accent:pressed?theme.colors.surface2:'transparent',opacity:disabled?.5:1,transform:[{scale:pressed&&!reduced?.96:1}]})}><Icon name={icon} size={17} color={color}/><Text style={{color,fontWeight:'400',fontSize:14}}>{label}</Text></Pressable>;
}
export function SectionTitle({theme,icon,title,description}:{theme:SettingsTheme;icon:string;title:string;description:string}){return <View style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}><View style={{padding:10,borderRadius:radii.control,backgroundColor:theme.colors.surface2}}><Icon name={icon} size={20} color={theme.colors.accent}/></View><View style={{flex:1,gap:4}}><Text style={{color:theme.colors.foreground,fontSize:19,fontWeight:'700'}}>{title}</Text><Text style={{color:theme.colors.foregroundMuted,fontSize:13,lineHeight:19}}>{description}</Text></View></View>;}
