import {useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {IconAction} from './icon-action';
import {OverlayMenu} from './overlay-menu';
import type {SettingsTheme} from './settings-ui';
export function MobileColumns({theme,columns,selected,onChange}:{theme:SettingsTheme;columns:{name:string;count:number}[];selected:number;onChange:(index:number)=>void}){
 const [open,setOpen]=useState(false);const current=columns[selected];const c=theme.colors;
 if(!current)return null;
 return <View testID="mobile-column-navigation" style={{flexDirection:'row',alignItems:'center',gap:4}}>
  <IconAction theme={theme} label="Previous column" icon="ChevronLeft" disabled={selected===0} onPress={()=>onChange(selected-1)}/>
  <View style={{flex:1,minWidth:0}}><OverlayMenu theme={theme} open={open} onOpenChange={setOpen} trigger={toggle=><Pressable accessibilityRole="button" accessibilityLabel={`Choose column: ${current.name}, ${current.count} issues, ${selected+1} of ${columns.length}`} aria-expanded={open} onPress={toggle} style={{minHeight:44,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:c.border,backgroundColor:c.surface1,flexDirection:'row',alignItems:'center',gap:8}}>
   <Text numberOfLines={1} style={{flex:1,fontSize:13,fontWeight:'600',color:c.foreground}}>{current.name}</Text><Text style={{fontSize:12,color:c.foregroundMuted,fontVariant:['tabular-nums']}}>{current.count}</Text><Icon name="ChevronDown" size={16} color={c.foregroundMuted}/>
  </Pressable>}><ScrollView style={{maxHeight:260}} keyboardShouldPersistTaps="handled">{columns.map((column,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={`Column: ${column.name}, ${column.count} issues`} aria-pressed={index===selected} onPress={()=>{onChange(index);setOpen(false);}} style={{minHeight:44,padding:12,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:index===selected?c.surface2:'transparent'}}><Text style={{flex:1,fontSize:13,color:c.foreground}}>{column.name}</Text><Text style={{fontSize:12,color:c.foregroundMuted}}>{column.count}</Text>{index===selected?<Icon name="Check" size={16} color={c.accent}/>:null}</Pressable>)}</ScrollView></OverlayMenu></View>
  <IconAction theme={theme} label="Next column" icon="ChevronRight" disabled={selected===columns.length-1} onPress={()=>onChange(selected+1)}/>
 </View>;
}
