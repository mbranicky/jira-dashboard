import {z} from 'zod';
import {TRANSFER_LIMIT} from '../shared/attachments';
const metadata=z.object({enabled:z.boolean(),uploadLimit:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)});
/** MCP/TWG have no native settings reader today. Jira documents this specific
 * endpoint as anonymous. Never reuse OAuth, CLI or REST credentials here.
 * Revisit native readers as their advertised contracts evolve. */
export async function publicAttachmentSettings(site:string,fetcher:typeof fetch=fetch){
 const url=new URL(site);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.atlassian.net')||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error('Invalid Jira Cloud site.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);timer.unref();
 try{
  const response=await fetcher(`${url.origin}/rest/api/3/attachment/meta`,{method:'GET',headers:{Accept:'application/json'},credentials:'omit',redirect:'error',signal:controller.signal});
  if(!response.ok||!response.body)throw Error('Attachment settings unavailable.');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16384)throw Error('Oversized settings response.');chunks.push(part.value);}}finally{await reader.cancel();}
  return metadata.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
 }catch{
  // This is upload capability, not a claim that Jira attachments are enabled.
  // limitSource makes the unknown Jira settings explicit to the client.
  return {enabled:true,uploadLimit:TRANSFER_LIMIT,limitSource:'plugin' as const};
 }finally{clearTimeout(timer);}
}
