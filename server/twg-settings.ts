import {checkTwgConnection} from './twg-connection-check';
import {TwgFailure} from './twg-errors';
import {randomUUID} from 'node:crypto';
import {TwgConnection,TwgCompatibilityError} from './twg-client';
import type {z} from 'zod';
import type {twgState} from '../shared/twg';
type State=z.infer<typeof twgState>;
export function twgSettings(make=(path:string)=>new TwgConnection(path)) {
 let job:{value:State;connection:TwgConnection}|undefined;
 return {
  start(input:{action:'login'|'check';executable:string;site:string;profile:string;boardId?:number}):State {
   if(input.action==='login')throw new Error('TWG sign-in requires a terminal on the Paseo host. Run twg login there, then test access.');
   if(job?.value.state==='running')throw new Error('A TWG operation is already running.');
   job?.connection.close();
   const connection=make(input.executable);
   const current={connection,value:{id:randomUUID(),state:'running',message:'Checking TWG CLI access…'} as State};
   job=current;
   void (input.boardId?checkTwgConnection(connection,{site:input.site,profile:input.profile,boardId:input.boardId}):connection.checkAccess({site:input.site,profile:input.profile})).then(result=>{
    if(current.value.state!=='running')return;
    if(input.boardId){const checked=result as Awaited<ReturnType<typeof checkTwgConnection>>;current.value={...current.value,state:checked.ok?'succeeded':'failed',message:checked.ok?'Read connection verified':'Connection needs attention',result:checked};}
    else current.value={...current.value,state:'unverified',message:'Jira site access and board permissions remain unverified.'};
   }).catch(error=>{
    if(current.value.state==='running')current.value={...current.value,state:'failed',message:error instanceof TwgCompatibilityError||error instanceof TwgFailure?error.message:'TWG could not complete this action. Check installation, browser consent and CLI compatibility on the host, then retry.'};
   }).finally(()=>connection.close());
   return {...current.value};
  },
  poll(id:string):State {if(!job||job.value.id!==id)throw new Error('TWG operation expired. Please retry.');return {...job.value};},
  cancel(id:string):State {
   if(!job||job.value.id!==id)throw new Error('TWG operation expired.');
   if(job.value.state==='running'){job.value={...job.value,state:'cancelled',message:'TWG operation cancelled.'};job.connection.close();}
   return {...job.value};
  },
  close(){job?.connection.close();job=undefined;},
 };
}
