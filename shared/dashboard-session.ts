import type {Issue} from './contracts';
export type BoardView = {search:string; columnKey?:string};
export type DashboardSession={
 boardViews?:Record<string,BoardView>;
 selected?:{boardKey?:string;issue:Issue;sprintId:number;site:string};
 panelWidth:number;
 panelCollapsed:boolean;
};
/** Client-session state, isolated per Paseo host; survives screen unmounts. */
export function createDashboardSessions(){
 const states=new Map<string,DashboardSession>();
 const listeners=new Set<()=>void>();
 return {
  read(host:string){let state=states.get(host);if(!state){state={panelWidth:520,panelCollapsed:false};states.set(host,state);}return state;},
  update(host:string,patch:Partial<DashboardSession>){const current=this.read(host);states.set(host,{...current,...patch});listeners.forEach(listener=>listener());},
  updateBoard(host:string,board:string,patch:Partial<BoardView>){
   if(!board)return;
   const views=this.read(host).boardViews;
   this.update(host,{boardViews:{...views,[board]:{search:'',...views?.[board],...patch}}});
  },
  subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
 };
}
