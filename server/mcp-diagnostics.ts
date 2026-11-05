/** Production diagnostics accept fixed failure codes only, never provider data. */
const failures = [
 'sdk.failed', 'token.exchange.failed', 'flow.failed',
 'write.transport.failed', 'write.tool-error', 'write.decode.failed', 'write.binding.failed',
 'transitions.normalize.failed', 'comment.normalize.failed',
] as const;
type McpFailure = typeof failures[number];
export function mcpFailure(event:McpFailure){
 // Runtime guard also prevents accidental logging from an untyped caller.
 if(failures.includes(event))console.warn('[jira-mcp]',event);
}
