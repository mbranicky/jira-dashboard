import {z} from 'zod';
import {readWorkspaceIssueByKey} from './jira';
const envelope=z.object({apiVersion:z.literal('v2'),command:z.literal('jira.workitem.get'),data:z.array(z.object({key:z.string()}).passthrough()),meta:z.object({acquisition:z.object({failed:z.number().optional(),omitted:z.number().optional(),truncated:z.number().optional()}).optional()}).optional()});
/** TWG get flattens Jira fields into each data item. Never render CLI HTML. */
export async function decodeTwgIssue(value:unknown,site:string,key:string){
 const parsed=envelope.safeParse(value);
 if(!parsed.success)throw new Error('Incomplete or unsupported TWG issue response.');
 const {data,meta}=parsed.data;
 if(meta?.acquisition&&Object.values(meta.acquisition).some(n=>n!==undefined&&n!==0))throw new Error('TWG could not return complete issue details.');
 if(data.length!==1||data[0].key!==key)throw new Error('TWG did not return the requested issue.');
 const {key:returnedKey,...fields}=data[0];
 try{return await readWorkspaceIssueByKey(async()=>({issues:[{key:returnedKey,fields}]}),site,key);}
 catch{throw new Error('Incomplete or unsupported TWG issue fields.');}
}
