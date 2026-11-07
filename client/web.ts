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

// Board-local shortcuts: do not capture the app shell, editors, dialogs or open menus.
type KeyboardNode={tagName?:string;isContentEditable?:boolean;closest(selector:string):KeyboardNode|null;querySelector(selector:string):KeyboardNode|null;querySelectorAll(selector:string):ArrayLike<KeyboardNode>;getClientRects():{length:number};focus():void;scrollIntoView(options:{block:string;inline:string}):void;addEventListener(name:string,listener:(event:BoardKeyEvent)=>void):void;removeEventListener(name:string,listener:(event:BoardKeyEvent)=>void):void};
type BoardKeyEvent={key:string;altKey:boolean;ctrlKey:boolean;metaKey:boolean;shiftKey:boolean;defaultPrevented:boolean;isComposing?:boolean;target:KeyboardNode;preventDefault():void;stopPropagation():void};
export function bindBoardKeyboard(node:unknown){
 if(Platform.OS!=='web'||!node)return ()=>{};
 const root=node as KeyboardNode;
 const handler=(event:BoardKeyEvent)=>{
  if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!['/','j','k'].includes(event.key))return;
  if(event.target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[role="listbox"]')||root.querySelector('[aria-label="Select sprint"][aria-expanded="true"]'))return;
  const search=root.querySelector('[aria-label="Search issues"]');
  const cards=Array.from(root.querySelectorAll('[data-testid="keyboard-issue-title"]')).filter(card=>card.getClientRects().length);
  const current=cards.indexOf(event.target);
  const next=event.key==='/'?search:cards[current<0?(event.key==='j'?0:cards.length-1):Math.max(0,Math.min(cards.length-1,current+(event.key==='j'?1:-1)))];
  if(!next)return;event.preventDefault();event.stopPropagation();next.focus();next.scrollIntoView({block:'nearest',inline:'nearest'});
 };
 root.addEventListener('keydown',handler);return ()=>root.removeEventListener('keydown',handler);
}
