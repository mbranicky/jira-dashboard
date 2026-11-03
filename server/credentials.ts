import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute} from 'node:path';
import {parseEnv} from 'node:util';
export type Credentials={email:string;token:string};
// Credentials necessarily exist in JS memory during authentication. Never persist them.
export async function loadCredentials(path:string):Promise<Credentials>{
 if(!isAbsolute(path))throw new Error('Set an absolute jira.env path on this Paseo host.');
 let file;
 try{file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);}catch{throw new Error('Cannot read jira.env. Use a regular, owner-only file, not a symbolic link.');}
 const bytes=Buffer.alloc(65537);
 try{
  const info=await file.stat();
  if(!info.isFile()||info.size>65536)throw new Error('jira.env must be a small regular file.');
  if(process.platform!=='win32'&&((info.mode&0o077)||info.uid!==process.getuid?.()))throw new Error('Protect jira.env with owner-only permissions (chmod 600) and ownership by the Paseo host user.');
  let length=0;
  while(length<bytes.length){const result=await file.read(bytes,length,bytes.length-length,null);if(!result.bytesRead)break;length+=result.bytesRead;}
  if(length>65536)throw new Error('jira.env must be a small regular file.');
  let values:Record<string,string|undefined>;
  try{values=parseEnv(bytes.subarray(0,length).toString('utf8'));}catch{throw new Error('Could not parse jira.env.');}
  const email=values.JIRA_EMAIL?.trim(),token=values.JIRA_API_TOKEN?.trim();
  if(!email||!token||!/^[^\s:]+@[^\s]+$/.test(email)||/[\r\n]/.test(token))throw new Error('jira.env needs valid JIRA_EMAIL and JIRA_API_TOKEN values.');
  return {email,token};
 }finally{bytes.fill(0);await file.close();}
}
export function authorization(auth:Credentials){
 const bytes=Buffer.from(`${auth.email}:${auth.token}`);
 try{return `Basic ${bytes.toString('base64')}`;}finally{bytes.fill(0);}
}
export function redactCredentials(message:string,auth:Credentials){
 let result=message;
 for(const value of [authorization(auth),authorization(auth).slice(6),auth.token,auth.email])result=result.split(value).join('[redacted]');
 return result;
}
