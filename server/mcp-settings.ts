import {mcpFailure} from './mcp-diagnostics';
import {randomUUID} from 'node:crypto';
import type {z} from 'zod';
import type {mcpState} from '../shared/mcp';
import {mcpSiteOrigin} from './mcp-binding';
import {createMcpCredentialStore} from './mcp-store';
import {createMcpCallback,McpCallbackTimeout} from './mcp-callback';
import {JiraMcpConnection,McpConnectionFailure} from './mcp-client';
type State=z.infer<typeof mcpState>;
type Target={hostId:string;site:string};
const busy=(state:State['state'])=>['connecting','authorizing','disconnecting'].includes(state);
export function mcpSettings(deps={store:createMcpCredentialStore,callback:createMcpCallback,connection:(session:Awaited<ReturnType<typeof createMcpCallback>>['session'],site:string)=>new JiraMcpConnection(session,site)}) {
 type Job={target:Target;value:State;flow?:Awaited<ReturnType<typeof createMcpCallback>>;completion?:Promise<void>;connection?:ReturnType<typeof deps.connection>};
 let job:Job|undefined;let closed=false;
 const same=(a:Target,b:Target)=>a.hostId===b.hostId&&mcpSiteOrigin(a.site)===mcpSiteOrigin(b.site);
 const current=(j:Job)=>!closed&&job===j&&busy(j.value.state);
 const snapshot=(j:Job):State=>({...j.value});
 async function release(j:Job){j.flow?.stop();await j.connection?.close().catch(()=>{});j.flow?.cancel();}
 async function run(j:Job,authorize:boolean,writeAccess=false){
  let stage: "store"|"callback"|"connection"="store";
  try{
   const store=await deps.store(j.target.hostId,j.target.site);
   if(!current(j))return;
   stage="callback";
   const flow=await deps.callback(async url=>{
    if(!current(j)||!authorize)throw new Error('Sign-in required.');
    j.value={id:j.value.id,state:'authorizing',message:'Continue in a browser on the Paseo host.',authorizationUrl:url.href};
   },600000,store,{writeAccess,forceAuthorization:authorize&&writeAccess});
   j.flow=flow;
   if(!current(j)){flow.cancel();return;}
   stage="connection";
   const connection=deps.connection(flow.session,j.target.site);j.connection=connection;
   let result=await connection.connect();
   if(!current(j)){await release(j);return;}
   if(result==='authorization-required'){
    if(!authorize)throw new Error();
    const callback=await flow.callback;
    if(!current(j))return;
    j.value={id:j.value.id,state:'connecting',message:'Verifying Atlassian account and site…'};
    result=await connection.completeAuthorization(callback);
   }
   if(!current(j)){await release(j);return;}
   if(result!=='connected')throw new Error();
   const binding=connection.verifiedBinding();
   flow.stop(); // Stop the callback timer without disposing the connected OAuth session.
   j.value={id:j.value.id,state:'connected',message:'Account and site verified. Board tool compatibility is checked when loading the dashboard.',writeAccess:flow.session.hasWriteAccess(),account:binding.displayName,accountId:binding.accountId,site:binding.siteUrl};
  }catch(error){
   mcpFailure('flow.failed');
   if(current(j))j.value={id:j.value.id,state:'failed',message:error instanceof McpCallbackTimeout?error.message:error instanceof McpConnectionFailure?`${error.message}${error.reason?` ${error.reason}`:''} Start sign-in again; if it repeats, report this message.`:stage==='store'?'Unable to initialize secure credential storage. Check the plugin installation and OS credential-store availability.':stage==='callback'?'Unable to start the local sign-in callback. Check local host permissions and retry.':'Unable to connect to Atlassian. Check the saved credentials, account and site, then sign in again.'};
   await release(j);
  }
 }
 return {
  async ensureConnection(target:Target){
   if(closed)throw new Error('MCP settings closed.');
   // Restore once after reload, without opening consent or replacing an active flow.
   if(!job){
    const j:Job={target:{...target,site:mcpSiteOrigin(target.site)},value:{id:randomUUID(),state:'connecting',message:'Restoring saved Atlassian connection…'}};
    job=j;j.completion=run(j,false);
   }
   const j=job;
   if(same(j.target,target)&&j.completion)await j.completion;
   return this.connection(target);
  },
  async checkConnection(target:Target){
   if(job?.value.state==='connected'){
    if(!same(job.target,target))throw new Error('The active MCP connection belongs to another host or site. Test its board URL or explicitly connect the intended site.');
    return this.connection(target);
   }
   await this.start({...target,authorize:false,browserOnHost:false});
   if(job?.completion)await job.completion;
   return this.connection(target);
  },
  connection(target:Target){
   if(closed||!job||!same(job.target,target)||job.value.state!=='connected'||!job.connection)throw new Error('Connect Atlassian MCP in Settings for this host and site first.');
   job.connection.verifiedBinding();return job.connection;
  },
  status(target:Target):State{return job&&same(job.target,target)?snapshot(job):{state:'idle',message:'Sign in or check a saved MCP connection.'};},
  async start(input:Target&{authorize:boolean;browserOnHost:boolean;writeAccess?:boolean}):Promise<State>{
   if(closed)throw new Error('MCP settings closed.');
   if(input.authorize&&!input.browserOnHost)throw new Error('Use a browser on the Paseo host to sign in.');
   if(job&&busy(job.value.state))throw new Error('An MCP operation is already running. Cancel it first.');
   const old=job;
   const j:Job={target:{hostId:input.hostId,site:mcpSiteOrigin(input.site)},value:{id:randomUUID(),state:'connecting',message:'Connecting to Atlassian…'}};
   job=j;
   if(old)await release(old);
   if(current(j))j.completion=run(j,input.authorize,input.writeAccess===true);
   return snapshot(j);
  },
  async cancel(input:Target&{id:string}):Promise<State>{
   if(!job||!same(job.target,input)||job.value.id!==input.id)return {state:'idle',message:'This sign-in is no longer active.'};
   const j=job;
   if(j.value.state==='connecting'||j.value.state==='authorizing'){
    j.value={id:j.value.id,state:'cancelled',message:'Sign-in cancelled. Saved credentials were kept.'};await release(j);
   }
   return snapshot(j);
  },
  async disconnect(target:Target):Promise<State>{
   if(closed)throw new Error('MCP settings closed.');
   if(job&&busy(job.value.state))throw new Error('Cancel the current MCP operation first.');
   const old=job;
   const j:Job={target,value:{id:randomUUID(),state:'disconnecting',message:'Disconnecting…'}};job=j;
   if(old)await release(old);
   try{
    const store=await deps.store(target.hostId,target.site);store.delete();
    if(current(j))j.value={state:'idle',message:'Disconnected. Saved MCP credentials removed from this host.'};
   }catch{if(current(j))j.value={state:'failed',message:'Could not delete saved credentials. Unlock the OS credential store and retry Disconnect.'};}
   return snapshot(j);
  },
  close(){closed=true;const old=job;job=undefined;if(old)void release(old);},
 };
}
