import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readBoardWorkspaceLinks,workIdentity} from '../server/work';
test('board links persist across reloads, include partial workspaces, and stay site scoped',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'jira-links-'));
 try{
  const site='https://example.atlassian.net';
  await writeFile(join(dir,workIdentity(site,'KEY-1').key+'.json'),JSON.stringify({workspaceId:'workspace',agentId:'agent'}));
  await writeFile(join(dir,workIdentity(site,'KEY-2').key+'.json'),JSON.stringify({workspaceId:'partial'}));
  assert.deepEqual(await readBoardWorkspaceLinks(dir,site,['KEY-1','KEY-2','KEY-3']),{'KEY-1':{workspaceId:'workspace',agentId:'agent'},'KEY-2':{workspaceId:'partial'}});
  assert.deepEqual(await readBoardWorkspaceLinks(dir,'https://other.atlassian.net',['KEY-1']),{});
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('workspace availability excludes removed and archiving workspaces, but not finished work',async()=>{
 const {activeWorkspace}=await import('../server/work');
 const check=(value:unknown)=>activeWorkspace({workspaces:{ref:()=>({refresh:async()=>value})}} as any,'workspace');
 assert.equal(await check(null),false);
 assert.equal(await check({archivingAt:'2026-11-01'}),false);
 assert.equal(await check({archivingAt:null,status:'done'}),true);
 await assert.rejects(activeWorkspace({workspaces:{ref:()=>({refresh:async()=>{throw new Error('offline');}})}} as any,'workspace'),/offline/);
});
