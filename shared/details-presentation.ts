/** Use the dashboard's available width, not the whole application window. */
export function detailsPresentation(mode:'modal'|'panel',compact:boolean,width:number){
 if(compact)return 'fullscreen' as const;
 if(mode==='modal')return 'modal' as const;
 return width>=1000?'panel' as const:'fullscreen' as const;
}

export function clampPanelWidth(width:number,available:number){
 return Math.max(360,Math.min(width,Math.max(360,available-400)));
}
