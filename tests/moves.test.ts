import test from 'node:test';
import assert from 'node:assert/strict';
import {performMove} from '../server/moves';
import {startsWorkOnMove} from '../shared/moves';
const target={id:'1',name:'Start',statusId:'2',column:'Development',development:true,required:[] as string[]};
test('move always transitions before starting work',async()=>{
 const calls:string[]=[];
 await performMove({transitionId:'1',statusId:'2'},[target],async()=>{calls.push('jira');},async()=>{calls.push('work');return {workspaceId:'w'};});
 assert.deepEqual(calls,['jira','work']);
});
test('unavailable and mismatched transitions never write',async()=>{
 for(const [input,options] of [[{transitionId:'bad',statusId:'2'},[target]],[{transitionId:'1',statusId:'bad'},[target]]] as const){
 await assert.rejects(performMove(input,[...options],async()=>assert.fail('write'),async()=>{assert.fail('start');}));
 }
});
test('failed Jira transition cannot launch work; post-transition failure reports partial success',async()=>{
 await assert.rejects(performMove({transitionId:'1',statusId:'2'},[target],async()=>{throw Error('denied');},async()=>{assert.fail('start');}),/denied/);
 const result=await performMove({transitionId:'1',statusId:'2'},[target],async()=>{},async()=>{throw Error('provider unavailable');});
 assert.match(result.warning!,/Jira status changed/);
});
test('other workflow stages only transition Jira',async()=>{
 await performMove({transitionId:'1',statusId:'2'},[{...target,development:false}],async()=>{},async()=>{assert.fail('start');});
 assert.equal(startsWorkOnMove('42','42'),true);
 assert.equal(startsWorkOnMove('42','43'),false);
 assert.equal(startsWorkOnMove('42'),false);
 assert.equal(startsWorkOnMove('42',''),false);
});

test('project statuses deduplicate by ID and preserve issue type availability',async()=>{
 const {normalizeProjectStatuses}=await import('../server/jira');
 assert.deepEqual(normalizeProjectStatuses([
 {name:'Bug',statuses:[{id:'42',name:'Implementing'}]},
 {name:'Story',statuses:[{id:'42',name:'Implementing'},{id:'43',name:'Implementing'}]}
 ]),[{id:'42',name:'Implementing',issueTypes:['Bug','Story']},{id:'43',name:'Implementing',issueTypes:['Story']}]);
});
test('board status options include empty statuses without extra Jira permissions',async()=>{
 const {boardStatusOptions}=await import('../server/jira');
 assert.deepEqual(boardStatusOptions([{name:'Development',statuses:[{id:'42'},{id:'43'}]}],[],'TD'),
 [{id:'42',name:'Development · status 42',issueTypes:[]},{id:'43',name:'Development · status 43',issueTypes:[]}]);
});
test('board dropdown uses real status names, removes repeated IDs and distinguishes same-name statuses',async()=>{
 const {boardStatusOptions}=await import('../server/jira');
 const options=boardStatusOptions([{name:'OPEN',statuses:[{id:'1'},{id:'1'},{id:'2'},{id:'3'}]}],[],'TD',[
 {id:'1',name:'New'},{id:'2',name:'New'},{id:'3',name:'Development Ready'}
 ]);
 assert.deepEqual(options,[{id:'1',name:'New · status 1',issueTypes:[]},{id:'2',name:'New · status 2',issueTypes:[]},{id:'3',name:'Development Ready',issueTypes:[]}]);
 assert.equal(new Set(options.map(s=>s.name)).size,options.length);
});
test('start-work selector lists unique alphabetically sorted board columns',async()=>{
 const {boardColumnOptions}=await import('../server/jira');
 assert.deepEqual(boardColumnOptions([
 {name:'Open',statuses:[{id:'1'},{id:'2'}]},
 {name:'Blocked',statuses:[{id:'3'}]},
 {name:'Open',statuses:[{id:'2'},{id:'4'}]}
 ]),[
 {id:'Blocked',name:'Blocked',statusIds:['3'],issueTypes:[]},
 {id:'Open',name:'Open',statusIds:['1','2','4'],issueTypes:[]}
 ]);
});
test('column trigger covers all destination statuses and preserves legacy selections',()=>{
 const column={name:'Development',statusIds:['42','43']};
 assert.equal(startsWorkOnMove('43',undefined,column,'Development'),true);
 assert.equal(startsWorkOnMove('43',undefined,column,'Review'),false);
 assert.equal(startsWorkOnMove('43','42',column),true);
 assert.equal(startsWorkOnMove('43','42',column,''),false);
});
