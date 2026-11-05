import {useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Dashboard} from '../../client/dashboard';
import {FocusScope} from '../../client/focus-scope';
import {TestHost} from './paseo-client';
export const site='https://example.atlassian.net';
export const issue=(key='TEST-1',summary='An example issue with a complete readable title')=>({key,summary,statusId:'1',status:'Open',statusCategory:'new',type:'Bug',priority:'Medium',projectKey:'TEST',parent:{key:'TEST-100',summary:'Example parent'},fixVersions:['1.0'],labels:['alpha','beta']});
export const board={site,boardId:1,name:'Example board',checkedAt:'2026-11-03T10:00:00Z',user:{displayName:'Test user'},columns:[{name:'OPEN',statusIds:['1']},{name:'IN PROGRESS',statusIds:['2']},{name:'DONE',statusIds:['3']}],sprints:[{id:1,name:'Sprint one',state:'active'},{id:2,name:'Sprint two',state:'future'},{id:3,name:'Old sprint',state:'closed'}],selectedSprintId:1,issues:[issue(),issue('TEST-2','Second issue')]};
export const details={description:[],richDescription:Array.from({length:35},(_,i)=>({kind:'paragraph',runs:[{text:`Description paragraph ${i+1}. Long issue content to exercise scrolling.`}]})),assignee:'Test user',reporter:'Example reporter',dueDate:null,created:'2026-11-01T10:00:00Z',updated:'2026-11-03T10:00:00Z'};
export function stubRpc(options:{error?:boolean;many?:boolean}={}){
 const data=options.many?{...board,issues:Array.from({length:18},(_,i)=>issue(`TEST-${i+1}`,`Issue ${i+1}`))}:board;
 cy.intercept('POST','/__rpc/*',request=>{
  const name=request.url.split('/').pop();
  if(name==='board.read'){
   if(options.error)return request.reply({statusCode:403,body:{error:'Jira denied board access.'}});
   return request.reply({body:data});
  }
  const responses:Record<string,unknown>={'mcp.status':{state:'idle',message:'Sign in or check a saved MCP connection.'},'issue.details':details,'attachments.list':{site,files:[]},'attachments.settings':{enabled:true,uploadLimit:25000000},'comments.list':{site,comments:[],nextStart:null,total:0},'project.statuses':[]};
  if(!(name! in responses))throw Error(`Unexpected RPC ${name}`);
  request.reply({body:responses[name!]});
 }).as('rpc');
}
const colors={surface0:'#242932',surface1:'#2d333e',surface2:'#373f4c',border:'#454d5b',foreground:'#f4f5f7',foregroundMuted:'#b7beca',accent:'#8ab4ff',accentForeground:'#14233a',statusDanger:'#f28080',statusSuccess:'#72c893',statusWarning:'#e2b46b'};
let hostCounter=0;
export function Harness({transport='rest',twgWrites=false,mcpWrites=false,mode='modal',failSave=false,light=false,preview=false,mappingItems=[],navigation={}}:{transport?:'rest'|'twg'|'mcp';twgWrites?:boolean;mcpWrites?:boolean;mode?:'modal'|'panel';failSave?:boolean;light?:boolean;preview?:boolean;mappingItems?:unknown[];navigation?:any}){
 const [hostId]=useState(()=>`test-host-${++hostCounter}`);
 const [cache]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0,refetchOnWindowFocus:false}}}));
 const [away,setAway]=useState(false);const {width}=useWindowDimensions();
 const palette=light?{...colors,surface0:'#ffffff',surface1:'#f5f5f7',surface2:'#e9ebef',border:'#d5d8df',foreground:'#20242a',foregroundMuted:'#606875',accent:'#275ba8',accentForeground:'#ffffff',statusDanger:'#a52d2d'}:colors;
 const props:any={host:{id:hostId},theme:{colors:palette},layout:{compact:width<760},navigation};
 return <TestHost failSave={failSave} initial={{connection:{transport,twgWrites,mcpWrites,mcpHostId:hostId,boardUrl:`${site}/boards/1`,envPath:'/example/jira.env',refreshSeconds:300},dashboard:{detailsView:mode},mappings:{items:mappingItems}}}>
  <QueryClientProvider client={cache}><FocusScope><View style={{height:'100%',backgroundColor:palette.surface0}}>
   {!preview?<button data-testid="navigate" onClick={()=>setAway(!away)}>{away?'Return to dashboard':'Visit workspace'}</button>:null}
   {away?<View><span>Simulated workspace</span></View>:<Dashboard {...props}/>}
  </View></FocusScope></QueryClientProvider>
 </TestHost>;
}
