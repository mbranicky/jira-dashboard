import type {AdfNode} from './comments';
// Legacy Jira wiki markup, not Markdown. Unknown macros remain readable text.
export function wikiInline(text:string,depth=0):AdfNode[]{
 if(depth>8)return [{type:'text',text}];
 const pattern=/\{\{([^}]+)\}\}|\[([^\]|]+)\|([^\]]+)\]|\[(https?:\/\/[^\]]+)\]|\[~([^\]]+)\]|!([^!\n]+)!|\*([^*\n]+)\*|_([^_\n]+)_|\+([^+\n]+)\+|(?<![\w-])-(?=\S)([^\n]*?\S)-(?=$|[\s.,;:!?)}\]])/g;
 const nodes:AdfNode[]=[];let offset=0;
 for(const m of text.matchAll(pattern)){if(m.index!>offset)nodes.push({type:'text',text:text.slice(offset,m.index)});
  if(m[1])nodes.push({type:'text',text:m[1],marks:[{type:'code'}]});
  else if(m[2]||m[4])nodes.push({type:'text',text:m[2]??m[4],marks:[{type:'link',attrs:{href:m[3]??m[4]}}]});
  else if(m[5])nodes.push({type:'mention',attrs:{text:'@'+m[5]}});
  else if(m[6])nodes.push({type:'text',text:`[Attachment: ${m[6].split('|')[0]}]`});
  else{const value=m[7]??m[8]??m[9]??m[10]??'';const type=m[7]?'strong':m[8]?'em':m[9]?'underline':'strike';nodes.push(...wikiInline(value,depth+1).map(n=>({...n,marks:[...(n.marks??[]),{type}]})));}
  offset=m.index!+m[0].length;
 }
 if(offset<text.length)nodes.push({type:'text',text:text.slice(offset)});return nodes;
}
function wikiLines(value:string):AdfNode{
 const lines=value.replace(/\r\n?/g,'\n').split('\n');const content:AdfNode[]=[];const counters:number[]=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i]!;if(!line.trim())continue;
  const code=line.match(/^\{(code|noformat)(?::([^}]*))?\}$/);
  if(code){const body:string[]=[];while(++i<lines.length&&lines[i]!==`{${code[1]}}`)body.push(lines[i]!);content.push({type:'codeBlock',attrs:{language:code[2]??''},content:[{type:'text',text:body.join('\n')}]});continue;}
  if(line.startsWith('|')){const rows:AdfNode[]=[];do{const current=lines[i]!;const header=current.startsWith('||');rows.push({type:'tableRow',content:current.split(header?'||':'|').slice(1,-1).map(cell=>({type:header?'tableHeader':'tableCell',content:[{type:'paragraph',content:wikiInline(cell.trim())}]}))});i++;}while(i<lines.length&&lines[i]!.startsWith('|'));i--;content.push({type:'table',content:rows});continue;}
  const heading=line.match(/^h([1-6])\.\s+(.*)$/);const list=line.match(/^([*#]+)\s+(.*)$/);
  if(list){const marker=list[1]!;const depth=marker.length-1;counters.length=depth+1;counters[depth]=(counters[depth]??0)+1;content.push({type:'paragraph',attrs:{listDepth:marker.length-1},content:[{type:'text',text:'  '.repeat(depth)+(marker.endsWith('#')?`${counters[depth]}. `:'• ')},...wikiInline(list[2]!)]});continue;}
  counters.length=0;
  if(/^\{(panel|info|note|warning|tip)(?::[^}]*)?\}$/.test(line)){const type=line.match(/^\{(\w+)/)![1]!;const body:string[]=[];while(++i<lines.length&&lines[i]!==`{${type}}`)body.push(lines[i]!);content.push({type:'panel',attrs:{panelType:type},content:wikiDocument(body.join('\n')).content});continue;}
  content.push(heading?{type:'heading',attrs:{level:Number(heading[1])},content:wikiInline(heading[2]!)}:line.startsWith('bq. ')?{type:'blockquote',content:[{type:'paragraph',content:wikiInline(line.slice(4))}]}:{type:'paragraph',content:wikiInline(line.replace(/\\\\/g,'\n'))});
 }
 return {type:'doc',content};
}

// Block macros may share a line with their content. Extract them before inline
// parsing so punctuation and wiki marks in code stay literal.
export function wikiDocument(value:string):AdfNode{
 const content:AdfNode[]=[];const source=value.replace(/\r\n?/g,'\n');
 const macro=/(?<!\{)\{(code|noformat|quote)(?::([^}]*))?\}(?!\})/g;let offset=0;let match:RegExpExecArray|null;
 while((match=macro.exec(source))){
  const end=source.indexOf(`{${match[1]}}`,macro.lastIndex);if(end<0)continue;
  content.push(...(wikiLines(source.slice(offset,match.index)).content??[]));
  const body=source.slice(macro.lastIndex,end).replace(/^\n/,'').replace(/\n$/,'');
  content.push(match[1]==='quote'?{type:'blockquote',content:wikiLines(body).content}:{type:'codeBlock',attrs:{language:match[2]??''},content:[{type:'text',text:body}]});
  offset=end+match[1]!.length+2;macro.lastIndex=offset;
 }
 content.push(...(wikiLines(source.slice(offset)).content??[]));return {type:'doc',content};
}
