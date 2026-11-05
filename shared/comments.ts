import {wikiDocument} from './jira-wiki';
import {defineRpc} from '@getpaseo/plugin';
import {z} from 'zod';
export const inlineSchema=z.object({text:z.string(),bold:z.boolean().optional(),italic:z.boolean().optional(),code:z.boolean().optional(),strike:z.boolean().optional(),underline:z.boolean().optional(),href:z.string().optional()});
export const richBlockSchema=z.object({kind:z.enum(['paragraph','heading','code','quote','table','panel','attachment']),runs:z.array(inlineSchema),prefix:z.string().optional(),level:z.number().optional(),rows:z.array(z.array(z.array(inlineSchema))).optional(),panel:z.string().optional()});
export type RichBlock=z.infer<typeof richBlockSchema>;
export const commentSchema=z.object({id:z.string(),parentId:z.string().nullable(),author:z.string(),created:z.string(),updated:z.string().nullable(),blocks:z.array(richBlockSchema),restricted:z.boolean()});
export type JiraComment=z.infer<typeof commentSchema>;
const key=z.string().regex(/^[A-Z][A-Z0-9_]*-[1-9]\d*$/);
export const listComments=defineRpc({name:'comments.list',input:z.object({key,startAt:z.number().int().nonnegative().default(0)}),output:z.object({site:z.string(),comments:z.array(commentSchema),nextStart:z.number().int().nullable(),total:z.number()})});
export const postComment=defineRpc({name:'comments.post',input:z.object({key,markdown:z.string().trim().min(1).max(16000),requestId:z.string().uuid(),parentId:z.string().regex(/^\d+$/).optional()}),output:commentSchema});

export function safeLink(value:unknown):string|undefined{
 if(typeof value!=='string')return;
 return /^https?:\/\/[^\s]+$/i.test(value)?value:undefined;
}
export type AdfNode={type:string;text?:string;attrs?:Record<string,unknown>;marks?:{type:string;attrs?:Record<string,unknown>}[];content?:AdfNode[]};
/** A deliberately small Markdown subset, converted to Jira ADF rather than sent as literal Markdown. */
export function markdownToAdf(markdown:string):AdfNode & {version:number}{
 const lines=markdown.replace(/\r\n?/g,'\n').split('\n');const content:AdfNode[]=[];
 for(let i=0;i<lines.length;){
  const line=lines[i]!;
  if(!line.trim()){i++;continue;}
  if(/^```/.test(line)){
   const language=line.slice(3).trim();const code:string[]=[];i++;
   while(i<lines.length&&!/^```\s*$/.test(lines[i]!))code.push(lines[i++]!);
   if(i<lines.length)i++;
   content.push({type:'codeBlock',...(language?{attrs:{language}}:{}),content:code.join('\n')?[{type:'text',text:code.join('\n')}]:[]});continue;
  }
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading){content.push({type:'heading',attrs:{level:heading[1]!.length},content:markdownInline(heading[2]!)});i++;continue;}
  if(/^>\s?/.test(line)){
   const quoted:string[]=[];while(i<lines.length&&/^>\s?/.test(lines[i]!))quoted.push(lines[i++]!.replace(/^>\s?/,''));
   content.push({type:'blockquote',content:[{type:'paragraph',content:markdownInline(quoted.join('\n'))}]});continue;
  }
  const list=line.match(/^(?:([-*])|(\d+)\.)\s+(.+)$/);
  if(list){
   const ordered=!!list[2];const items:AdfNode[]=[];
   while(i<lines.length){const m=lines[i]!.match(/^(?:([-*])|(\d+)\.)\s+(.+)$/);if(!m||!!m[2]!==ordered)break;items.push({type:'listItem',content:[{type:'paragraph',content:markdownInline(m[3]!)}]});i++;}
   content.push({type:ordered?'orderedList':'bulletList',...(ordered?{attrs:{order:Number(list[2])}}:{}),content:items});continue;
  }
  const paragraph=[line];i++;
  while(i<lines.length&&lines[i]!.trim()&&!/^(?:```|#{1,6}\s|>\s?|[-*]\s|\d+\.\s)/.test(lines[i]!))paragraph.push(lines[i++]!);
  content.push({type:'paragraph',content:markdownInline(paragraph.join('\n'))});
 }
 return {type:'doc',version:1,content};
}
function markdownInline(text:string,depth=0):AdfNode[]{
 if(depth>8)return [{type:'text',text}];
 const result:AdfNode[]=[];let plain='';const flush=()=>{if(plain){result.push({type:'text',text:plain});plain='';}};
 for(let i=0;i<text.length;){
  if(text[i]==='\\'&&i+1<text.length){plain+=text[i+1];i+=2;continue;}
  if(text[i]==='\n'){flush();result.push({type:'hardBreak'});i++;continue;}
  const rest=text.slice(i);const link=rest.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/);
  if(link){flush();result.push({type:'text',text:link[1],marks:[{type:'link',attrs:{href:link[2]}}]});i+=link[0].length;continue;}
  const marker=rest.startsWith('**')?'**':rest.startsWith('`')?'`':rest.startsWith('*')?'*':undefined;
  if(marker){const end=text.indexOf(marker,i+marker.length);if(end>i+marker.length){
   flush();const inner=text.slice(i+marker.length,end);const mark={type:marker==='**'?'strong':marker==='*'?'em':'code'};
   result.push(...(marker==='`'?[{type:'text',text:inner}]:markdownInline(inner,depth+1)).map(n=>n.type==='text'?{...n,marks:[...(n.marks??[]),mark]}:n));i=end+marker.length;continue;
  }}
  plain+=text[i++];
 }
 flush();return result;
}
/** Normalize untrusted ADF into safe native text; never render remote HTML. */
export function richBlocks(value:unknown):RichBlock[]{
 if(typeof value==='string')value=wikiDocument(value);
 const output:RichBlock[]=[];let visited=0;
 function inline(node:AdfNode):z.infer<typeof inlineSchema>[] {
  if(++visited>20000)return [{text:'[Content truncated]'}];
  if(node.type==='text')return [{text:node.text??'',bold:node.marks?.some(m=>m.type==='strong'),italic:node.marks?.some(m=>m.type==='em'),code:node.marks?.some(m=>m.type==='code'),strike:node.marks?.some(m=>m.type==='strike'),underline:node.marks?.some(m=>m.type==='underline'),href:safeLink(node.marks?.find(m=>m.type==='link')?.attrs?.href)}];
  if(node.type==='hardBreak')return [{text:'\n'}];
  if(node.type==='mention')return [{text:String(node.attrs?.text??'@Mention')}];
  if(node.type==='emoji')return [{text:String(node.attrs?.text??node.attrs?.shortName??'')}];
  if(node.type==='inlineCard')return [{text:String(node.attrs?.url??'Link'),href:safeLink(node.attrs?.url)}];
  const result=(Array.isArray(node.content)?node.content:[]).flatMap(inline);
  if(node.type==='paragraph')result.push({text:'\n'});
  return result;
 }
 function walk(node:AdfNode,depth=0,prefix=''){
  if(!node||depth>30||++visited>20000)return;
  if(node.type==='table'){output.push({kind:'table',runs:[],rows:(node.content??[]).map(row=>(row.content??[]).map(cell=>inline(cell)))});return;}
  if(node.type==='panel'){output.push({kind:'panel',panel:String(node.attrs?.panelType??'info'),runs:inline(node)});return;}
  if(['paragraph','heading','codeBlock'].includes(node.type)){
   output.push({kind:node.type==='heading'?'heading':node.type==='codeBlock'?'code':'paragraph',runs:inline(node).map((r,i,a)=>i===a.length-1&&r.text==='\n'?{...r,text:''}:r),level:Number(node.attrs?.level??1),...(prefix?{prefix}:{})});return;
  }
  if(node.type==='bulletList'||node.type==='orderedList'){
   (node.content??[]).forEach((child,i)=>walk(child,depth+1,prefix+(node.type==='bulletList'?'• ':`${Number(node.attrs?.order??1)+i}. `)));return;
  }
  if(node.type==='blockquote'){(node.content??[]).forEach(n=>walk(n,depth+1,prefix+'› '));return;}
  if(['media','mediaSingle','mediaGroup'].includes(node.type)){output.push({kind:'attachment',runs:[],...(prefix?{prefix}:{})});return;}
  if(node.type==='rule'){output.push({kind:'paragraph',runs:[{text:'────────'}]});return;}
  if(!node.content?.length&&!['doc','listItem'].includes(node.type))output.push({kind:'paragraph',runs:[{text:'[Unsupported Jira content — open in Jira]'}]});
  for(const child of node.content??[])walk(child,depth+1,prefix);
 }
 if(value&&typeof value==='object')walk(value as AdfNode);
 return output;
}
/** Dashboard-only threading fallback: Jira writes currently lack a verified parent
 * parameter across our transports. Recognize only our standalone leading reply
 * link, scoped to this site/issue; preserve the visible link and native parentId.
 * Recheck Jira REST/MCP/TWG contracts before extending this workaround. Prefer
 * native parent references when available; never send inferred IDs as native data.
 */
export function linkedReplyThreads(comments:JiraComment[],site:string|undefined,key:string):JiraComment[]{
 if(!site)return comments;
 let issueUrl:URL;try{issueUrl=new URL(`${site}/browse/${key}`);}catch{return comments;}
 return comments.map(comment=>{
  if(comment.parentId)return comment;
  const first=comment.blocks[0];
  if(first?.kind!=='paragraph'||first.prefix)return comment;
  const runs=first.runs.filter(run=>run.text.trim());
  if(!runs.length||runs.some(run=>!run.href||run.href!==runs[0].href||run.code))return comment;
  if(!/^Linked reply to \S[^\r\n]*$/.test(runs.map(run=>run.text).join('')))return comment;
  try{
   const url=new URL(runs[0].href!);
   if(url.origin!==issueUrl.origin||url.pathname!==issueUrl.pathname||url.username||url.password||url.hash)return comment;
   const params=[...url.searchParams];
   if(params.length!==1||params[0][0]!=='focusedCommentId'||!/^\d+$/.test(params[0][1])||params[0][1]===comment.id)return comment;
   return {...comment,parentId:params[0][1]};
  }catch{return comment;}
 });
}
/** Flatten threads with capped visual indentation, retaining orphaned/cyclic comments once. */
export function commentActivity(c:JiraComment){return Math.max(Date.parse(c.created)||0,Date.parse(c.updated??'')||0);}
export function newestComments(comments:JiraComment[]){return [...comments].sort((a,b)=>commentActivity(b)-commentActivity(a)||a.id.localeCompare(b.id));}
export function commentThreads(comments:JiraComment[]){
 comments=newestComments(comments);
 const map=new Map(comments.map(c=>[c.id,c]));const children=new Map<string,JiraComment[]>();
 for(const c of map.values()){if(c.parentId&&map.has(c.parentId)&&c.parentId!==c.id){const list=children.get(c.parentId)??[];list.push(c);children.set(c.parentId,list);}}
 const seen=new Set<string>();const rows:{comment:JiraComment;depth:number}[]=[];
 const visit=(root:JiraComment)=>{const stack=[{comment:root,depth:0}];while(stack.length){const row=stack.pop()!;if(seen.has(row.comment.id))continue;seen.add(row.comment.id);rows.push(row);for(const c of [...(children.get(row.comment.id)??[])].reverse())stack.push({comment:c,depth:row.depth+1});}};
 for(const c of map.values())if(!c.parentId||!map.has(c.parentId)||c.parentId===c.id)visit(c);
 for(const c of map.values())if(!seen.has(c.id))visit(c);
 return rows;
}
