import {transitionField} from './transition-fields';
import {z} from 'zod';
import {defineRpc} from '@getpaseo/plugin';
import {workInput} from './contracts';
export const moveOption=z.object({id:z.string(),name:z.string(),statusId:z.string(),column:z.string(),development:z.boolean(),required:z.array(z.string()),destinations:z.array(z.object({projectId:z.string(),name:z.string()})).optional(),fields:z.array(transitionField).optional()});
export const readMoves=defineRpc({name:'issue.moves',input:workInput,output:z.array(moveOption)});
export const moveIssue=defineRpc({name:'issue.move',input:workInput.extend({transitionId:z.string(),statusId:z.string(),fields:z.record(z.string(),z.string()).optional()}),output:z.object({warning:z.string().optional(),workspaceId:z.string().optional()})});
export const projectStatuses=defineRpc({name:'project.statuses',input:z.object({projectKey:z.string().regex(/^[A-Z][A-Z0-9_]*$/),refresh:z.boolean().optional()}),output:z.array(z.object({id:z.string(),name:z.string(),issueTypes:z.array(z.string()),statusIds:z.array(z.string()).optional()}))});
export function startsWorkOnMove(statusId:string,configured?:string,column?:{name:string;statusIds:string[]},configuredColumn?:string){
 if(configuredColumn!==undefined)return !!configuredColumn&&column?.name===configuredColumn;
 return !!configured&&(column?column.statusIds.includes(configured):statusId===configured);
}
