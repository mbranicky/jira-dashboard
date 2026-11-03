// Synthetic product-team fixtures. No captured Jira data, names or credentials.
import {board,issue,site} from './harness';
export const registryMappings=[{name:'Product application',jiraProjectKey:'DEMO',paseoProjectId:'project-1',entrySkill:'init-issue',provider:'claude',model:'',modeId:'auto',isolation:'worktree',startWorkColumn:'IN PROGRESS'}];
const ticket=(key:string,summary:string,statusId:string,type='Story',labels=['experience'])=>({...issue(key,summary),projectKey:'DEMO',type,labels,statusId,status:statusId==='1'?'Ready for development':statusId==='2'?'In progress':'Done',statusCategory:statusId==='1'?'new':statusId==='2'?'indeterminate':'done',parent:{key:'DEMO-100',summary:'A smoother onboarding experience'},fixVersions:['1.2']});
export const registryBoard={...board,name:'Product team',user:{displayName:'Alex Morgan'},sprints:[{id:1,name:'Sprint 12',state:'active'}],issues:[
 ticket('DEMO-124','Keep search filters when returning to the dashboard','1'),
 ticket('DEMO-128','Show a helpful empty state for new projects','1'),
 ticket('DEMO-131','Prevent duplicate invitations on slow connections','1','Bug',['reliability']),
 {...ticket('DEMO-123','Make project setup feel effortless','2'),linkedWorkspace:{workspaceId:'workspace-demo',agentId:'agent-demo'}},
 ticket('DEMO-119','Improve keyboard navigation in the project picker','2','Bug',['accessibility']),
 ticket('DEMO-115','Add a welcome checklist for new team members','3'),
 ticket('DEMO-112','Remember the last selected workspace','3'),
]};
export const registryDetails={description:[],richDescription:[
 {kind:'paragraph',runs:[{text:'Help new team members create their first project with clear steps, useful defaults and helpful feedback.'}]},
 {kind:'heading',level:2,runs:[{text:'What success looks like'}]},
 {kind:'paragraph',prefix:'• ',runs:[{text:'Keep the setup focused on the essential choices.'}]},
 {kind:'paragraph',prefix:'• ',runs:[{text:'Explain each step without technical jargon.'}]},
 {kind:'paragraph',prefix:'• ',runs:[{text:'Make every control comfortable to use on mobile.'}]},
 {kind:'quote',runs:[{text:'A new team member should be ready to start in under two minutes.'}]},
],assignee:'Alex Morgan',reporter:'Sam Taylor',dueDate:null,created:'2026-11-01T09:00:00Z',updated:'2026-11-03T10:00:00Z'};
export function registryRpc(){
 cy.intercept('POST','/__rpc/*',request=>{
 const name=request.url.split('/').pop()!;
 const responses:Record<string,unknown>={'board.read':registryBoard,'issue.details':registryDetails,'attachments.list':{site,files:[]},'attachments.settings':{enabled:true,uploadLimit:25000000},'comments.list':{site,comments:[{id:'1',parentId:null,author:'Sam Taylor',created:'2026-11-03T09:30:00Z',updated:null,restricted:false,blocks:[{kind:'paragraph',runs:[{text:'The updated flow is ready for review. Keyboard navigation and the mobile layout are covered.'}]}]}],nextStart:null,total:1},'project.statuses':[]};
 if(!(name in responses))throw Error(`Unexpected preview RPC: ${name}`);
 request.reply({body:responses[name]});
 }).as('previewRpc');
}
