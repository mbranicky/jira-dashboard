import {radii} from './radii';
import {StartStatusSelect} from './status-select';
import {ResponsiveSelect} from './responsive-select';
import { Action, SectionTitle } from './settings-ui';
import { ProviderFields } from './provider-fields';
import { usePaseo, useSettings, type PluginSurfaceProps } from '@getpaseo/plugin/client';
import { Icon } from '@getpaseo/plugin/client/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { mappings, mappingFormSchema, type Mapping } from '../shared/contracts';

export function MappingSettings(props: Pick<PluginSurfaceProps, 'theme'|'layout'> & {embedded?:boolean;prefillProjectKey?:string}) {
  const settings = useSettings(mappings);
  const [saved, setSaved] = useState(false);
  if (settings.status !== 'ready') return <View><Text style={{color:props.theme.colors.foreground}}>{settings.status==='loading'?'Loading project mappings…':'Could not load project mappings.'}</Text><Pressable accessibilityRole="button" onPress={()=>void settings.reload()}><Text style={{color:props.theme.colors.foreground}}>Retry</Text></Pressable></View>;
  const editor=<MappingEditor key={settings.revision} {...props} initial={props.prefillProjectKey&&!settings.values.items.some(item=>item.jiraProjectKey===props.prefillProjectKey)?[{name:'',jiraProjectKey:props.prefillProjectKey,paseoProjectId:'',entrySkill:'',provider:'',model:'',autoUpdateJira:true},...settings.values.items]:settings.values.items} saving={settings.saving}
    save={async items=>{const ok=await settings.save({items},settings.revision);setSaved(ok);return ok;}} saved={saved} clearSaved={()=>setSaved(false)} error={settings.saveError ? String(settings.saveError) : undefined}/>;
  return props.embedded?editor:<ScrollView style={{flex:1,backgroundColor:props.theme.colors.surface0}}>{editor}</ScrollView>;
}
function MappingEditor({theme, layout, initial, save, saving, error, saved, clearSaved}:Pick<PluginSurfaceProps, 'theme'|'layout'> & {
  initial:Mapping[]; save:(items:Mapping[])=>Promise<boolean>; saving:boolean; error?:string; saved:boolean; clearSaved:()=>void;
}) {
  const paseo=usePaseo();
  const projects=useQuery({queryKey:['mapping-projects'],queryFn:()=>paseo.projects.list()});
  const [items,setItems]=useState(initial); const [message,setMessage]=useState('');
  const [submitted,setSubmitted]=useState(initial.map(()=>false));
  const [expanded,setExpanded]=useState(initial.map(item=>!item.name.trim()));
  const validation=submitted.some(Boolean)?mappingFormSchema.safeParse({items}):null;
  const fieldError=(index:number,field:string)=>submitted[index]&&validation&&!validation.success?validation.error.issues.find(issue=>issue.path[1]===index&&issue.path[2]===field)?.message:undefined;
  const fieldMessage=(index:number,field:string)=>{const message=fieldError(index,field);return message?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{message}</Text>:null;};
  const fieldBorder=(index:number,field:string)=>({borderColor:fieldError(index,field)?theme.colors.statusDanger:theme.colors.border,borderWidth:fieldError(index,field)?2:1,borderRadius:radii.control});
  const text={color:theme.colors.foreground}; const muted={color:theme.colors.foregroundMuted};
  const input={...text,padding:12,borderWidth:1,borderColor:theme.colors.border,borderRadius:radii.control,backgroundColor:theme.colors.surface0};
  function update(index:number, patch:Partial<Mapping>){clearSaved();setMessage('');setItems(items.map((item,i)=>i===index?{...item,...patch}:item));}
  function button(label:string, onPress:()=>void, disabled=false){return <Action theme={theme} label={label} icon={label==='Remove'?'Trash2':label==='Add mapping'?'Plus':label==='Refresh projects'?'RefreshCw':'Check'} primary={label==='Save mappings'||label==='Saving…'} danger={label==='Remove'} disabled={disabled} onPress={onPress}/>;}
  return <View style={{padding:layout.compact?16:24,gap:20,maxWidth:960,width:'100%',alignSelf:'center'}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
      <View style={{flex:1,minWidth:220}}><SectionTitle theme={theme} icon="FolderGit2" title="Project mappings" description="Choose where each Jira project starts work."/></View>
      {button('Refresh projects',()=>void projects.refetch(),projects.isFetching)}
    </View>
    {projects.error?<Text accessibilityRole="alert" style={text}>Could not load Paseo projects. Refresh to retry.</Text>:null}
    {items.map((item,index)=><View key={index} style={{padding:layout.compact?14:20,gap:12,borderRadius:radii.surface,backgroundColor:theme.colors.surface1,borderWidth:1,borderColor:theme.colors.border}}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${expanded[index]?'Collapse':'Expand'} mapping ${item.name.trim()||index+1}`} accessibilityState={{expanded:!!expanded[index]}} onPress={()=>setExpanded(values=>values.map((value,i)=>i===index?!value:value))} style={{minHeight:48,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12}}>
        <Icon name="GitBranch" size={20} color={theme.colors.accent}/><View style={{flex:1,gap:4}}><Text style={{...text,fontWeight:'700'}}>{item.name.trim()||'New mapping'}</Text><Text style={muted}>{[item.jiraProjectKey||'No Jira project',projects.data?.projects.find(p=>p.projectId===item.paseoProjectId)?.projectDisplayName,item.provider].filter(Boolean).join(' · ')}</Text></View>
        <Icon name={expanded[index]?'ChevronUp':'ChevronDown'} size={20} color={theme.colors.foregroundMuted}/>
      </Pressable>
      {expanded[index]?<View style={{gap:12,paddingTop:12,borderTopWidth:1,borderTopColor:theme.colors.border}}>
      <View style={{flexDirection:layout.compact?'column':'row',gap:16}}>
      <View style={{flex:1,gap:8}}>
      <Text style={text}>Mapping name *</Text>
      {fieldMessage(index,'name')}
      <TextInput accessibilityLabel={`Mapping name ${index+1}`} style={[input,fieldBorder(index,'name')]} value={item.name} placeholder="Name your mapping" placeholderTextColor={theme.colors.foregroundMuted} onChangeText={name=>update(index,{name})}/>
      </View><View style={{flex:1,gap:8}}>
      <Text style={text}>Jira project key *</Text>
      {fieldMessage(index,'jiraProjectKey')}
      <TextInput accessibilityLabel={`Jira project key ${index+1}`} autoCapitalize="characters" autoCorrect={false} style={[input,fieldBorder(index,'jiraProjectKey')]} value={item.jiraProjectKey} placeholder="PROJECT" placeholderTextColor={theme.colors.foregroundMuted} onChangeText={jiraProjectKey=>update(index,{jiraProjectKey:jiraProjectKey.toUpperCase(),startWorkStatusId:undefined,startWorkColumn:undefined})}/>
      </View></View>
      {fieldMessage(index,'paseoProjectId')}
      <View style={fieldError(index,'paseoProjectId')?fieldBorder(index,'paseoProjectId'):undefined}>
      <ResponsiveSelect theme={theme} compact={layout.compact} label="Paseo project *" value={item.paseoProjectId} options={[
        {label:'Select project',value:''},
        ...(item.paseoProjectId&&!projects.data?.projects.some(p=>p.projectId===item.paseoProjectId)?[{label:'Previously selected project (unavailable)',value:item.paseoProjectId}]:[]),
        ...(projects.data?.projects??[]).map(p=>({label:p.projectCustomName||p.projectDisplayName,value:p.projectId}))
      ]} onValueChange={paseoProjectId=>update(index,{paseoProjectId})}/></View>
      <View style={{gap:8,paddingTop:8}}>
      <Text style={text}>Entry skill (optional)</Text>
      <TextInput accessibilityLabel={`Entry skill ${index+1}`} style={input} autoCapitalize="none" autoCorrect={false} value={item.entrySkill} onChangeText={entrySkill=>update(index,{entrySkill})}/>
      <Text style={muted}>Leave blank to open an agent without starting a skill.</Text></View>
      <ProviderFields compact={layout.compact} theme={theme} item={item} cwd={projects.data?.projects.find(p=>p.projectId===item.paseoProjectId)?.projectRootPath} error={fieldError(index,'provider')} onChange={patch=>update(index,patch)}/>
      {fieldMessage(index,'isolation')}
      <View style={fieldError(index,'isolation')?fieldBorder(index,'isolation'):undefined}>
      <ResponsiveSelect theme={theme} compact={layout.compact} label="Workspace isolation *" value={item.isolation??''} options={[{label:'Choose isolation',value:''},{label:'New Git worktree',value:'worktree'},{label:'Project directory (shared files)',value:'directory'}]} onValueChange={value=>update(index,{isolation:value==='worktree'?'worktree':value==='directory'?'directory':undefined})}/></View>
      <StartStatusSelect projectKey={item.jiraProjectKey} value={item.startWorkColumn} legacyStatusId={item.startWorkStatusId} onChange={startWorkColumn=>update(index,{startWorkColumn,startWorkStatusId:undefined})} theme={theme} compact={layout.compact}/>
      <View style={{flexDirection:'row',justifyContent:'flex-end'}}>{button('Remove',()=>{clearSaved();setItems(items.filter((_,i)=>i!==index));setExpanded(values=>values.filter((_,i)=>i!==index));setSubmitted(values=>values.filter((_,i)=>i!==index));setMessage('');})}</View>
      </View>:null}
    </View>)}
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
    {button('Add mapping',()=>{clearSaved();setMessage('');setExpanded(values=>[...values,true]);setSubmitted(values=>[...values,false]);setItems([...items,{name:'',jiraProjectKey:'',paseoProjectId:'',entrySkill:'',provider:'',model:'',autoUpdateJira:true}]);})}
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',borderTopWidth:1,borderTopColor:theme.colors.border,paddingTop:16}}>
    <View style={{flex:1,minWidth:180}}><Text style={{...muted,fontSize:12}}>Mappings apply to this Paseo host.</Text>
    {saved?<Text style={text}>Mappings saved.</Text>:null}
    {error||message?<Text accessibilityRole="alert" style={text}>{error||message}</Text>:null}
    </View>
    {button(saving?'Saving…':'Save mappings',()=>{
      clearSaved();setMessage('');
      setSubmitted(items.map(()=>true));
      const parsed=mappingFormSchema.safeParse({items});
      if(!parsed.success){
        const invalid=new Set(parsed.error.issues.map(issue=>Number(issue.path[1])));
        setExpanded(values=>items.map((_,index)=>values[index]||invalid.has(index)));
        return;
      }
      void save(parsed.data.items).then(ok=>setMessage(ok?'':'Could not save mappings. Please retry.')).catch(()=>setMessage('Could not save mappings. Please retry.'));
    },saving)}
    </View>
  </View>;
}
