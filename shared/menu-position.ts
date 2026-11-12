export function menuPosition(anchor:{x:number;y:number;width:number;height:number},viewport:{width:number;height:number},height:number,options?:{width?:number;align?:'start'|'end'}){
 const gutter=12,width=Math.min(Math.max(options?.width??anchor.width,220),viewport.width-gutter*2);
 const below=Math.max(0,viewport.height-anchor.y-anchor.height-gutter-4),above=Math.max(0,anchor.y-gutter-4);
 const useBelow=below>=Math.min(height,220)||below>=above;
 const maxHeight=Math.min(height,useBelow?below:above);
 const top=useBelow?anchor.y+anchor.height+4:Math.max(gutter,anchor.y-maxHeight-4);
 return {left:Math.max(gutter,Math.min(options?.align==='end'?anchor.x+anchor.width-width:anchor.x,viewport.width-width-gutter)),top,width,maxHeight};
}
