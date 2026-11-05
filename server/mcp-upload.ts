import {randomUUID} from 'node:crypto';
/** Interpret only a small curl data format. This never invokes a shell or reads a path. */
export function mediaUploadRequest(command:string,filename:string,bytes:Buffer){
 const unsupported=()=>new Error('Unsupported MCP upload instructions. Upload this file in Jira.');
 if(command.length>32768||/[`$\x00]/.test(command))throw unsupported();
 const tokens:string[]=[];let token='',quote='',started=false;
 const source=command.replace(/\\\r?\n/g,' ');
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(quote){if(ch===quote)quote='';else if(ch==='\\'&&quote==='"'){if(!['"','\\'].includes(source[i+1]))throw unsupported();token+=source[++i];}else token+=ch;started=true;continue;}
  if(ch==='"'||ch==="'"){quote=ch;started=true;continue;}
  if(/\s/.test(ch)){if(started){tokens.push(token);token='';started=false;}continue;}
  if(/[;&|<>()\\]/.test(ch))throw unsupported();token+=ch;started=true;
 }
 if(quote)throw unsupported();if(started)tokens.push(token);
 if(tokens.shift()!=='curl')throw unsupported();
 let url:string|undefined,method:string|undefined,mode:'binary'|'form'|undefined;
 const headers:Record<string,string>={};
 for(let i=0;i<tokens.length;i++){
  const flag=tokens[i];
  if(['--silent','--show-error','--fail','-s','-S','-sS','-f'].includes(flag))continue;
  if(['--request','-X'].includes(flag)){if(method)throw unsupported();method=tokens[++i];continue;}
  if(['--header','-H'].includes(flag)){
   const match=/^([^:]+):\s*(.*)$/.exec(tokens[++i]??'');if(!match)throw unsupported();
   const key=match[1].toLowerCase(),value=match[2];
   if(headers[key]||/[\r\n]/.test(value))throw unsupported();
   if(key==='authorization'){if(!/^Bearer [A-Za-z0-9._~+/=-]+$/.test(value))throw unsupported();}
   else if(key==='accept'){if(value!=='application/json')throw unsupported();}
   else if(key==='content-type'){if(!['application/octet-stream','multipart/form-data'].includes(value))throw unsupported();}
   else throw unsupported();headers[key]=value;continue;
  }
  if(['--form','-F','--data-binary'].includes(flag)){
   if(mode)throw unsupported();const value=tokens[++i];mode=flag==='--data-binary'?'binary':'form';
   if(value!==(mode==='binary'?`@${filename}`:`file=@${filename}`))throw unsupported();continue;
  }
  if(flag==='--url'){if(url)throw unsupported();url=tokens[++i];continue;}
  if(flag.startsWith('https://')&&!url){url=flag;continue;}
  throw unsupported();
 }
 if(!url||!mode||method&&method!=='POST')throw unsupported();
 let target:URL;try{target=new URL(url);}catch{throw unsupported();}
 if(target.protocol!=='https:'||target.hostname!=='api.media.atlassian.com'||target.port||target.username||target.password||target.hash||!/^\/(upload|file)(\/|$)/.test(target.pathname))throw unsupported();
 let body:Buffer;
 if(mode==='form'){
  if(headers['content-type']&&headers['content-type']!=='multipart/form-data')throw unsupported();
  if(/[\r\n\x00]/.test(filename))throw unsupported();
  const boundary='paseo-'+randomUUID();headers['content-type']=`multipart/form-data; boundary=${boundary}`;
  body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename.replace(/"/g,'%22')}"\r\nContent-Type: application/octet-stream\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);
 }else{if(headers['content-type']&&headers['content-type']!=='application/octet-stream')throw unsupported();body=bytes;}
 return {url:target,options:{method:'POST',headers,body,redirect:'error' as const}};
}
export async function uploadMedia(fetcher:typeof fetch,command:string,filename:string,bytes:Buffer){
 const {url,options}=mediaUploadRequest(command,filename,bytes);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);timer.unref();
 try {
 const response=await fetcher(url,{...options,signal:controller.signal});
 if(!response.ok||!response.body)throw Error('Media upload failed.');
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>256*1024)throw Error('Oversized upload response.');chunks.push(part.value);}}finally{await reader.cancel();}
 const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 const id=result?.data?.id;
 if(typeof id!=='string'||!id||id.length>256)throw Error('Unsupported media upload response.');
 return id;
 }finally{clearTimeout(timer);}
}
