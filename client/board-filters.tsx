import {useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import type {Issue} from '../shared/contracts';
import {emptyFilters,filterFields,filterOptions,type BoardFilters,type SavedView} from '../shared/board-filters';
import {Action,type SettingsTheme} from './settings-ui';
const labels={labels:'Label',priority:'Priority',type:'Issue type',parent:'Parent',fixVersions:'Version'};
export function BoardFilterBar({theme,issues,filters,search,onChange,views,onSave,disabled}:{theme:SettingsTheme;issues:Issue[];filters:BoardFilters;search:string;onChange:(filters:BoardFilters,search:string)=>void;views:SavedView[];onSave:(views:SavedView[])=>Promise<boolean>;disabled:boolean}){
 const [open,setOpen]=useState(false);const [name,setName]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const c=theme.colors;
 const count=filterFields.reduce((n,f)=>n+filters[f].length,0);
 async function save(next:SavedView[]){if(disabled||busy)return;setBusy(true);setError('');try{if(await onSave(next))setName('');else setError('Could not save views. Retry after refreshing settings.');}catch{setError('Could not save views. Retry after refreshing settings.');}finally{setBusy(false);}}
 const chip=(label:string,onPress:()=>void,selected=false)=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} style={{paddingHorizontal:10,paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:selected?c.accent:c.border,backgroundColor:selected?c.surface2:c.surface1}}><Text style={{color:selected?c.accent:c.foreground,fontSize:12}}>{label}</Text></Pressable>;
 return <View style={{gap:8}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8}}>
   <Action theme={theme} label={open?'Hide filters':`Filters${count?` (${count})`:''}`} icon="Filter" onPress={()=>setOpen(!open)}/>
   {filterFields.flatMap(field=>filters[field].map(value=>chip(`Remove ${labels[field]}: ${value}`,()=>onChange({...filters,[field]:filters[field].filter(v=>v!==value)},search),true)))}
   {count||search?<Action theme={theme} label="Clear filters" icon="X" onPress={()=>onChange(emptyFilters(),'')}/>:null}
   {views.map(view=>chip(`View: ${view.name}`,()=>onChange(view.filters,view.search)))}
  </View>
  {open?<View style={{gap:12,padding:12,borderRadius:8,backgroundColor:c.surface1}}>
   <ScrollView style={{maxHeight:240}} nestedScrollEnabled>{filterFields.map(field=><View key={field} style={{gap:6,marginBottom:10}}><Text style={{color:c.foreground,fontWeight:'600'}}>{labels[field]}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{filterOptions(issues,field,filters[field]).map(value=>chip(`${labels[field]}: ${value}`,()=>onChange({...filters,[field]:filters[field].includes(value)?filters[field].filter(v=>v!==value):[...filters[field],value]},search),filters[field].includes(value)))}</View></View>)}</ScrollView>
   <Text style={{color:c.foregroundMuted,fontSize:12}}>Match any selected value within a field and every selected field. Saved views are shared on this host for this board.</Text>
   <TextInput accessibilityLabel="Saved view name" value={name} onChangeText={setName} maxLength={60} placeholder="Name this view" placeholderTextColor={c.foregroundMuted} style={{color:c.foreground,borderWidth:1,borderColor:c.border,borderRadius:6,padding:10}}/>
   <Action theme={theme} label="Save view" icon="Save" disabled={disabled||busy||!name.trim()||views.length>=30||views.some(v=>v.name.toLowerCase()===name.trim().toLowerCase())} onPress={()=>void save([...views,{name:name.trim(),filters,search}])}/>
   {views.map(view=><Action key={view.name} theme={theme} label={`Delete view: ${view.name}`} icon="Trash2" disabled={disabled||busy} onPress={()=>void save(views.filter(v=>v.name!==view.name))}/>)}
   {views.some(v=>v.name.toLowerCase()===name.trim().toLowerCase())?<Text style={{color:c.foregroundMuted}}>Choose a different view name.</Text>:null}
   {views.length>=30?<Text style={{color:c.foregroundMuted}}>Maximum 30 views per board. Delete a view to save another.</Text>:null}
  </View>:null}
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
 </View>;
}
