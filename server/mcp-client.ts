import clientInfo from './mcp-client-info.json' with {type:'json'};
import {mcpFailure} from './mcp-diagnostics';
import {McpVerificationError} from './mcp-verification-error';
import {writeTool,type McpWriteTool,boardTool, type McpBoardTool,type McpContentTool} from './mcp-tools';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import {bindMcpAccount, mcpSiteOrigin, type McpBinding} from './mcp-binding';
import {mcpToolData, mcpIdentity} from './mcp-identity';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport, type StreamableHTTPClientTransportOptions} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {UnauthorizedError} from '@modelcontextprotocol/sdk/client/auth.js';
import {MCP_ENDPOINT, McpOAuthSession} from './mcp-oauth';

export class McpConnectionFailure extends Error {
  constructor(readonly stage:'connection'|'token'|'identity'|'consent'|'storage',readonly reason?:string){
    super(stage==='storage'?'Could not save the verified connection to the OS credential store.':stage==='consent'?'Atlassian did not complete authorization.':stage==='token'?'Atlassian token exchange failed.':stage==='identity'?'Atlassian account/site verification failed.':'Atlassian MCP connection failed. Check the OS credential store and authorize the intended account and Jira site.');
  }
}

/** Explicitly invoked connection; constructing/importing this module never contacts Jira. */
export class JiraMcpConnection {
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;
  private binding?: McpBinding;
  private connecting = false;
  private catalogue?: Promise<Tool[]>;
  private connected = false;
  private closed = false;
  // Inject transport I/O for offline contract tests; production keeps the fixed Atlassian endpoint.
  constructor(private readonly oauth: McpOAuthSession, private readonly siteUrl: string,
    private readonly fetch?: StreamableHTTPClientTransportOptions['fetch']) {mcpSiteOrigin(siteUrl);}
  async connect(): Promise<'connected' | 'authorization-required'> {
    if (this.closed) throw new Error('This Atlassian connection is closed.');
    if (this.connecting) throw new Error('An Atlassian connection is already in progress.');
    this.connecting = true;
    this.catalogue = undefined;
    this.connected = false;
    this.binding = undefined;
    let stage:'connection'|'identity'|'storage'='connection';
    try {
      this.oauth.restore();
      await this.client?.close();
      if (this.closed) throw new Error('This Atlassian connection is closed.');
      this.client = new Client(clientInfo);
      this.transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT), {authProvider: this.oauth, fetch: this.fetch});
      await this.client.connect(this.transport);
      if (this.closed) throw new Error('Connection closed.');
      stage='identity';
      const readIdentity=async(name:'getAccessibleAtlassianResources'|'atlassianUserInfo')=>{
        let result:unknown;
        try {result=await this.client!.callTool({name,arguments:{}});}
        catch {throw new McpVerificationError(`${name}: MCP tool request failed after authentication.`);}
        const data=mcpToolData(result,name);
        return data;
      };
      const resources=await readIdentity('getAccessibleAtlassianResources');
      const identity=mcpIdentity(await readIdentity('atlassianUserInfo'));
      const binding = bindMcpAccount(this.siteUrl, identity, resources, this.oauth.previousBinding());
      if (this.closed) throw new Error('Connection closed.');
      stage='storage';
      this.oauth.confirmBinding(binding);
      this.binding = binding;
      this.connected = true;
      return 'connected';
    }
    catch (error) {
      if (error instanceof UnauthorizedError && !this.closed) {return 'authorization-required';}
      mcpFailure('sdk.failed');
      await this.close();
      // SDK errors may contain OAuth responses. Never surface their raw message.
      throw new McpConnectionFailure(stage,error instanceof McpVerificationError?error.message:undefined);
    } finally {this.connecting = false;}
  }
  async completeAuthorization(callback: URL) {
    if (!this.transport) throw new Error('No authorization in progress.');
    const rejected=callback.searchParams.get('error');
    let code:string;
    try {code=this.oauth.acceptCallback(callback);}
    catch {await this.close();throw new McpConnectionFailure('consent',rejected&&['access_denied','invalid_scope','unauthorized_client','server_error','temporarily_unavailable'].includes(rejected)?rejected:undefined);}

    try { await this.transport.finishAuth(code); }
    catch {mcpFailure('token.exchange.failed'); await this.close(); throw new McpConnectionFailure('token'); }
    return this.connect();
  }
  verifiedBinding(): McpBinding {
    if (!this.connected || !this.binding) throw new Error('Connect to Atlassian first.');
    return {...this.binding};
  }
  async checkReadAccess(){
    const before=this.verifiedBinding();
    try{
      const resources=mcpToolData(await this.client!.callTool({name:'getAccessibleAtlassianResources',arguments:{}}),'getAccessibleAtlassianResources');
      const identity=mcpIdentity(mcpToolData(await this.client!.callTool({name:'atlassianUserInfo',arguments:{}}),'atlassianUserInfo'));
      const verified=bindMcpAccount(this.siteUrl,identity,resources,before),after=this.verifiedBinding();
      if(after.accountId!==before.accountId||after.cloudId!==before.cloudId||after.siteUrl!==before.siteUrl)throw Error();
      return verified;
    }catch{throw new Error('MCP authentication check failed. Check saved access or sign in again in Settings.');}
  }
  async disconnect() {
    try {await this.close();} finally {this.oauth.disconnect();}
  }
  async boardTools() {
    this.verifiedBinding();
    return this.catalogue ??= this.listTools().catch(error=>{this.catalogue=undefined;throw error;});
  }
  hasWriteAccess(){this.verifiedBinding();return this.oauth.hasWriteAccess();}
  async writeJiraTool(name:McpWriteTool,args:Record<string,unknown>){
    const binding=this.verifiedBinding();
    if(!this.hasWriteAccess())throw new Error('Authorize Jira changes through Reconnect MCP in Settings first.');
    if(args.cloudId!==binding.cloudId)throw new Error('MCP site binding does not match.');
    writeTool(await this.boardTools(),name,args);
    const current=this.verifiedBinding();
    if(current.accountId!==binding.accountId||current.cloudId!==binding.cloudId||current.siteUrl!==binding.siteUrl)throw new Error('MCP account or site changed.');
    let stage:'transport'|'decode'|'binding'='transport';
    try {
      const result=await this.client!.callTool({name,arguments:args});
      if(result.isError===true)mcpFailure('write.tool-error');
      stage='decode';const data=mcpToolData(result);
      stage='binding';const after=this.verifiedBinding();
      if(after.accountId!==binding.accountId||after.cloudId!==binding.cloudId||after.siteUrl!==binding.siteUrl)throw new Error();
      return data;
    }catch {mcpFailure(stage==='transport'?'write.transport.failed':stage==='decode'?'write.decode.failed':'write.binding.failed');throw new Error('Jira change delivery could not be confirmed. Refresh the issue and check Jira before retrying.');}
  }
  async readContentTool(name:McpContentTool,args:Record<string,unknown>){
    const binding=this.verifiedBinding();
    if(args.cloudId!==binding.cloudId)throw new Error('MCP site binding does not match.');
    boardTool(await this.boardTools(),name,args);
    try {const result=await this.client!.callTool({name,arguments:args});this.verifiedBinding();
      const data=mcpToolData(result);return data;
    }catch {throw new Error('MCP content read failed. Check issue access or refresh the saved connection.');}
  }
  async readIssueTool(args:Record<string,unknown>){
    const binding=this.verifiedBinding();
    if(args.cloudId!==binding.cloudId)throw new Error('MCP site binding does not match.');
    boardTool(await this.boardTools(),'searchJiraIssuesUsingJql',args);
    try {
      const result=await this.client!.callTool({name:'searchJiraIssuesUsingJql',arguments:args});
      this.verifiedBinding();return mcpToolData(result);
    } catch {throw new Error('MCP issue lookup failed. Check access to this issue or the saved connection in Settings.');}
  }
  async readBoardTool(name:McpBoardTool,args:Record<string,unknown>) {
    const binding=this.verifiedBinding();
    if(args.cloudId!==binding.cloudId)throw new Error('MCP site binding does not match.');
    const tools=await this.boardTools();
    boardTool(tools,name,args);
    try {
      const result=await this.client!.callTool({name,arguments:args});
      this.verifiedBinding();
      const data=mcpToolData(result);
      return data;
    } catch {throw new Error('MCP board read failed. Check permissions or reconnect in Settings.');}
  }
  async listTools() {
    if (!this.connected || !this.client) throw new Error('Connect to Atlassian first.');
    const tools = []; const seen = new Set<string>(); let cursor: string | undefined;
    try {
      do {
        const page = await this.client.listTools(cursor ? {cursor} : {});
        tools.push(...page.tools); cursor = page.nextCursor;
        if (cursor && (seen.has(cursor) || seen.size >= 100)) throw new Error('Invalid pagination');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return tools;
    } catch { throw new Error('Could not load the Atlassian tool catalogue.'); }
  }
  async close() {
    this.catalogue = undefined;
    this.binding = undefined;
    this.closed = true;
    this.connected = false;
    try { await this.client?.close(); }
    finally { this.client = undefined; this.transport = undefined; this.oauth.dispose(); }
  }
}
