import type {Issue} from './contracts';
export type DashboardSession={
 selected?:{issue:Issue;sprintId:number;site:string};
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
  subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
 };
}
