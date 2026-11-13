import {ProjectChoices,type ProjectChoice} from './project-choices';
import {radii} from './radii';
import {Tooltip} from './tooltip';
import {FocusScope} from './focus-scope';
import {OverlayMenu} from './overlay-menu';
import {useState} from 'react';
import {ActivityIndicator,Modal,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {PluginScreenProps} from '@getpaseo/plugin/client';
import {visibleTransitionChoices,type TransitionField} from '../shared/transition-fields';
import {openExternal} from './web';

type Theme=PluginScreenProps['theme'];
type Props={destinations?:ProjectChoice[];projectId?:string;onProjectChange?:(id:string)=>void;theme:Theme;issueKey:string;site:string;column:string;development:boolean;fields:TransitionField[];values:Record<string,string>;message:string;busy:boolean;onChange:(id:string,value:string)=>void;onClose:()=>void;onConfirm:()=>void};

function ChoiceField({field,value,onChange,theme,disabled}:{field:TransitionField;value:string;onChange:(value:string)=>void;theme:Theme;disabled:boolean}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState('');
 const c=theme.colors,selected=value.split(',').filter(Boolean);
 const labels=field.choices.filter(option=>selected.includes(option.value)).map(option=>option.label);
 const options=visibleTransitionChoices(field,value).filter(option=>option.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <OverlayMenu open={open&&!disabled} onOpenChange={setOpen} theme={theme} maxHeight={300} trigger={toggle=><Pressable accessibilityRole="button" accessibilityLabel={`${field.name}: ${labels.join(', ')||'Not selected'}`} accessibilityState={{expanded:open,disabled}} disabled={disabled} onPress={toggle} style={({pressed})=>({minHeight:44,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:open?c.accent:c.border,borderRadius:radii.control,backgroundColor:pressed?c.surface2:c.surface0,flexDirection:'row',alignItems:'center',gap:10})}>
   <Text style={{flex:1,fontSize:14,lineHeight:20,color:labels.length?c.foreground:c.foregroundMuted}}>{labels.join(', ')||'Select '+field.name.toLowerCase()+'…'}</Text>
   <Icon name={open?'ChevronUp':'ChevronDown'} size={16} color={c.foregroundMuted}/>
  </Pressable>}>
  <View style={{flexShrink:1,minHeight:0,overflow:'hidden'}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,borderBottomWidth:1,borderColor:c.border}}><Icon name="Search" size={16} color={c.foregroundMuted}/><TextInput accessibilityLabel={`Search ${field.name}`} placeholder="Search options…" placeholderTextColor={c.foregroundMuted} value={search} onChangeText={setSearch} style={{flex:1,minHeight:44,color:c.foreground,fontSize:14}}/></View>
   <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:180}}>
    {options.map(option=>{const checked=selected.includes(option.value);return <Pressable key={option.value} accessibilityRole={field.kind==='multi'?'checkbox':'radio'} accessibilityState={{checked,disabled}} disabled={disabled} onPress={()=>{onChange(field.kind==='choice'?option.value:checked?selected.filter(id=>id!==option.value).join(','):[...selected,option.value].join(','));if(field.kind==='choice')setOpen(false);}} style={({pressed})=>({minHeight:44,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:pressed||checked?c.surface2:c.surface0})}>
     <View style={{width:18,height:18,borderRadius:field.kind==='multi'?radii.small:radii.circle,borderWidth:1,borderColor:checked?c.accent:c.border,backgroundColor:checked?c.accent:'transparent',alignItems:'center',justifyContent:'center'}}>{checked?<Icon name="Check" size={12} color={c.accentForeground}/>:null}</View><Text style={{flex:1,fontSize:14,color:c.foreground}}>{option.label}</Text>
    </Pressable>;})}
    {!options.length?<Text style={{padding:12,color:c.foregroundMuted,fontSize:13}}>No matching options.</Text>:null}
   </ScrollView>
   {field.kind==='multi'?<Pressable accessibilityRole="button" onPress={()=>setOpen(false)} style={{minHeight:40,paddingHorizontal:12,justifyContent:'center',alignItems:'flex-end',borderTopWidth:1,borderColor:c.border}}><Text style={{fontSize:13,fontWeight:'600',color:c.accent}}>Done{selected.length?` · ${selected.length} selected`:''}</Text></Pressable>:null}
  </View>
 </OverlayMenu>;
}

export function TransitionDialog({destinations,projectId,onProjectChange,theme,issueKey,site,column,development,fields,values,message,busy,onChange,onClose,onConfirm}:Props){
 const c=theme.colors,compact=useWindowDimensions().width<600;
 const [jiraTip,setJiraTip]=useState(false);
 const needsProject=!!destinations&&destinations.length>1&&!destinations.some(d=>d.projectId===projectId);
 const unsupported=fields.filter(field=>field.kind==='unsupported'),editable=fields.filter(field=>field.kind!=='unsupported');
 return <Modal visible transparent animationType="fade" onRequestClose={()=>{if(!busy)onClose();}}><FocusScope>
  <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:compact?12:24,backgroundColor:'rgba(0,0,0,.6)'}}>
   <View accessibilityViewIsModal style={{width:'100%',maxWidth:580,maxHeight:'90%',minHeight:0,borderRadius:radii.overlay,backgroundColor:c.surface0,overflow:'hidden',borderWidth:1,borderColor:c.border}}>
    <View style={{padding:compact?16:24,gap:12,borderBottomWidth:1,borderColor:c.border}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <View style={{flex:1,gap:5}}><Text style={{fontSize:12,fontWeight:'600',color:c.foregroundMuted}}>{issueKey}</Text><Text accessibilityRole="header" style={{fontSize:20,fontWeight:'600',color:c.foreground}}>Move issue</Text></View>
      <View style={{position:'relative'}}>
       {jiraTip?<Tooltip theme={theme} text="Open in Jira" placement="below" offset={46}/>:null}
       <Pressable accessibilityRole="link" accessibilityLabel={`Open ${issueKey} in Jira`} onHoverIn={()=>setJiraTip(true)} onHoverOut={()=>setJiraTip(false)} onFocus={()=>setJiraTip(true)} onBlur={()=>setJiraTip(false)} onPress={()=>void openExternal(site+'/browse/'+issueKey)} style={({pressed})=>({width:44,height:44,borderRadius:radii.control,alignItems:'center',justifyContent:'center',backgroundColor:pressed?c.surface2:'transparent'})}><Icon name="ExternalLink" size={18} color={c.foregroundMuted}/></Pressable>
      </View>
     </View>
     <View style={{flexDirection:'row',alignItems:'flex-start',gap:8}}><Icon name="ArrowRight" size={16} color={c.accent}/><Text style={{flex:1,fontSize:14,lineHeight:20,fontWeight:'500',color:c.foreground}}>{column}</Text></View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" style={{flexShrink:1,minHeight:0}} contentContainerStyle={{padding:compact?16:24,gap:20}}>
     {message?<View accessibilityRole="alert" style={{padding:12,borderRadius:radii.control,backgroundColor:c.surface2}}><Text style={{color:c.statusDanger,fontSize:13,lineHeight:20}}>{message.replace(/^Error: |^Request failed: /,'').replace(/\s+requestType=.*$/,'')}</Text></View>:null}
     {unsupported.length?<View style={{padding:12,borderRadius:radii.control,backgroundColor:c.surface2,flexDirection:'row',gap:10}}><Icon name="Info" size={18} color={c.foregroundMuted}/><View style={{flex:1,gap:4}}><Text style={{color:c.foreground,fontSize:13,fontWeight:'600'}}>Complete in Jira</Text><Text style={{color:c.foregroundMuted,fontSize:13,lineHeight:20}}>{unsupported.map(field=>field.name).join(', ')} {unsupported.length===1?'is':'are'} not editable here. If Jira requires a value, use the link above to complete the move there.</Text></View></View>:null}
     {destinations&&destinations.length>1?<ProjectChoices choices={destinations} value={projectId} onChange={onProjectChange!} theme={theme} disabled={busy}/>:null}
     {editable.map(field=><View key={field.id} style={{gap:8}}><Text style={{fontSize:13,fontWeight:'500',color:c.foreground}}>{field.name}{field.required?<Text style={{color:c.foregroundMuted}}> *</Text>:null}</Text>
      {field.kind==='choice'||field.kind==='multi'?<ChoiceField field={field} value={values[field.id]??''} onChange={value=>onChange(field.id,value)} theme={theme} disabled={busy}/>:<TextInput accessibilityLabel={field.name} editable={!busy} value={values[field.id]??''} onChangeText={value=>onChange(field.id,value)} keyboardType={field.kind==='number'?'decimal-pad':'default'} placeholder={field.kind==='parent'?'PROJECT-123':'Enter '+field.name.toLowerCase()} placeholderTextColor={c.foregroundMuted} style={{minHeight:44,fontSize:14,color:c.foreground,borderWidth:1,borderColor:c.border,paddingHorizontal:12,paddingVertical:10,borderRadius:radii.control}}/>}
     </View>)}
     <Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>{development?'Confirm to update Jira and start work in Paseo.':'Confirm to update the issue’s status in Jira.'}</Text>
    </ScrollView>
    <View style={{paddingHorizontal:compact?16:24,paddingVertical:16,borderTopWidth:1,borderColor:c.border,flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:12}}>
     <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={({pressed})=>({minHeight:44,paddingHorizontal:16,borderRadius:radii.control,alignItems:'center',justifyContent:'center',backgroundColor:pressed?c.surface2:'transparent',opacity:busy?.5:1})}><Text style={{color:c.foreground,fontSize:14,fontWeight:'500'}}>Cancel</Text></Pressable>
     <Pressable accessibilityRole="button" accessibilityState={{busy,disabled:busy||needsProject}} disabled={busy||needsProject} onPress={onConfirm} style={({pressed})=>({minHeight:44,paddingHorizontal:18,borderRadius:radii.control,backgroundColor:c.accent,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',opacity:busy?.6:1,transform:[{scale:pressed?.96:1}]})}>{busy?<ActivityIndicator size="small" color={c.accentForeground}/>:<Icon name="ArrowRight" size={16} color={c.accentForeground}/>}<Text style={{color:c.accentForeground,fontSize:14,fontWeight:'600'}}>{busy?'Moving…':'Move issue'}</Text></Pressable>
    </View>
   </View>
  </View>
 </FocusScope></Modal>;
}
