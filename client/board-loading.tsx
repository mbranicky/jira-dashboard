import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import type {SettingsTheme} from './settings-ui';

/** Neutral placeholders: actual column names arrive with the Jira board. */
export function BoardLoading({theme,compact}:{theme:SettingsTheme;compact:boolean}){
 const c=theme.colors;
 return <View accessibilityLabel="Loading Jira dashboard" accessibilityState={{busy:true}} style={{flex:1,minHeight:0,gap:12}}>
  <View accessibilityLiveRegion="polite" style={{flexDirection:'row',alignItems:'center',gap:8}}><ActivityIndicator size="small" color={c.accent}/><Text style={{color:c.foregroundMuted,fontSize:13}}>Loading your Jira board…</Text></View>
  <ScrollView horizontal={!compact} style={{flex:1,minHeight:0}} contentContainerStyle={{gap:16,alignItems:'stretch',...(compact?{flexGrow:1}:{})}}>
   {Array.from({length:compact?1:6},(_,index)=><View key={index} accessible={false} style={{width:compact?'100%':300,minHeight:240,backgroundColor:c.surface1,borderRadius:12,padding:12}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:16}}><View style={{height:14,width:[112,76,168,96,104,184][index],borderRadius:4,backgroundColor:c.surface2}}/><View style={{width:16,height:14,borderRadius:4,backgroundColor:c.surface2}}/></View>
   </View>)}
  </ScrollView>
 </View>;
}
