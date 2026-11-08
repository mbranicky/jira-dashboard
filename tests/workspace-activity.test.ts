import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agentActivity,activityKey,readWorkspaceActivity,type ActivityReader} from '../shared/workspace-activity';
const agent={id:'a',workspaceId:'w',status:'idle',pendingPermissions:[],updatedAt:'2026-11-07T10:00:00Z'};
test('idle is not completion; explicit finished attention is, and running takes precedence',()=>{
 assert.equal(agentActivity(agent).state,'idle');
 assert.equal(agentActivity({...agent,attentionReason:'finished'}).state,'finished');
 assert.equal(agentActivity({...agent,status:'running',attentionReason:'finished'}).state,'working');
 assert.equal(agentActivity({...agent,status:'running',pendingPermissions:[{}]}).state,'needs-input');
 assert.equal(agentActivity({...agent,status:'error'}).state,'failed');
});
test('reads only unique links, isolates failures, rejects wrong workspace and archived agents',async()=>{
 const seen:string[]=[];const reader:ActivityReader={agents:{ref:id=>({refresh:async()=>{seen.push(id);if(id==='error')throw Error('private');return {agent:{...agent,id,...(id==='wrong'?{workspaceId:'other'}:{}),...(id==='archived'?{archivedAt:'now'}:{})}};}})},workspaces:{ref:id=>({refresh:async()=>({id,status:'done',activityAt:null})})}};
 const links=['a','error','wrong','archived'].map(agentId=>({workspaceId:'w',agentId}));
 const result=await readWorkspaceActivity(reader,[...links,links[0],{workspaceId:'manual'}]);
 assert.equal(seen.length,4);assert.equal(result[activityKey(links[0])].state,'idle');
 for(const link of links.slice(1))assert.equal(result[activityKey(link)].state,'unavailable');
 assert.equal(result[activityKey({workspaceId:'manual'})].state,'idle');
 assert.ok(!JSON.stringify(result).includes('private'));
});
