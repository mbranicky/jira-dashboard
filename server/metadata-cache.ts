import {createHash} from 'node:crypto';
// Only stable GET metadata is cached. Issue content, transitions and writes bypass it.
export function metadataTtl(url:string){
 const path=new URL(url).pathname;
 if(path.endsWith('/_edge/tenant_info'))return 24*60*60*1000;
 if(/\/rest\/api\/3\/status$/.test(path))return 60*60*1000;
 if(/\/rest\/api\/3\/myself$/.test(path))return 60*60*1000;
 if(/\/rest\/agile\/1\.0\/board\/\d+\/configuration$/.test(path))return 10*60*1000;
 return 0;
}
export function createMetadataFetch(fetcher:typeof fetch=fetch,now=Date.now){
 const entries=new Map<string,{until:number;response:Response}>();
 const pending=new Map<string,Promise<Response>>();
 return async(input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1],refresh=false):Promise<Response>=>{
  const url=String(input),ttl=metadataTtl(url);
  if(!ttl||(init?.method??'GET')!=='GET')return fetcher(input,init);
  const key=createHash('sha256').update(url+'\n'+JSON.stringify(init?.headers??{})).digest('hex');
  if(refresh)entries.delete(key);
  const entry=entries.get(key);
  if(entry&&entry.until>now())return entry.response.clone();
  const running=pending.get(key);if(running)return (await running).clone();
  const job=(async()=>{
   const response=await fetcher(input,init);
   if(response.status===200){
    // Parse before caching: malformed JSON must not become a sticky failure.
    await response.clone().json();
    if(entries.size>=128)entries.delete(entries.keys().next().value!);
    entries.set(key,{until:now()+ttl,response:response.clone()});
   }
   return response;
  })();
  pending.set(key,job);
  try{return (await job).clone();}finally{pending.delete(key);}
 };
}
export const metadataFetch=createMetadataFetch();
