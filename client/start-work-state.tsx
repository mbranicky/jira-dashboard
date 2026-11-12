import {createContext,useContext,useState,useSyncExternalStore,type ReactNode} from 'react';
type Result={workspaceId:string;agentId:string};
type State={busy:boolean;result?:Result};
const idle:State={busy:false};
function createStore(){
 const states=new Map<string,State>(),listeners=new Set<()=>void>();
 const update=(key:string,state:State)=>{states.set(key,state);listeners.forEach(listener=>listener());};
 return {
  subscribe:(listener:()=>void)=>{listeners.add(listener);return ()=>{listeners.delete(listener);};},
  get:(key:string)=>states.get(key)??idle,
  acquire(key:string){const state=states.get(key)??idle;if(state.busy)return false;update(key,{...state,busy:true});return true;},
  finish(key:string){update(key,{...(states.get(key)??idle),busy:false});},
  complete(key:string,result:Result){update(key,{busy:true,result});},
 };
}
const Context=createContext<ReturnType<typeof createStore>|null>(null);
// A dashboard owns one store for its host. Cards and portaled details subscribe
// by issue key; branch choices and errors remain in the initiating surface.
export function StartWorkProvider({children}:{children:ReactNode}){
 const [store]=useState(createStore);return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useStartWorkState(key:string){
 const shared=useContext(Context),[local]=useState(createStore),store=shared??local;
 const state=useSyncExternalStore(store.subscribe,()=>store.get(key),()=>idle);
 return {...state,acquire:()=>store.acquire(key),finish:()=>store.finish(key),complete:(result:Result)=>store.complete(key,result)};
}
