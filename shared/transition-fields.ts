import {z} from 'zod';
export const transitionField=z.object({id:z.string(),name:z.string(),required:z.boolean(),kind:z.enum(['text','number','parent','choice','multi','unsupported']),choices:z.array(z.object({value:z.string(),label:z.string(),payload:z.unknown(),released:z.boolean().optional(),archived:z.boolean().optional()}))});
export type TransitionField=z.infer<typeof transitionField>;
export function fieldMetadata(id:string,f:any):TransitionField{
 const choices=(f.allowedValues??[]).map((v:any)=>({value:String(v.id??v.value??v),label:String(v.name??v.value??v),...(id==='fixVersions'?{...(typeof v.released==='boolean'?{released:v.released}:{}),...(typeof v.archived==='boolean'?{archived:v.archived}:{})}:{}),payload:typeof v==='string'?v:v.id?{id:String(v.id)}:{value:v.value}}));
 const type=f.schema?.type;
 const kind=f.operations&&!f.operations.includes('set')?'unsupported':id==='parent'?'parent':choices.length?(type==='array'?'multi':'choice'):type==='number'?'number':type==='string'&&!f.schema?.custom?.includes('textarea')?'text':'unsupported';
 return {id,name:f.name??id,required:!!f.required,kind,choices};
}
// Keep historical values available when already selected; unknown flags are not guessed.
export function visibleTransitionChoices(field:TransitionField,value:string){
 const selected=new Set(value.split(',').filter(Boolean));
 return field.choices.filter(option=>field.id!=='fixVersions'||selected.has(option.value)||(!option.released&&!option.archived));
}
export function transitionValues(metadata:TransitionField[],values:Record<string,string>){
 const output:Record<string,unknown>={};
 for(const [id,value] of Object.entries(values)){
  const f=metadata.find(f=>f.id===id);if(!f)throw Error('This field is no longer editable: '+id);
  if(!value.trim())continue;
  if(f.kind==='unsupported')throw Error('Complete '+f.name+' in Jira.');
  if(f.kind==='number'){if(!Number.isFinite(Number(value)))throw Error(f.name+' must be a number.');output[id]=Number(value);}
  else if(f.kind==='parent'){if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(value.trim()))throw Error('Enter a valid parent issue key.');output[id]={key:value.trim()};}
  else if(f.kind==='choice'||f.kind==='multi'){
   const selected=f.kind==='multi'?value.split(','):[value];
   output[id]=selected.map(v=>{const option=f.choices.find(o=>o.value===v);if(!option)throw Error('Choose a valid '+f.name+'.');return option.payload;});
   if(f.kind==='choice')output[id]=(output[id] as unknown[])[0];
  }else output[id]=value;
 }
 return output;
}
