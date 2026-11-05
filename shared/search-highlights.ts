export type MatchRange={start:number;end:number};
/** Mirror dashboard substring search, including phrases spanning the key/title boundary. */
export function issueSearchHighlights(issue:{key:string;summary:string},query:string){
 const ranges:MatchRange[]=[];
 if(query){
  const text=`${issue.key} ${issue.summary}`,folded=text.toLowerCase(),needle=query.toLowerCase();
  // Preserve original offsets when case conversion expands a character (e.g. İ).
  const offsets:{start:number;end:number}[]=[];let original=0;
  for(const character of text){
   const end=original+character.length;
   for(let i=0;i<character.toLowerCase().length;i++)offsets.push({start:original,end});
   original=end;
  }
  for(let at=folded.indexOf(needle);at!==-1;at=folded.indexOf(needle,at+1)){
   const range={start:offsets[at].start,end:offsets[at+needle.length-1].end};
   const previous=ranges.at(-1);
   if(previous&&range.start<=previous.end)previous.end=Math.max(previous.end,range.end);else ranges.push(range);
  }
 }
 const clip=(offset:number,length:number)=>ranges.flatMap(range=>{
  const start=Math.max(0,range.start-offset),end=Math.min(length,range.end-offset);
  return end>start?[{start,end}]:[];
 });
 return {key:clip(0,issue.key.length),summary:clip(issue.key.length+1,issue.summary.length)};
}
