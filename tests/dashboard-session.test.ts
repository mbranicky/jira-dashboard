import test from 'node:test';
import assert from 'node:assert/strict';
import {createDashboardSessions} from '../shared/dashboard-session';
import {issueSchema} from '../shared/contracts';
test('selection, width and collapse survive leaving and remounting the dashboard',()=>{
 const sessions=createDashboardSessions();let notifications=0;
 const leave=sessions.subscribe(()=>notifications++);
 const selected={issue:issueSchema.parse({key:'TEST-1',summary:'Issue',statusId:'1',status:'Open',type:'Bug',priority:null,projectKey:'TEST'}),sprintId:51,site:'https://example.atlassian.net'};
 sessions.update('host-a',{selected,panelWidth:740,panelCollapsed:true});
 leave();
 // A newly mounted consumer reads the retained state after navigation.
 assert.deepEqual(sessions.read('host-a'),{selected,panelWidth:740,panelCollapsed:true});
 assert.equal(notifications,1);
 assert.deepEqual(sessions.read('host-b'),{panelWidth:520,panelCollapsed:false});
 sessions.update('host-a',{panelCollapsed:false});
 assert.equal(sessions.read('host-a').selected,selected);
 assert.equal(sessions.read('host-a').panelWidth,740);
 sessions.update('host-a',{selected:undefined});
 assert.equal(sessions.read('host-a').selected,undefined);
});
