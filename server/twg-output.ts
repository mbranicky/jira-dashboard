import {failureFromOutput} from './twg-errors';
/** Structured stdout only. Never follow CLI-supplied file paths or render raw errors. */
export function parseTwgOutput(output:string):Record<string,unknown> {
 if(Buffer.byteLength(output)>2*1024*1024)throw new Error('TWG output limit exceeded.');
 let data:unknown;
 try{data=JSON.parse(output);}catch{throw new Error('TWG did not return direct JSON.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Unsupported TWG response.');
 const value=data as Record<string,unknown>;
 if('output_files' in value||'stdout_inline' in value||'stdout_stats' in value)throw new Error('TWG returned an output summary instead of direct JSON.');
 const failure=failureFromOutput(output);if(failure)throw failure;
 if(value.ok===false||value.success===false||value.error!=null||(Array.isArray(value.errors)&&value.errors.length>0))throw new Error('TWG reported a failed operation.');
 return value;
}
