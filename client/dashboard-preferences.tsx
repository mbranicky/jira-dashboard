import {DisplayPreferencesControls} from './display-preferences';
import {useSettings} from '@getpaseo/plugin/client';
import type {PluginSurfaceProps} from '@getpaseo/plugin/client';
import {Pressable,Text,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {dashboardPreferences} from '../shared/contracts';
import {SectionTitle,Action} from './settings-ui';

export function DashboardPreferences({hostId,theme,layout}:Pick<PluginSurfaceProps,'theme'|'layout'>&{hostId:string}){
 const settings=useSettings(dashboardPreferences);const c=theme.colors;
 return <View testID="dashboard-appearance" style={{padding:layout.compact?16:24,gap:16,maxWidth:960,width:'100%',alignSelf:'center'}}>
  <SectionTitle theme={theme} icon="PanelsTopLeft" title="Dashboard appearance" description="Make the board comfortable to browse. Changes apply automatically."/>
  <View style={{padding:16,borderRadius:16,backgroundColor:c.surface1,gap:16}}>
  <DisplayPreferencesControls hostId={hostId} theme={theme}/>
  </View>
  <View style={{padding:16,borderRadius:16,backgroundColor:c.surface1,gap:12}}>
  <Text accessibilityRole="header" style={{fontSize:15,fontWeight:'600',color:c.foreground}}>Issue details</Text>
  <Text style={{color:c.foregroundMuted,fontSize:13}}>Choose where ticket details open when you select a card title.</Text>
  {settings.status==='ready'?<>
   <View style={{flexDirection:layout.compact?'column':'row',gap:12}}>
    {([{value:'modal',title:'Modal dialog',description:'A spacious view over the board.',icon:'Maximize2'},{value:'panel',title:'Right side panel',description:'Keep the board visible while browsing issues.',icon:'PanelRight'}] as const).map(option=>{
     const selected=settings.values.detailsView===option.value;
     return <Pressable key={option.value} accessibilityRole="radio" aria-checked={selected} accessibilityState={{checked:selected,disabled:settings.saving}} disabled={settings.saving} onPress={()=>void settings.save({...settings.values,detailsView:option.value},settings.revision)} style={({pressed})=>({flex:layout.compact?undefined:1,flexDirection:'row',alignItems:'center',gap:12,padding:16,borderRadius:12,borderWidth:1,borderColor:selected?c.accent:c.border,backgroundColor:pressed?c.surface2:c.surface1})}>
      <Icon name={option.icon} size={22} color={selected?c.accent:c.foregroundMuted}/><View style={{flex:1,gap:4}}><Text style={{color:c.foreground,fontWeight:'600',fontSize:14}}>{option.title}</Text><Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>{option.description}</Text></View>{selected?<Icon name="Check" size={17} color={c.accent}/>:<View style={{width:17}}/>}
     </Pressable>;
    })}
   </View>
   <Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>Saved automatically for this host. On narrow screens, details fill the screen in either mode.</Text>
   {settings.saveError?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{String(settings.saveError)}</Text>:null}
  </>:settings.status==='loading'?<Text style={{color:c.foregroundMuted}}>Loading appearance…</Text>:<Action theme={theme} icon="RefreshCw" label="Retry appearance settings" onPress={()=>void settings.reload()}/>}
  </View>
 </View>;
}
