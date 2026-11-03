import {createServer,type Server} from 'node:http';
import {randomBytes} from 'node:crypto';
import {attachmentList,attachmentBytes,type AttachmentSession} from './attachments';
import {CHUNK_SIZE,TRANSFER_LIMIT} from '../shared/attachments';
export function imageType(bytes:Buffer):string|undefined{
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()))return 'image/gif';
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'image/webp';
}
export function browserPreviews(){
 const entries=new Map<string,{expires:number;bytes?:Buffer;mime?:string}>();let server:Server|undefined;let starting:Promise<number>|undefined;let closed=false;let reserved=0;
 const clean=()=>{for(const [id,e] of entries)if(e.expires<Date.now())entries.delete(id);};
 const timer=setInterval(clean,30000);timer.unref();
 function listen(){return starting??=(new Promise<number>((resolve,reject)=>{
  if(closed){reject(new Error('Preview service closed.'));return;}
  server=createServer((req,res)=>{
   clean();res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
   const address=server!.address();const port=typeof address==='object'&&address?address.port:0;
   if(req.headers.host!==`127.0.0.1:${port}`||req.method!=='GET'){res.writeHead(403).end();return;}
   const match=/^\/([a-f0-9]{64})\/(probe|image)$/.exec(req.url??'');const entry=match?entries.get(match[1]!):undefined;
   if(!entry){res.writeHead(404).end('Preview expired. Open it again from Paseo.');return;}
   if(match![2]==='probe'){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','text/plain');res.end(match![1]);return;}
   if(!entry.bytes){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',entry.mime!);res.setHeader('Content-Disposition','inline');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.end(entry.bytes);
  });server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const a=server!.address();if(a&&typeof a==='object')resolve(a.port);});server.unref();
 })).catch(e=>{starting=undefined;throw e;});}
 return {
  async prepare(){clean();if(entries.size>=20)throw new Error('Too many previews. Try again later.');const port=await listen();const token=randomBytes(32).toString('hex');entries.set(token,{expires:Date.now()+5*60000});return {token,baseUrl:`http://127.0.0.1:${port}`};},
  async load(session:AttachmentSession,key:string,id:string,token:string){
   clean();const entry=entries.get(token);if(!entry)throw new Error('Preview expired.');
   const file=(await attachmentList(session,key)).files.find(f=>f.id===id);
   if(!file||!/^image\/(png|jpeg|gif|webp)$/.test(file.mimeType)||file.size>TRANSFER_LIMIT)throw new Error('Image cannot be previewed.');
   if(reserved+[...entries.values()].reduce((n,e)=>n+(e.bytes?.length??0),0)+file.size>50*1024*1024)throw new Error('Preview memory limit reached.');
   reserved+=file.size;try{
   const chunks:Buffer[]=[];for(let offset=0;offset<file.size;offset+=CHUNK_SIZE){const part=await attachmentBytes(session,key,id,offset);if(part.total!==file.size)throw new Error('Attachment changed.');chunks.push(Buffer.from(part.base64,'base64'));}
   const bytes=Buffer.concat(chunks);const mime=imageType(bytes);if(!mime)throw new Error('File is not a supported image.');
   if(closed||!entries.has(token))throw new Error('Preview expired.');entry.bytes=bytes;entry.mime=mime;return {ready:true};
   }finally{reserved-=file.size;}
  },
  close(){closed=true;clearInterval(timer);entries.clear();server?.close();server?.closeAllConnections();}
 };
}
