import test from 'node:test';
import assert from 'node:assert/strict';
import {checkConnection} from '../server/connection-check';
const input={boardUrl:'https://example.atlassian.net/boards/1',envPath:'/example/jira.env'};
function dependencies(failure?:string,noSprints=false){
 const requests:{path:string;method:string}[]=[];
 return {requests,loadCredentials:async()=>({email:'user@example.com',token:'fixture-token'}),fetch:async(url:any,options:any)=>{
  const path=new URL(String(url)).pathname;requests.push({path,method:options?.method??'GET'});
  if(path.endsWith(failure??'never-match'))return new Response(JSON.stringify({message:'Unauthorized; scope does not match',secret:'do-not-echo'}),{status:401});
  let data:unknown;
  if(path.endsWith('/_edge/tenant_info'))data={cloudId:'12345678-1234-1234-1234-123456789012'};
  else if(path.endsWith('/myself'))data={accountId:'user-1',displayName:'Example user'};
  else if(path.endsWith('/configuration'))data={id:1,name:'Example board',columnConfig:{columns:[]}};
  else if(path.endsWith('/sprint'))data={values:noSprints?[]:[{id:2,name:'Sprint',state:'active'}],isLast:true};
  else data={issues:[],isLast:true};
  return new Response(JSON.stringify(data));
 }};
}
test('connection check reads the draft configuration without writes or cached authentication',async()=>{
 const deps=dependencies();const result=await checkConnection(input,deps as any);
 assert.equal(result.ok,true);assert.equal(result.steps.length,8);assert.ok(result.steps.every(s=>s.state==='passed'));
 assert.ok(deps.requests.every(r=>r.method==='GET'));
 await checkConnection(input,deps as any);assert.equal(deps.requests.filter(r=>r.path.endsWith('/myself')).length,2);
});
test('scope failure identifies the failing stage without exposing response contents',async()=>{
 const result=await checkConnection(input,dependencies('/configuration') as any);
 assert.equal(result.ok,false);assert.equal(result.steps.at(-1)?.label,'Board access');
 assert.match(result.steps.at(-1)!.message,/scopes/);assert.ok(!JSON.stringify(result).includes('do-not-echo'));
});
test('no sprint is explicitly skipped rather than claiming issue access was checked',async()=>{
 const result=await checkConnection(input,dependencies(undefined,true) as any);
 assert.equal(result.ok,true);assert.equal(result.steps.find(s=>s.label==='Sprint issues')?.state,'skipped');
});
test('invalid board URL fails before reading credentials',async()=>{
 const result=await checkConnection({...input,boardUrl:'https://not-jira.example/boards/1'},{loadCredentials:async()=>{throw Error('should not read');},fetch} as any);
 assert.equal(result.ok,false);assert.equal(result.steps[0].label,'Board URL');
});
