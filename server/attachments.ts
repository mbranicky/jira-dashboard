import {assertRestConnection} from '../shared/connection-mode';
import {authorization} from './credentials';
import {metadataFetch} from './metadata-cache';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {loadCredentials,parseBoardUrl} from './jira';
import type {Connection} from '../shared/contracts';
import {attachmentSchema,CHUNK_SIZE,TRANSFER_LIMIT,type Attachment} from '../shared/attachments';
const raw=z.object({id:z.string(),filename:z.string(),size:z.number(),mimeType:z.string().optional(),author:z.object({displayName:z.string()}).optional(),created:z.string()});
const normalize=(value:unknown)=>{const f=raw.parse(value);return attachmentSchema.parse({...f,mimeType:f.mimeType??'application/octet-stream',author:f.author?.displayName??'Former user'});};
export type AttachmentSession={site:string;identity?:string;request:(path:string,options?:{body?:Buffer;contentType?:string;range?:string})=>Promise<Response>;upload?:(key:string,filename:string,bytes:Buffer)=>Promise<unknown[]>;uploadSettings?:()=>Promise<{enabled:boolean;uploadLimit:number;limitSource?:'plugin'}>};
export async function attachmentsSession(config:Connection,fetcher:typeof fetch=metadataFetch){
 assertRestConnection(config);
 const {site}=parseBoardUrl(config.boardUrl);
 const tenant=await fetcher(`${site}/_edge/tenant_info`,{redirect:'error',signal:timeout(15000)});
 if(!tenant.ok)throw new Error('Cannot resolve Jira.');
 const {cloudId}=z.object({cloudId:z.string().uuid()}).parse(await tenant.json());
 const request=async(path:string,options:{body?:Buffer;contentType?:string;range?:string}={})=>{
  if(!/^\/rest\/api\/3\/(issue\/[A-Z][A-Z0-9_]*-[1-9]\d*(\?fields=attachment|\/attachments)|attachment\/(meta|content\/\d+\?redirect=false))$/.test(path))throw new Error('Unsupported attachment endpoint.');
  if(options.body&&!path.endsWith('/attachments'))throw new Error('Unsupported attachment write.');
  const auth=await loadCredentials(config.envPath);
  let response:Response;
  try{response=await fetcher(`https://api.atlassian.com/ex/jira/${cloudId}${path}`,{method:options.body?'POST':'GET',redirect:'error',signal:timeout(60000),headers:{Authorization:authorization(auth),Accept:options.range?'*/*':'application/json',...(options.range?{Range:options.range}:{}),...(options.body?{'Content-Type':options.contentType!,'X-Atlassian-Token':'no-check'}:{})},...(options.body?{body:options.body}:{})});}catch{throw new Error(options.body?'Upload delivery could not be confirmed. Refresh attachments and check Jira before uploading again.':'Cannot fetch the attachment. Check the connection or open it in Jira.');}
  if(!response.ok)throw new Error(options.body&&response.status>=500?'Upload delivery could not be confirmed. Refresh attachments and check Jira before uploading again.':`Jira attachment request failed (HTTP ${response.status}). Check token scopes, permissions and upload limits.`);
  return response;
 };
 return {site,request,identity:JSON.stringify([site,'rest',config.envPath])};
}
export async function attachmentList(session:AttachmentSession,key:string){
 const data=z.object({fields:z.object({attachment:z.array(z.unknown()).default([])})}).parse(await(await session.request(`/rest/api/3/issue/${key}?fields=attachment`)).json());
 return {site:session.site,files:data.fields.attachment.map(normalize)};
}
export async function settings(session:AttachmentSession){if(session.uploadSettings)return session.uploadSettings();return z.object({enabled:z.boolean(),uploadLimit:z.number().nonnegative()}).parse(await(await session.request('/rest/api/3/attachment/meta')).json());}
export async function attachmentBytes(session:AttachmentSession,key:string,id:string,offset:number){
 const file=(await attachmentList(session,key)).files.find(f=>f.id===id);
 if(!file)throw new Error('Attachment no longer belongs to this issue or is unavailable.');
 if(file.size>TRANSFER_LIMIT)throw new Error('This attachment exceeds the 25 MB in-app limit. Open it in Jira.');
 if(offset>=file.size&&file.size!==0)throw new Error('Invalid attachment offset.');
 if(!file.size)return {base64:'',total:0,mimeType:file.mimeType};
 const end=Math.min(offset+CHUNK_SIZE,file.size)-1;
 const response=await session.request(`/rest/api/3/attachment/content/${id}?redirect=false`,{range:`bytes=${offset}-${Math.max(offset,end)}`});
 if(response.status!==206&&offset>0){await response.body?.cancel();throw new Error('Jira did not support this download range. Open the attachment in Jira.');}
 if(response.status===206){const range=response.headers.get('content-range');if(range!==`bytes ${offset}-${end}/${file.size}`){await response.body?.cancel();throw new Error('Jira returned an unexpected attachment range.');}}
 const reader=response.body?.getReader();if(!reader)throw new Error('Attachment content is unavailable.');
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>CHUNK_SIZE)throw new Error('Jira returned too much attachment data. Open it in Jira.');chunks.push(value);}}finally{await reader.cancel();}
 if(length!==Math.max(0,end-offset+1))throw new Error('Attachment content was incomplete.');
 return {base64:Buffer.concat(chunks).toString('base64'),total:file.size,mimeType:file.mimeType};
}
type Upload={key:string;filename:string;size:number;mimeType:string;chunks:Buffer[];received:number;expires:number;site:string;identity?:string;result?:Promise<Attachment[]>};
export function attachmentUploads(){
 const uploads=new Map<string,Upload>();
 const clean=()=>{for(const [id,u] of uploads)if(u.expires<Date.now())uploads.delete(id);};
 const timer=setInterval(clean,60000);timer.unref();
 const get=(id:string)=>{clean();const u=uploads.get(id);if(!u)throw new Error('Upload expired. Select the file again.');return u;};
 return {
  close(){clearInterval(timer);uploads.clear();},
  async begin(session:AttachmentSession,input:{key:string;filename:string;size:number;mimeType:string}){
   clean();const meta=await settings(session);
   if(!meta.enabled)throw new Error('Attachments are disabled in Jira.');
   if(input.size<=0||input.size>Math.min(meta.uploadLimit,TRANSFER_LIMIT))throw new Error('File exceeds the upload limit or is empty.');
   if(/[\r\n\x00/\\]/.test(input.filename))throw new Error('Invalid attachment filename.');
   if(uploads.size>=20||[...uploads.values()].reduce((sum,u)=>sum+(u.result?0:u.size),0)+input.size>50*1024*1024)throw new Error('Another upload is using the transfer buffer. Try again shortly.');
   await attachmentList(session,input.key);
   const id=randomUUID();uploads.set(id,{...input,chunks:[],received:0,expires:Date.now()+15*60000,site:session.site,identity:session.identity});return {uploadId:id};
  },
  chunk(id:string,offset:number,base64:string){
   const u=get(id);if(u.result)throw new Error('Upload was already submitted.');
   if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw new Error('Invalid upload data.');
   const bytes=Buffer.from(base64,'base64');
   if(offset!==u.received||!bytes.length||bytes.length>CHUNK_SIZE||u.received+bytes.length>u.size)throw new Error('Invalid upload chunk.');
   u.chunks.push(bytes);u.received+=bytes.length;u.expires=Date.now()+15*60000;return {received:u.received};
  },
  finish(session:AttachmentSession,id:string){
   const u=get(id);if(u.site!==session.site||u.identity!==session.identity)throw new Error('Jira site changed. Select the file again.');
   if(u.result)return u.result;
   if(u.received!==u.size)throw new Error('File transfer is incomplete.');
   u.result=(async()=>{
    const meta=await settings(session);if(!meta.enabled||u.size>meta.uploadLimit)throw new Error('Jira upload settings changed.');
    if(session.upload){try{const uploaded=await session.upload(u.key,u.filename,Buffer.concat(u.chunks));try{return z.array(z.unknown()).min(1).parse(uploaded).map(normalize);}catch{throw new Error('Upload response could not be confirmed. Refresh attachments and check Jira before uploading again.');}}catch(e){throw new Error(e instanceof Error?e.message:'Upload delivery could not be confirmed. Check Jira before uploading again.');}finally{u.chunks=[];}}
    const boundary=`paseo-${randomUUID()}`;const filename=u.filename.replace(/"/g,'%22');
    const mime=/^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(u.mimeType)?u.mimeType:'application/octet-stream';
    const data=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),...u.chunks,Buffer.from(`\r\n--${boundary}--\r\n`)]);
    try{const response=await session.request(`/rest/api/3/issue/${u.key}/attachments`,{body:data,contentType:`multipart/form-data; boundary=${boundary}`});try{return z.array(z.unknown()).min(1).parse(await response.json()).map(normalize);}catch{throw new Error('Upload response could not be confirmed. Refresh attachments and check Jira before uploading again.');}}
    catch(e){throw new Error(e instanceof Error?e.message:'Upload delivery could not be confirmed. Check Jira before uploading again.');}
    finally{u.chunks=[];}
   })();return u.result;
  },
  cancel(id:string){const u=uploads.get(id);if(u?.result)return {cancelled:false};uploads.delete(id);return {cancelled:true};}
 };
}
function timeout(ms:number){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);timer.unref();return controller.signal;}
