import type {Connection} from '../shared/contracts';
import {draftIdentitySchema} from '../shared/comment-drafts';
import {commentsSession} from './comments';
import {TwgConnection} from './twg-client';
import {decodeTwgIdentity} from './twg-identity';
import {parseBoardUrl} from './jira';
import type {McpBinding} from './mcp-binding';
export async function draftIdentity(config:Connection,mcp:()=>Promise<McpBinding>,rest=commentsSession,make=(path:string)=>new TwgConnection(path)){
 const {site}=parseBoardUrl(config.boardUrl);
 if(config.transport==='mcp'){const binding=await mcp();if(binding.siteUrl!==site)throw Error('MCP site changed.');return draftIdentitySchema.parse({site,accountId:binding.accountId});}
 if(config.transport==='twg'){const cli=make(config.twgExecutable);try{await cli.requireProfileSupport();const identity=decodeTwgIdentity(await cli.readDashboard('identity',{site,profile:config.twgProfile}));return draftIdentitySchema.parse({site,accountId:identity.accountId});}finally{cli.close();}}
 const session=await rest(config);const identity=await session.request('/rest/api/3/myself') as {accountId?:unknown};return draftIdentitySchema.parse({site,accountId:identity?.accountId});
}
