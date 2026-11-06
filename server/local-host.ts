import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHostClient} from '@getpaseo/client/node';
import type {PaseoApi} from '@getpaseo/client';

// Paseo 0.14 exposes label assignment only on its lower-level client.
// Verify identity before using a separately authenticated local connection.
export async function connectLocalHost(paseo:PaseoApi) {
  const {self}=await paseo.hosts.list();
  const {stdout}=await promisify(execFile)('paseo',['daemon','status','--json'],{timeout:15000});
  const status=JSON.parse(stdout) as {home:string;listen:string;serverId:string};
  if(status.serverId!==self.serverId)throw new Error('Cannot connect to this Paseo host for workspace labels. Check the daemon home configuration.');
  const client=createHostClient(status.listen,{clientId:'paseo-jira-sprint-workspace',clientType:'cli',localCredential:async()=> (await readFile(join(status.home,'local-credential'),'utf8')).trim(),logger:{debug(){},info(){},warn(){},error(){}}});
  try {await client.connect();}catch(error){await client.close();throw error;}
  return {client,home:status.home,serverId:self.serverId};
}
