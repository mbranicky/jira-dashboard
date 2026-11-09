import {radii} from './radii';
import {usePaseo,type PluginSurfaceProps} from '@getpaseo/plugin/client';
import {ResponsiveSelect} from './responsive-select';
import {useQuery} from '@tanstack/react-query';
import {Pressable,Text,View} from 'react-native';
import type {Mapping} from '../shared/contracts';

export function ProviderFields({theme,compact,item,cwd,error,onChange}:Pick<PluginSurfaceProps,'theme'> & {
  compact?:boolean;item:Mapping;cwd?:string;error?:string;onChange:(patch:Partial<Mapping>)=>void;
}){
  const paseo=usePaseo();
  const providers=useQuery({queryKey:['mapping-providers'],queryFn:async()=>{
    const result=await paseo.providers.listAvailable();
    if(result.error)throw new Error('Could not load providers from Paseo.');
    return result.providers.filter(p=>p.available);
  }});
  const provider=item.provider.split('/')[0];
  const selectedModel=item.model||item.provider.split('/').slice(1).join('/');
  const models=useQuery({queryKey:['mapping-models',provider,cwd??''],enabled:!!provider,queryFn:async()=>{
    const result=await paseo.providers.listModels(provider,{cwd});
    if(result.error)throw new Error('Could not load models from Paseo.');
    return (result.models??[]).filter(m=>m.isSelectable!==false);
  }});
  const modes=useQuery({queryKey:['mapping-modes',provider,cwd??''],enabled:!!provider,queryFn:async()=>{
    const result=await paseo.providers.listModes(provider,{cwd});
    if(result.error)throw new Error('Could not load modes from Paseo.');
    return result.modes??[];
  }});
  const modeError=modes.error?'Could not load modes for this provider.':modes.data&&item.modeId&&!modes.data.some(m=>m.id===item.modeId)?'The saved mode is unavailable for this provider.':undefined;
  const availableProvider=providers.data?.some(p=>p.provider===provider);
  const modelValue=models.data?.find(m=>m.id===selectedModel||m.aliases?.includes(selectedModel))?.id??selectedModel;
  const providerError=error||(providers.error?'Could not load providers.':providers.data&&provider&&!availableProvider?'The saved provider is unavailable in Paseo.':undefined);
  const modelError=models.error?'Could not load models for this provider.':models.data&&selectedModel&&!models.data.some(m=>m.id===modelValue)?'The saved model is unavailable for this provider.':undefined;
  const border=(invalid:boolean)=>invalid?{borderWidth:2,borderColor:theme.colors.statusDanger,borderRadius:radii.control}:undefined;
  const retry=(label:string,action:()=>void)=><Pressable accessibilityRole="button" onPress={action}><Text style={{color:theme.colors.accent}}>{label}</Text></Pressable>;
  return <View style={{gap:12}}>
    {providerError?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{providerError}</Text>:null}
    <View style={border(!!providerError)}><ResponsiveSelect theme={theme} compact={compact} label="Agent provider *" value={provider} disabled={providers.isPending} options={[
      {label:providers.isPending?'Loading providers…':'Select provider',value:''},
      ...(provider&&!availableProvider?[{label:`${provider} (saved; unavailable)`,value:provider}]:[]),
      ...(providers.data??[]).map(p=>({label:p.provider,value:p.provider})),
    ]} onValueChange={value=>{if(value!==provider)onChange({provider:value,model:'',modeId:''});}}/></View>
    {providers.error?retry('Retry providers',()=>void providers.refetch()):null}
    {providers.data?.length===0?<Text style={{color:theme.colors.foregroundMuted}}>No available providers. Configure a provider in Paseo.</Text>:null}
    {modelError?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{modelError}</Text>:null}
    <View style={border(!!modelError)}><ResponsiveSelect theme={theme} compact={compact} label="Model (optional)" value={modelValue} disabled={!provider||models.isPending} options={[
      {label:!provider?'Select a provider first':models.isPending?'Loading models…':'Use provider default',value:''},
      ...(selectedModel&&!models.data?.some(m=>m.id===modelValue)?[{label:`${selectedModel} (saved; unavailable)`,value:selectedModel}]:[]),
      ...(models.data??[]).map(m=>({label:`${m.label}${m.isDefault?' (default)':''}`,value:m.id})),
    ]} onValueChange={model=>onChange({provider,model})}/></View>
    {modeError?<Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>{modeError}</Text>:null}
    <View style={border(!!modeError)}><ResponsiveSelect theme={theme} compact={compact} label="Mode (optional)" value={item.modeId??''} disabled={!provider||modes.isPending} options={[
      {label:!provider?'Select a provider first':modes.isPending?'Loading modes…':'Use provider default',value:''},
      ...(item.modeId&&!modes.data?.some(m=>m.id===item.modeId)?[{label:item.modeId+' (saved; unavailable)',value:item.modeId}]:[]),
      ...(modes.data??[]).map(m=>({label:m.label,value:m.id})),
    ]} onValueChange={modeId=>onChange({modeId})}/></View>
    {modes.data?.find(m=>m.id===item.modeId)?.description?<Text style={{color:theme.colors.foregroundMuted,fontSize:12}}>{modes.data.find(m=>m.id===item.modeId)?.description}</Text>:null}
    {modes.error?retry('Retry modes',()=>void modes.refetch()):null}
    {models.error?retry('Retry models',()=>void models.refetch()):null}
  </View>;
}
