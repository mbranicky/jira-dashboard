// Paseo supplies these host primitives at runtime; this adapter preserves their contracts.
import * as icons from 'lucide-react';
export function Icon({name,size,color}:any){const Component=icons[name as keyof typeof icons] as React.ElementType;if(!Component)throw Error(`Unknown Lucide icon: ${name}`);return <Component aria-hidden="true" size={size} color={color} strokeWidth={1.75}/>;}
export function SettingsSelect({label,value,options,onValueChange,disabled}:any){return <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:44,gap:12,color:'inherit'}}>{label}<select aria-label={label} value={value} disabled={disabled} onChange={event=>onValueChange(event.target.value)}>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;}

export async function copyText(text:string){const response=await fetch('/__clipboard',{method:'POST',body:text});if(!response.ok)throw Error('Clipboard unavailable');}

export function SettingsRow({label,hint,children,testID}:any){return <div data-testid={testID} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:44}}><div style={{flex:1,minWidth:0}}><div>{label}</div>{hint?<div style={{fontSize:12}}>{hint}</div>:null}</div>{children}</div>;}
