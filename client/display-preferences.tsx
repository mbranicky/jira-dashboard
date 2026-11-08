import {useState,useSyncExternalStore} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {createDisplayStore,defaultDisplayPreferences,type DisplayPreferences} from '../shared/display-preferences';
import {localDraftStorage} from './web';
import {OverlayMenu} from './overlay-menu';
import {IconAction} from './icon-action';
import {Action,type SettingsTheme} from './settings-ui';
import {IssueCard} from './issue-card';
const store=createDisplayStore(localDraftStorage);
export function useDisplayPreferences(hostId:string){
 const snapshot=useSyncExternalStore(store.subscribe,()=>store.read(hostId));
 return {...snapshot,update:(values:DisplayPreferences)=>store.update(hostId,values)};
}
const sample={key:'DEMO-42',summary:'Make the next sprint easier to navigate',statusId:'1',status:'In progress',type:'Story',priority:'Medium',projectKey:'DEMO',parent:{key:'DEMO-1',summary:'Workspace improvements'},fixVersions:['Next release'],labels:['experience']};
export function DisplayPreferencesMenu({hostId,theme}:{hostId:string;theme:SettingsTheme}){
 const [open,setOpen]=useState(false);const {values,update,durable}=useDisplayPreferences(hostId);const c=theme.colors;
 const choice=(label:string,selected:boolean,onPress:()=>void)=><Pressable key={label} accessibilityRole="radio" aria-checked={selected} accessibilityLabel={label} onPress={onPress} style={{minHeight:40,paddingHorizontal:10,justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:selected?c.accent:c.border,backgroundColor:selected?c.surface2:c.surface1}}><Text style={{fontSize:13,color:c.foreground}}>{label}</Text></Pressable>;
 return <OverlayMenu theme={theme} open={open} onOpenChange={setOpen} maxHeight={620} preferredWidth={values.columnWidth+24} trigger={toggle=><IconAction theme={theme} label="Display preferences" icon="SlidersHorizontal" onPress={toggle}/>}>
  <ScrollView style={{maxHeight:600}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:12,gap:12}}>
   <Text style={{fontSize:15,fontWeight:'600',color:c.foreground}}>Display preferences</Text>
   <Text style={{fontSize:12,color:c.foregroundMuted}}>{durable?'Saved on this device for this host.':'Kept for this session only; device storage is unavailable.'} Other users are unaffected.</Text>
   <Text style={{fontSize:12,color:c.foregroundMuted}}>Card spacing</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['compact','comfortable'] as const).map(density=>choice(density==='compact'?'Compact':'Comfortable',values.density===density,()=>update({...values,density})))}</View>
   <Text style={{fontSize:12,color:c.foregroundMuted}}>Desktop column width</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{([260,300,360] as const).map((columnWidth,index)=>choice(['Narrow','Standard','Wide'][index],values.columnWidth===columnWidth,()=>update({...values,columnWidth})))}</View>
   {(['showParent','showTags'] as const).map(field=><Pressable key={field} accessibilityRole="checkbox" aria-checked={values[field]} accessibilityLabel={field==='showParent'?'Show parent':'Show tags'} onPress={()=>update({...values,[field]:!values[field]})} style={{minHeight:40,flexDirection:'row',alignItems:'center',gap:8}}><Icon name={values[field]?'SquareCheck':'Square'} size={18} color={c.accent}/><Text style={{fontSize:13,color:c.foreground}}>{field==='showParent'?'Show parent':'Show tags'}</Text></Pressable>)}
   <Text style={{fontSize:12,color:c.foregroundMuted}}>Preview · sample issue</Text>
   <IssueCard display={values} preview hostId={hostId} theme={theme} navigation={undefined} issue={sample} detailsAvailable={false} startAvailable={false} mappingReady={false} sprintId={0} onOpenDetails={()=>{}} onOpenJira={()=>{}} onStarted={()=>{}}/>
   <View style={{flexDirection:'row',justifyContent:'space-between'}}><Action theme={theme} label="Reset display" icon="RotateCcw" onPress={()=>update(defaultDisplayPreferences)}/><Action theme={theme} label="Done" icon="Check" onPress={()=>setOpen(false)}/></View>
  </ScrollView>
 </OverlayMenu>;
}
