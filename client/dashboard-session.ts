import {useSyncExternalStore,type SetStateAction} from 'react';
import {createDashboardSessions,type DashboardSession} from '../shared/dashboard-session';
const sessions=createDashboardSessions();
export function useDashboardSession(hostId:string){
 const state=useSyncExternalStore(sessions.subscribe,()=>sessions.read(hostId));
 function set<K extends keyof DashboardSession>(key:K,value:SetStateAction<DashboardSession[K]>){
  const current=sessions.read(hostId)[key];
  sessions.update(hostId,{[key]:typeof value==='function'?(value as (previous:DashboardSession[K])=>DashboardSession[K])(current):value});
 }
 return { ...state,
  setSelected:(value:SetStateAction<DashboardSession['selected']>)=>set('selected',value),
  setPanelWidth:(value:SetStateAction<number>)=>set('panelWidth',value),
  setPanelCollapsed:(value:SetStateAction<boolean>)=>set('panelCollapsed',value),
 };
}
