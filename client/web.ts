import {createElement,useLayoutEffect,useRef} from 'react';
import {radii} from './radii';
import type {SettingsTheme} from './settings-ui';
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

export const requiresDurableDeliveryMarker=Platform.OS==='web';
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

export function focusIssueCard(node:unknown,key:string){
 if(Platform.OS!=='web'||!node)return;
 const root=node as {querySelectorAll(selector:string):ArrayLike<{getAttribute(name:string):string|null;querySelector(selector:string):{focus(options:{preventScroll:boolean}):void}|null}>};
 const card=Array.from(root.querySelectorAll('[data-testid]')).find(value=>value.getAttribute('data-testid')===`issue-card-${key}`);
 card?.querySelector('[data-testid="keyboard-issue-title"]')?.focus({preventScroll:true});
}

type TooltipElement=HTMLDivElement & {showPopover?:()=>void;getBoundingClientRect:()=>{left:number;right:number;top:number;bottom:number;width:number;height:number};style:Record<string,string>};
declare const window:{innerWidth:number;innerHeight:number;addEventListener:(event:string,listener:()=>void,capture?:boolean)=>void;removeEventListener:(event:string,listener:()=>void,capture?:boolean)=>void};
declare const ResizeObserver:{new(callback:()=>void):{observe:(element:TooltipElement)=>void;disconnect:()=>void}};

// The browser top layer escapes card/column overflow without a modal focus trap.
export function WebTooltip({theme,text,align,placement,offset}:{theme:SettingsTheme;text:string;align:'left'|'right';placement:'above'|'below';offset:number}){
 const anchor=useRef<TooltipElement>(null),bubble=useRef<TooltipElement>(null);
 useLayoutEffect(()=>{
  const node=bubble.current,origin=anchor.current;if(!node||!origin)return;
  node.showPopover?.();
  const position=()=>{
   const r=origin.getBoundingClientRect(),size=node.getBoundingClientRect();
   const margin=8,limit=window.innerWidth-margin-size.width;
   const left=Math.max(margin,Math.min(align==='left'?r.left:r.right-size.width,limit));
   const above=r.bottom-offset-size.height,below=r.top+offset;
   const preferred=placement==='above'?above:below;
   const alternate=placement==='above'?below:above;
   const top=Math.max(margin,Math.min(preferred<margin||preferred+size.height>window.innerHeight-margin?alternate:preferred,window.innerHeight-margin-size.height));
   Object.assign(node.style,{left:`${left}px`,top:`${top}px`,visibility:r.bottom<0||r.top>window.innerHeight||r.right<0||r.left>window.innerWidth?'hidden':'visible'});
  };
  position();
  window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
  const observer=new ResizeObserver(position);observer.observe(node);observer.observe(origin);
  return ()=>{observer.disconnect();window.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);};
 },[text,align,placement,offset]);
 return createElement('div',{ref:anchor,style:{position:'absolute',inset:0,pointerEvents:'none'}},
  createElement('div',{ref:bubble,popover:'manual',role:'tooltip',style:{position:'fixed',inset:'auto',margin:0,border:0,width:'max-content',maxWidth:'min(280px, calc(100vw - 16px))',boxSizing:'border-box',padding:'4px 8px',borderRadius:radii.small,background:theme.colors.foreground,color:theme.colors.surface0,fontSize:12,lineHeight:'16px',fontWeight:400,textAlign:'left',overflowWrap:'anywhere',pointerEvents:'none',visibility:'hidden',zIndex:2147483647}},text));
}
