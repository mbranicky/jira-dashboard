import type {Connection} from './contracts';
export function assertRestConnection(config:Connection){
 if(config.transport==='mcp')throw new Error('This operation is not available in the MCP board preview. Open the issue in Jira.');
 if(config.transport==='twg')throw new Error('This operation is unavailable in TWG read-only mode. Make Jira changes in Jira.');
}
