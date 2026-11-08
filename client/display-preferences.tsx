import {ResponsiveSelect} from './responsive-select';
import {useSyncExternalStore} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import {createDisplayStore,type DisplayPreferences} from '../shared/display-preferences';
import {localDraftStorage} from './web';
import {type SettingsTheme} from './settings-ui';
import {IssueCard} from './issue-card';
const store=createDisplayStore(localDraftStorage);
export function useDisplayPreferences(hostId:string){
 const snapshot=useSyncExternalStore(store.subscribe,()=>store.read(hostId));
 return {...snapshot,update:(values:DisplayPreferences)=>store.update(hostId,values)};
}
const sample={key:'DEMO-42',summary:'Make the next sprint easier to navigate',statusId:'1',status:'In progress',type:'Story',priority:'Medium',projectKey:'DEMO',parent:{key:'DEMO-1',summary:'Workspace improvements'},fixVersions:['Next release'],labels:['experience']};
export function DisplayPreferencesControls({hostId,theme}:{hostId:string;theme:SettingsTheme}){
 const compact=useWindowDimensions().width<760;const {values,update,durable}=useDisplayPreferences(hostId);const c=theme.colors;
 return <View style={{gap:10}}>
   <Text accessibilityRole="header" style={{fontSize:15,fontWeight:'600',color:c.foreground}}>Board and cards</Text>
   <Text style={{fontSize:12,color:c.foregroundMuted}}>{durable?'Saved on this device for this host.':'Kept for this session only; device storage is unavailable.'} Other users are unaffected.</Text>
   <View style={{flexDirection:compact?'column':'row',gap:16,alignItems:'flex-start'}}>
   <View style={{flex:1,minWidth:0,width:'100%',gap:8}}>
   <ResponsiveSelect compact theme={theme} label="Card spacing" value={values.density} options={[{label:'Compact',value:'compact'},{label:'Comfortable',value:'comfortable'}]} onValueChange={density=>update({...values,density:density as DisplayPreferences['density']})}/>
   <ResponsiveSelect compact theme={theme} label="Desktop column width" value={String(values.columnWidth)} options={[{label:'Narrow',value:'260'},{label:'Standard',value:'300'},{label:'Wide',value:'360'}]} onValueChange={width=>update({...values,columnWidth:Number(width) as DisplayPreferences['columnWidth']})}/>
   <View style={{flexDirection:'row',flexWrap:'wrap',columnGap:20,rowGap:0}}>
   {(['showParent','showTags'] as const).map(field=><Pressable key={field} accessibilityRole="checkbox" aria-checked={values[field]} accessibilityState={{checked:values[field]}} accessibilityLabel={field==='showParent'?'Show parent':'Show tags'} onPress={()=>update({...values,[field]:!values[field]})} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:8}}><Icon name={values[field]?'SquareCheck':'Square'} size={18} color={c.accent}/><Text style={{fontSize:13,color:c.foreground}}>{field==='showParent'?'Show parent':'Show tags'}</Text></Pressable>)}
   </View>
   </View>
   <View testID="appearance-preview" style={{width:compact?'100%':values.columnWidth,maxWidth:'100%',gap:10}}>
   <Text style={{fontSize:12,color:c.foregroundMuted}}>Live preview · sample issue</Text>
   <IssueCard display={values} preview hostId={hostId} theme={theme} navigation={undefined} issue={sample} detailsAvailable={false} startAvailable={false} mappingReady={false} sprintId={0} onOpenDetails={()=>{}} onOpenJira={()=>{}} onStarted={()=>{}}/>
   </View>
   </View>
 </View>;
}
