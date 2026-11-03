import {createContext,useContext,useCallback,useState,type ReactNode} from 'react';
import {z} from 'zod';
// Only the unavailable Paseo host boundary is replaced, never plugin components.
const Context=createContext<any>(null);
export function TestHost({children,initial,failSave=false}:{children:ReactNode;initial:any;failSave?:boolean}){
 const [values,setValues]=useState(initial);const [revision,setRevision]=useState(1);
 return <Context.Provider value={{values,setValues,revision,setRevision,failSave}}>{children}</Context.Provider>;
}
export function useSettings(definition:any){
 const host=useContext(Context);const [saveError,setError]=useState<string|null>(null);
 return {status:'ready',values:definition.schema.parse(host.values[definition.id]??{}),revision:String(host.revision),saving:false,saveError,reload:()=>{},save:async(value:any)=>{
  try{
   if(host.failSave)throw Error('Settings could not be saved. Please retry.');
   const parsed=z.json().parse(definition.schema.parse(value));
   host.setValues((old:any)=>({...old,[definition.id]:parsed}));host.setRevision((n:number)=>n+1);setError(null);return true;
  }catch(error){setError(String(error));return false;}
 }};
}
export function useRpc(contract:any){return useCallback(async(input:any)=>{
 const body=contract.input.parse(input);
 const response=await fetch(`/__rpc/${contract.name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok)throw Error((await response.json()).error);
 return contract.output.parse(await response.json());
},[contract]);}
const paseo={projects:{list:async()=>({projects:[{projectId:'project-1',projectDisplayName:'Example project',cwd:'/example'}]})},providers:{
 listAvailable:async()=>({providers:[{provider:'claude',available:true},{provider:'codex',available:true}]}),
 listModels:async(provider:string)=>({models:[{id:`${provider}-model`,label:`${provider} model`,isSelectable:true}]}),
 listModes:async()=>({modes:[{id:'auto',label:'Auto mode'}]}),
}};
export const usePaseo=()=>paseo;
export const useWorkspace=()=>undefined;
export const openExternalUrl=async()=>{throw Error('External navigation is forbidden in UI tests');};
