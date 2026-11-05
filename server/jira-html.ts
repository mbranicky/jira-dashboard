import {parseFragment,type DefaultTreeAdapterMap} from 'parse5';
import type {AdfNode} from '../shared/comments';
type Node=DefaultTreeAdapterMap['node'];
/** Parse inert HTML into our allowlisted text model. Never execute or render HTML. */
export function descriptionDocument(value:unknown):unknown {
 if(typeof value!=='string'||!/^\s*<(?:p|div|ul|ol|h[1-6]|table|blockquote|pre|figure|span)(?:\s|>)/i.test(value))return value;
 const root=parseFragment(value.slice(0,1_000_000));let visited=0;
 const children=(n:Node)=>'childNodes' in n?n.childNodes:[];
 const text=(n:Node):string=>'value' in n?n.value:children(n).map(text).join('');
 function convert(n:Node,depth=0):AdfNode[]{
  if(depth>30||++visited>20000)return [];
  if(n.nodeName==='#text')return [{type:'text',text:('value' in n?n.value:'')}];
  if(!('tagName' in n))return children(n).flatMap(c=>convert(c,depth+1));
  const tag=n.tagName;
  if(['script','style','iframe','object','embed','svg','math','template','input','button'].includes(tag))return [];
  const attr=(name:string)=>n.attrs.find(a=>a.name===name)?.value;
  if(tag==='figure'||tag==='img')return [{type:'mediaSingle'}];
  if(tag==='br')return [{type:'hardBreak'}];
  if(tag==='hr')return [{type:'rule'}];
  if(tag==='pre')return [{type:'codeBlock',content:[{type:'text',text:text(n)}]}];
  const content=children(n).flatMap(c=>convert(c,depth+1));
  const mark=({strong:'strong',b:'strong',em:'em',i:'em',code:'code',s:'strike',del:'strike',u:'underline'} as Record<string,string>)[tag];
  if(mark||tag==='a'){
   const m=mark?{type:mark}:{type:'link',attrs:{href:attr('href')}};
   const apply=(node:AdfNode):AdfNode=>node.type==='text'?{...node,marks:[...(node.marks??[]),m]}:{...node,content:node.content?.map(apply)};
   return content.map(apply);
  }
  const type=({p:'paragraph',ul:'bulletList',ol:'orderedList',li:'listItem',blockquote:'blockquote',table:'table',tr:'tableRow',td:'tableCell',th:'tableHeader'} as Record<string,string>)[tag];
  if(/^h[1-6]$/.test(tag))return [{type:'heading',attrs:{level:Number(tag[1])},content}];
  if(type){
   const normalized=tag==='li'&&content.some(c=>c.type==='text')?[{type:'paragraph',content}]:content;
   return [{type,content:normalized,...(tag==='ol'?{attrs:{order:Number(attr('start'))||1}}:{})}];
  }
  return content;
 }
 const content=convert(root);
 // Plain inline HTML also needs a block for the native renderer.
 return {type:'doc',version:1,content:content.some(n=>n.type==='text')?[{type:'paragraph',content}]:content};
}
