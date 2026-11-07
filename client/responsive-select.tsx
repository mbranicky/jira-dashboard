import {OverlayMenu} from './overlay-menu';
import {useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Icon,SettingsSelect} from '@getpaseo/plugin/client/ui';
import type {SettingsTheme} from './settings-ui';

type Props={theme:SettingsTheme;compact?:boolean;inline?:boolean;label:string;value:string;options:{label:string;value:string}[];disabled?:boolean;onValueChange:(value:string)=>void};
export function ResponsiveSelect({theme,compact,inline,...props}:Props){
 const [open,setOpen]=useState(false);
 if(!compact&&!inline)return <SettingsSelect {...props}/>;
 const {label,value,options,disabled,onValueChange}=props;
 return <View style={{gap:8,flexDirection:inline?'row':'column',alignItems:inline?'center':'stretch'}}>
  <Text style={{color:theme.colors.foreground}}>{label}</Text>
  <OverlayMenu open={open&&!disabled} onOpenChange={setOpen} theme={theme} trigger={toggle=><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(o=>o.value===value)?.label??value}`} accessibilityState={{expanded:open,disabled}} disabled={disabled} onPress={toggle} style={({pressed})=>({minHeight:inline?34:44,paddingHorizontal:10,paddingVertical:inline?6:12,borderRadius:8,borderWidth:1,borderColor:theme.colors.border,backgroundColor:pressed?theme.colors.surface2:theme.colors.surface0,flexDirection:'row',alignItems:'center',gap:8,opacity:disabled?.5:1})}>
   <Text style={{color:theme.colors.foreground,flex:1,fontSize:14}}>{options.find(o=>o.value===value)?.label??value}</Text><Icon name={open?'ChevronUp':'ChevronDown'} size={16} color={theme.colors.foregroundMuted}/>
  </Pressable>}>
  <ScrollView nestedScrollEnabled style={{maxHeight:220}} keyboardShouldPersistTaps="handled">
   {options.map(option=><Pressable key={option.value} accessibilityRole="button" accessibilityState={{selected:value===option.value}} onPress={()=>{onValueChange(option.value);setOpen(false);}} style={({pressed})=>({minHeight:44,padding:12,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:pressed?theme.colors.surface2:theme.colors.surface0})}><Text style={{color:theme.colors.foreground,flex:1,fontSize:14}}>{option.label}</Text>{value===option.value?<Icon name="Check" size={16} color={theme.colors.accent}/>:null}</Pressable>)}
  </ScrollView></OverlayMenu>
 </View>;
}
