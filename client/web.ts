import { Platform } from "react-native";
import { openExternalUrl } from "@getpaseo/plugin/client";

// Use Paseo's platform opener: system browser on desktop, browser tab on web,
// OS URL handler on mobile. window.open creates an isolated Electron window.
export async function openExternal(url: string): Promise<void> {
  await openExternalUrl(url);
}

export type LocalAttachment={name:string;size:number;type:string;slice(start:number,end:number):{arrayBuffer():Promise<ArrayBuffer>}};
type Picker={type:string;onchange:(()=>void)|null;oncancel:(()=>void)|null;files?:ArrayLike<LocalAttachment>;click():void;remove():void};
declare const document:{createElement(tag:'input'):Picker;createElement(tag:'a'):{href:string;download:string;click():void}};
declare const btoa:(s:string)=>string;
declare const atob:(s:string)=>string;
declare const Blob:{new(parts:Uint8Array[],options:{type:string}):Blob};
declare const URL:{createObjectURL(blob:Blob):string;revokeObjectURL(url:string):void};
export const canTransferFiles=Platform.OS==='web';
export function chooseAttachment():Promise<LocalAttachment|undefined>{
 return new Promise(resolve=>{const picker=document.createElement('input');picker.type='file';picker.onchange=()=>{resolve(picker.files?.[0]);picker.remove();};picker.oncancel=()=>{resolve(undefined);picker.remove();};picker.click();});
}
export async function fileChunk(file:LocalAttachment,start:number,end:number){const bytes=new Uint8Array(await file.slice(start,end).arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
export function saveAttachment(filename:string,parts:string[]){
 const buffers=parts.map(part=>{const binary=atob(part);return Uint8Array.from(binary,c=>c.charCodeAt(0));});
 const url=URL.createObjectURL(new Blob(buffers,{type:'application/octet-stream'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}

// A nonce probe proves the RPC host is reachable on this device's loopback.
// Do not infer locality from host names or expose a remote daemon listener.
declare const navigator:{userAgent:string;maxTouchPoints?:number};
export function canTryBrowserPreview(){return Platform.OS==='web'&&!/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)&&!(navigator.userAgent.includes('Macintosh')&&(navigator.maxTouchPoints??0)>1);}
export async function localPreviewAvailable(baseUrl:string,token:string){
 if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)||!/^[a-f0-9]{64}$/.test(token))return false;
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),2000);
 try{const response=await fetch(`${baseUrl}/${token}/probe`,{signal:controller.signal});return response.ok&&await response.text()===token;}catch{return false;}finally{clearTimeout(timeout);}
}

// Desktop/browser device storage. Native clients keep session drafts until Paseo ships device settings.
declare const localStorage:import('../shared/comment-drafts').DraftStorage;
export function localDraftStorage(){if(Platform.OS!=='web')return undefined;try{return localStorage;}catch{return undefined;}}
