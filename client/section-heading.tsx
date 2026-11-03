import {Pressable,Text} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {Action} from './settings-ui';
export function SectionHeading({title,expanded,onPress,theme,icon}:{title:string;expanded:boolean;onPress:()=>void;theme:Parameters<typeof Action>[0]['theme'];icon?:string}){
 const c=theme.colors;
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded}} onPress={onPress} style={({pressed})=>({flex:1,minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderRadius:6,opacity:pressed?.7:1})}><Icon name={expanded?'ChevronDown':'ChevronRight'} size={16} color={c.foregroundMuted}/>{icon?<Icon name={icon} size={16} color={c.foregroundMuted}/>:null}<Text style={{color:c.foreground,fontSize:16,fontWeight:'600',flexShrink:1}}>{title}</Text></Pressable>;
}
