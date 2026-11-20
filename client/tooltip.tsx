import {radii} from './radii';
import {createElement,useLayoutEffect,useRef,useState} from 'react';
import {Platform,Text,View,useWindowDimensions} from 'react-native';
import type {SettingsTheme} from './settings-ui';

type TooltipElement=HTMLDivElement & {showPopover?:()=>void;getBoundingClientRect:()=>{left:number;right:number;top:number;bottom:number;width:number;height:number};style:Record<string,string>};
declare const window:{innerWidth:number;innerHeight:number;addEventListener:(event:string,listener:()=>void,capture?:boolean)=>void;removeEventListener:(event:string,listener:()=>void,capture?:boolean)=>void};
declare const ResizeObserver:{new(callback:()=>void):{observe:(element:TooltipElement)=>void;disconnect:()=>void}};

// The browser top layer escapes card/column overflow without a modal focus trap.
function WebTooltip({theme,text,align,placement,offset}:{theme:SettingsTheme;text:string;align:'left'|'right';placement:'above'|'below';offset:number}){
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

// Shared presentation for every plugin-owned tooltip; the trigger owns visibility.
export function Tooltip({theme,text,align='right',placement='above',offset=44}:{theme:SettingsTheme;text:string;align?:'left'|'right';placement?:'above'|'below';offset?:number}){
 const {width}=useWindowDimensions();
 const [measuredWidth,setMeasuredWidth]=useState<number>();
 const web=Platform.OS==='web';
 if(web)return <WebTooltip theme={theme} text={text} align={align} placement={placement} offset={offset}/>;
 return <View pointerEvents="none" style={{position:'absolute',...(align==='left'?{left:0}:{right:0}),...(placement==='above'?{bottom:offset}:{top:offset}),width:web?'max-content' as any:measuredWidth??Math.min(280,width-24),maxWidth:Math.min(280,width-24),paddingHorizontal:8,paddingVertical:4,borderRadius:radii.small,backgroundColor:theme.colors.foreground,zIndex:10,opacity:web||measuredWidth?1:0}}>
  <Text onTextLayout={web?undefined:event=>{const content=Math.max(0,...event.nativeEvent.lines.map(line=>line.width));setMeasuredWidth(Math.ceil(content)+16);}} style={{color:theme.colors.surface0,fontSize:12,lineHeight:16,textAlign:'left',fontWeight:'400'}}>{text}</Text>
 </View>;
}
