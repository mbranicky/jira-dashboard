import {usePaseo,type PluginScreenProps} from '@getpaseo/plugin/client';
import {useQuery} from '@tanstack/react-query';
import {Icon} from '@getpaseo/plugin/client/ui';
import {Pressable,Text,View} from 'react-native';
import {radii} from './radii';
export type ProjectChoice={projectId:string;name:string};
/** Shared destination presentation for Play and workflow confirmation. */
export function ProjectChoices({choices,value,onChange,theme,disabled=false}:{choices:ProjectChoice[];value?:string;onChange:(id:string)=>void;theme:PluginScreenProps['theme'];disabled?:boolean}){
 const paseo=usePaseo();
 const projects=useQuery({queryKey:['mapping-projects'],queryFn:()=>paseo.projects.list()});
 return <View accessibilityRole="radiogroup" accessibilityLabel="Paseo project destination" style={{gap:8}}>
  <Text style={{color:theme.colors.foregroundMuted,fontSize:13}}>Choose where to start work. Each destination uses its own agent settings.</Text>
  {projects.error?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>Project details unavailable. Close and try again.</Text>:null}
  {choices.map(choice=>{const project=projects.data?.projects.find(p=>p.projectId===choice.projectId),selected=value===choice.projectId;return <Pressable key={choice.projectId} accessibilityRole="radio" accessibilityLabel={`Choose project ${choice.name||project?.projectDisplayName||choice.projectId}`} accessibilityState={{checked:selected,disabled:disabled||!project}} disabled={disabled||!project} onPress={()=>onChange(choice.projectId)} style={({pressed})=>({minHeight:56,padding:12,gap:6,borderRadius:radii.control,borderWidth:1,borderColor:selected?theme.colors.accent:theme.colors.border,backgroundColor:pressed||selected?theme.colors.surface2:theme.colors.surface1,opacity:project?1:.6})}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Icon name={selected?'CircleCheck':'FolderGit2'} size={18} color={selected?theme.colors.accent:theme.colors.foregroundMuted}/><Text style={{flex:1,color:theme.colors.foreground}}>{choice.name||project?.projectDisplayName||'Project'}</Text></View>
   <Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>{project?[project.projectCustomName||project.projectDisplayName,project.projectRootPath].join(' · '):projects.isLoading?'Loading project…':'Project unavailable'}</Text>
  </Pressable>;})}
 </View>;
}
