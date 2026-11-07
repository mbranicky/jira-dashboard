import {IconAction} from './icon-action';
import {useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';
import type {Issue} from '../shared/contracts';
import {emptyFilters,filterFields,filterOptions,type BoardFilters,type SavedView} from '../shared/board-filters';
import {Action,type SettingsTheme} from './settings-ui';
import {OverlayMenu} from './overlay-menu';
const labels={labels:'Label',priority:'Priority',type:'Issue type',parent:'Parent',fixVersions:'Version',activity:'Activity'};
function FilterMenu({theme,label,options,selected,onChange}:{theme:SettingsTheme;label:string;options:string[];selected:string[];onChange:(values:string[])=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');const c=theme.colors;
 const matches=options.filter(value=>value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <OverlayMenu theme={theme} open={open} onOpenChange={value=>{setOpen(value);if(!value)setQuery('');}} maxHeight={340} trigger={toggle=><Pressable accessibilityRole="button" accessibilityLabel={`Filter by ${label}`} accessibilityState={{expanded:open}} onPress={toggle} style={({pressed})=>({minHeight:34,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,borderRadius:8,borderWidth:1,borderColor:selected.length?c.accent:c.border,backgroundColor:pressed?c.surface2:c.surface1})}><Text style={{color:c.foreground,fontSize:13}}>{label}</Text>{selected.length?<Text style={{color:c.accent,fontSize:12,fontWeight:'600'}}>{selected.length}</Text>:null}<Icon name="ChevronDown" size={14} color={c.foregroundMuted}/></Pressable>}>
  <View style={{padding:8,gap:6}}>
   <TextInput accessibilityLabel={`Search ${label} options`} value={query} onChangeText={setQuery} placeholder={`Search ${label.toLowerCase()}…`} placeholderTextColor={c.foregroundMuted} autoCapitalize="none" autoCorrect={false} style={{minHeight:34,paddingHorizontal:10,borderRadius:6,backgroundColor:c.surface0,color:c.foreground,fontSize:13}}/>
   <Text style={{color:c.foregroundMuted,fontSize:11,paddingHorizontal:4}}>Select one or more · matches any</Text>
  </View>
  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:196}}>
   {matches.map(value=><Pressable key={value} accessibilityRole="checkbox" accessibilityLabel={`${label}: ${value}`} accessibilityState={{checked:selected.includes(value)}} aria-checked={selected.includes(value)} onPress={()=>onChange(selected.includes(value)?selected.filter(v=>v!==value):[...selected,value])} style={({pressed})=>({minHeight:34,paddingHorizontal:12,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:pressed?c.surface2:'transparent'})}><Icon name={selected.includes(value)?'SquareCheck':'Square'} size={17} color={selected.includes(value)?c.accent:c.foregroundMuted}/><Text style={{color:c.foreground,fontSize:13,flex:1}}>{value}</Text></Pressable>)}
   {!matches.length?<Text style={{padding:12,color:c.foregroundMuted,fontSize:13}}>No matching options.</Text>:null}
  </ScrollView>
  <View style={{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:c.border,paddingHorizontal:4}}><Action dense theme={theme} label={`Clear ${label}`} icon="X" disabled={!selected.length} onPress={()=>onChange([])}/><Action dense theme={theme} label="Done" icon="Check" onPress={()=>{setOpen(false);setQuery('');}}/></View>
 </OverlayMenu>;
}
export function BoardFilterBar({theme,issues,filters,search,onChange,views,onSave,disabled}:{theme:SettingsTheme;issues:Issue[];filters:BoardFilters;search:string;onChange:(filters:BoardFilters,search:string)=>void;views:SavedView[];onSave:(views:SavedView[])=>Promise<boolean>;disabled:boolean}){
 const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[viewsOpen,setViewsOpen]=useState(false);const [name,setName]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const c=theme.colors;
 const count=filterFields.reduce((n,f)=>n+(filters[f]?.length??0),0);
 async function save(next:SavedView[]){if(disabled||busy)return;setBusy(true);setError('');try{if(await onSave(next)){setName('');setSaving(false);}else setError('Could not save views. Retry after refreshing settings.');}catch{setError('Could not save views. Retry after refreshing settings.');}finally{setBusy(false);}}
 return <View testID="board-filters" style={{gap:8}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6}}>
   <Action dense paddingLeft={8.5} theme={theme} label={open?'Hide filters':`Filters${count?` (${count})`:''}`} icon="Filter" onPress={()=>setOpen(!open)}/>
   {open?filterFields.map(field=><FilterMenu key={field} theme={theme} label={labels[field]} options={filterOptions(issues,field,filters[field]??[])} selected={filters[field]??[]} onChange={values=>onChange({...filters,[field]:values},search)}/>):null}
   {views.length?<OverlayMenu theme={theme} open={viewsOpen} onOpenChange={setViewsOpen} trigger={toggle=><Action dense theme={theme} label="Saved views" icon="Bookmark" onPress={toggle}/>}><ScrollView style={{maxHeight:240}}>{views.map(view=><View key={view.name} style={{padding:4,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:c.border}}><View style={{flex:1,minWidth:0}}><Action dense theme={theme} label={`View: ${view.name}`} icon="Bookmark" onPress={()=>{onChange(view.filters,view.search);setViewsOpen(false);}}/></View><IconAction dense theme={theme} label={`Delete view: ${view.name}`} icon="Trash2" onPress={()=>{if(!disabled&&!busy)void save(views.filter(v=>v.name!==view.name));}}/></View>)}</ScrollView></OverlayMenu>:null}
   {count||search?<Action dense theme={theme} label="Clear filters" icon="X" onPress={()=>onChange(emptyFilters(),'')}/>:null}
   {open||count||search?<Action dense theme={theme} label="Save as view" icon="Save" disabled={disabled||busy} onPress={()=>{setSaving(!saving);setError('');}}/>:null}
  </View>
  {count?<View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{filterFields.flatMap(field=>(filters[field]??[]).map(value=><Pressable key={`${field}/${value}`} accessibilityRole="button" accessibilityLabel={`Remove ${labels[field]}: ${value}`} onPress={()=>onChange({...filters,[field]:filters[field].filter(v=>v!==value)},search)} style={({pressed})=>({maxWidth:'100%',minHeight:28,paddingHorizontal:10,paddingVertical:4,borderRadius:6,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:pressed?c.surface1:c.surface2})}><Text style={{color:c.foregroundMuted,fontSize:12}}>{labels[field]}</Text><Text style={{color:c.foreground,fontSize:12,flexShrink:1}}>{value}</Text><Icon name="X" size={13} color={c.foregroundMuted}/></Pressable>))}</View>:null}
  {saving?<View style={{gap:8,padding:12,borderRadius:10,backgroundColor:c.surface1}}>
   <Text style={{color:c.foreground,fontSize:13,fontWeight:'600'}}>Save current filters and search</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}><TextInput accessibilityLabel="Saved view name" value={name} onChangeText={setName} maxLength={60} placeholder="View name" placeholderTextColor={c.foregroundMuted} style={{flexGrow:1,flexBasis:180,minWidth:0,minHeight:34,color:c.foreground,borderWidth:1,borderColor:c.border,borderRadius:6,padding:10}}/><Action dense theme={theme} label="Save view" icon="Check" primary disabled={disabled||busy||!name.trim()||views.length>=30||views.some(v=>v.name.toLowerCase()===name.trim().toLowerCase())} onPress={()=>void save([...views,{name:name.trim(),filters,search}])}/><Action dense theme={theme} label="Cancel" icon="X" onPress={()=>{setSaving(false);setName('');setError('');}}/></View>
   <Text style={{color:c.foregroundMuted,fontSize:12}}>Available to everyone using this board on this host.</Text>
   {views.some(v=>v.name.toLowerCase()===name.trim().toLowerCase())?<Text style={{color:c.foregroundMuted}}>Choose a different view name.</Text>:null}
   {views.length>=30?<Text style={{color:c.foregroundMuted}}>Maximum 30 views per board. Delete a view to save another.</Text>:null}
  </View>:null}
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
 </View>;
}
