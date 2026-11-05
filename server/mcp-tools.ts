import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
export const MCP_BOARD_TOOLS=['getJiraBoardConfig','listJiraBoardSprints','getJiraBoardIssueData'] as const;
export const MCP_CONTENT_TOOLS=['getJiraIssue','listJiraIssueComments','downloadJiraIssueAttachment','listJiraIssueTransitions','listJiraStatuses'] as const;
export type McpContentTool=typeof MCP_CONTENT_TOOLS[number];
export type McpBoardTool=typeof MCP_BOARD_TOOLS[number];
export function boardTool(tools:Tool[],name:McpBoardTool|McpContentTool|'searchJiraIssuesUsingJql',args:Record<string,unknown>){
 if(![...MCP_BOARD_TOOLS,...MCP_CONTENT_TOOLS,'searchJiraIssuesUsingJql'].includes(name))throw new Error('This MCP operation is not allowed.');
 const matches=tools.filter(t=>t.name===name);
 if(matches.length!==1)throw new Error(`Required MCP tool is unavailable: ${name}.`);
 const tool=matches[0],schema=tool.inputSchema;
 if(tool.annotations?.destructiveHint===true||tool.annotations?.readOnlyHint===false)throw new Error('MCP tool is not advertised as read-only.');
 for(const key of Object.keys(args))if(!schema.properties||!(key in schema.properties))throw new Error(`Unsupported MCP input contract: ${name}.`);
 try{if(!new AjvJsonSchemaValidator().getValidator(schema)(args).valid)throw new Error();}
 catch{throw new Error(`Unsupported MCP input contract: ${name}.`);}
 return tool;
}

export const MCP_WRITE_TOOLS=['transitionJiraIssue','addOrEditJiraIssueComment','uploadAttachmentToJiraIssue'] as const;
export type McpWriteTool=typeof MCP_WRITE_TOOLS[number];
/** Only the three explicitly supported mutations, validated against the current catalogue. */
export function writeTool(tools:Tool[],name:McpWriteTool,args:Record<string,unknown>){
 if(!MCP_WRITE_TOOLS.includes(name))throw new Error('This MCP write operation is not allowed.');
 const matches=tools.filter(t=>t.name===name);
 if(matches.length!==1)throw new Error(`Required MCP write tool is unavailable: ${name}. Authorize Jira changes in Settings or check organization permissions.`);
 const tool=matches[0],schema=tool.inputSchema;
 if(tool.annotations?.destructiveHint===true||tool.annotations?.readOnlyHint===true)throw new Error('Unsupported MCP write tool contract.');
 for(const key of Object.keys(args))if(!schema.properties||!(key in schema.properties))throw new Error(`Unsupported MCP input contract: ${name}.`);
 try{if(!new AjvJsonSchemaValidator().getValidator(schema)(args).valid)throw new Error();}
 catch{throw new Error(`Unsupported MCP input contract: ${name}.`);}
 return tool;
}
