import {TwgFailure,failureFromOutput} from './twg-errors';
import {parseTwgOutput} from './twg-output';
import {twgTarget} from '../shared/twg';
import {execFile} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {decodeTwgColumns} from './twg-columns';

export class TwgCompatibilityError extends Error {constructor(){super('This TWG CLI does not advertise profile support. Update TWG on the host before testing access.');}}

export type TwgRequest = {executable: string; args: string[]; signal?: AbortSignal; timeoutMs?: number};
export type TwgRunner = (request: TwgRequest) => Promise<string>;

/** No shell, stdin, retries, logging, or credential-file access. */
export const runTwg: TwgRunner = ({executable, args, signal, timeoutMs = 30_000}) => new Promise((resolve, reject) => {
  const child = execFile(executable, args, {
    shell: false, timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024,
    encoding: 'utf8', windowsHide: true, signal, killSignal: 'SIGKILL',
  }, (error, stdout) => {
    if (error) {
      // Never surface stdout/stderr: CLI diagnostics can contain sensitive data.
      const code = (error as NodeJS.ErrnoException).code;
      reject(signal?.aborted?new TwgFailure('cancelled'):code==='ENOENT'?new TwgFailure('missing-cli'):(error.killed||code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER')?new TwgFailure('timeout'):failureFromOutput(stdout)??new TwgFailure('unknown'));
    } else resolve(stdout);
  });
  child.stdin?.end();
});

/** Experimental host-only adapter. Construction does not execute TWG. */
export class TwgConnection {
  private readonly pending = new Set<AbortController>();
  private closed = false;
  constructor(private readonly executable = 'twg', private readonly run: TwgRunner = runTwg) {
    if (executable !== 'twg' && !isAbsolute(executable)) throw new Error('Choose an absolute TWG executable path.');
  }
  private async json(args: string[]): Promise<unknown> {
    if (this.closed) throw new Error('TWG connection closed.');
    const controller = new AbortController(); this.pending.add(controller);
    try {
      const output = await this.run({executable: this.executable, args: [...args, '-o', 'json', '--output-summary', 'none'], signal: controller.signal});
      if (controller.signal.aborted) throw new Error('cancelled');
      return parseTwgOutput(output);
    } catch(error) {
      if(error instanceof TwgFailure)throw error;
      // Do not pass runner errors or malformed output through an RPC.
      throw new Error(controller.signal.aborted ? 'TWG request cancelled.' :
        'TWG request failed. Check CLI installation, authorization and command compatibility on the Paseo host.');
    } finally { this.pending.delete(controller); }
  }
  /** Offline discovery in supported TWG builds; not proof of authorization. */
  capabilities() { return this.json(['capabilities']); }
  /** Read command help before any authenticated request; never fall back to a default profile. */
  async requireProfileSupport() {
    if(this.closed)throw new Error('TWG connection closed.');
    const controller=new AbortController();this.pending.add(controller);
    try {
      const help=await this.run({executable:this.executable,args:['--help'],signal:controller.signal});
      if(controller.signal.aborted)throw new Error('cancelled');
      if(!/^\s+[^\n]*--profile(?:[ =]|$)/m.test(help))throw new TwgCompatibilityError();
    } catch(error) {if(error instanceof TwgFailure||error instanceof TwgCompatibilityError)throw error;throw new TwgFailure(controller.signal.aborted?'cancelled':'unknown');}
    finally {this.pending.delete(controller);}
  }
  /** Explicit cloud check only. Never called automatically or during construction. */
  checkAccess(target:{site:string;profile:string}) {
    const value=twgTarget.parse(target);
    return this.requireProfileSupport().then(()=>this.json(['access','--site',new URL(value.site).origin,'--profile',value.profile]));
  }
  /** Explicit read-only board configuration request; no view ARI or credential access. */
  async boardColumns(target:{site:string;profile:string}, boardId:number) {
    const value=twgTarget.parse(target);
    if(!Number.isSafeInteger(boardId)||boardId<=0)throw new Error('Choose a valid board ID.');
    await this.requireProfileSupport();
    const result=await this.json(['jira','board','scope','query','--id',String(boardId),
      '--site',new URL(value.site).hostname,'--profile',value.profile]);
    return decodeTwgColumns(result,boardId);
  }
  readIssue(target:{site:string;profile:string},key:string){
    const value=twgTarget.parse(target);
    if(!/^[A-Z][A-Z0-9_]*-[1-9]\d*$/.test(key))throw new Error('Invalid Jira issue key.');
    return this.json(['jira','workitem','get',key,'--strict','--fields',
      'summary,status,issuetype,priority,project,parent,fixVersions,labels,description,assignee,reporter,duedate,created,updated,issuelinks,subtasks',
      '--site',new URL(value.site).hostname,'--profile',value.profile]);
  }
  searchAssignedIssues(target:{site:string;profile:string}){
    return this.scoped(['jira','workitem','query','--jql','assignee = currentUser()','--fields','key','--limit','1'],target);
  }
  readComments(target:{site:string;profile:string},key:string,cursor?:string){
    this.validateKey(key);const value=twgTarget.parse(target);
    return this.json(['jira','workitem','comment','query','--issue-id',key,'--first','50','--order-by=-created',
      ...(cursor?['--after',cursor]:[]),'--site',new URL(value.site).hostname,'--profile',value.profile]);
  }
  readAttachments(target:{site:string;profile:string},key:string){
    this.validateKey(key);const value=twgTarget.parse(target);
    return this.json(['jira','workitem','attachment','query','--issue-id',key,'--site',new URL(value.site).hostname,'--profile',value.profile]);
  }
  downloadAttachment(target:{site:string;profile:string},id:string,path:string){
    if(!/^\d+$/.test(id)||!isAbsolute(path))throw new Error('Invalid attachment download.');
    const value=twgTarget.parse(target);
    return this.json(['jira','workitem','attachment','download','--attachment-id',id,'--output-path',path,
      '--site',new URL(value.site).hostname,'--profile',value.profile]);
  }
  readTransitions(target:{site:string;profile:string},key:string){
    this.validateKey(key);return this.scoped(['jira','workitem','transition','--id',key],target);
  }
  readStatuses(target:{site:string;profile:string},ids:string[]){
    if(!ids.length||ids.some(id=>!/^\d+$/.test(id)))throw new Error('Invalid status IDs.');
    // Board configuration can retain deleted status IDs. One stale ID must not fail every move.
    return this.scoped(['jira','workitem','statuses','query'],target);
  }
  transition(target:{site:string;profile:string},key:string,id:string,fields:Record<string,unknown>){
    this.validateKey(key);if(!/^\d+$/.test(id))throw new Error('Invalid transition ID.');
    return this.scoped(['jira','workitem','transition','--id',key,'--transition-id',id,'--fields-json',JSON.stringify(fields)],target);
  }
  createComment(target:{site:string;profile:string},key:string,markdown:string,visibility?:{type:'group'|'role';value:string}){
    this.validateKey(key);
    return this.scoped(['jira','workitem','comment','create','--issue-id',key,'--body',markdown,'--body-format','markdown',...(visibility?[visibility.type==='role'?'--visibility-role':'--visibility-group',visibility.value]:[])],target);
  }
  uploadAttachment(target:{site:string;profile:string},key:string,path:string){
    this.validateKey(key);if(!isAbsolute(path))throw new Error('Invalid upload path.');
    return this.scoped(['jira','workitem','attachment','upload','--issue-id',key,'--file',path],target);
  }
  private scoped(args:string[],target:{site:string;profile:string}){
    const value=twgTarget.parse(target);return this.json([...args,'--site',new URL(value.site).hostname,'--profile',value.profile]);
  }
  private validateKey(key:string){if(!/^[A-Z][A-Z0-9_]*-[1-9]\d*$/.test(key))throw new Error('Invalid Jira issue key.');}
  close() {
    this.closed = true;
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
  }
  readDashboard(kind:'identity'|'sprints'|'issues',target:{site:string;profile:string},id?:number,start=0){
    const value=twgTarget.parse(target);
    if(kind!=='identity'&&(!Number.isSafeInteger(id)||(id??0)<=0))throw new Error('Invalid TWG resource ID.');
    if(!Number.isSafeInteger(start)||start<0)throw new Error('Invalid TWG page offset.');
    const args=kind==='identity'?['user','get','me']:kind==='sprints'?
      ['jira','board','sprints','query','--board-id',String(id),'--state','active,future','--start-at',String(start),'--max-results','50']:
      ['jira','sprint','workitems','query','--sprint-id',String(id),'--jql','assignee = currentUser()',
       '--fields','summary,status,assignee,issuetype,priority,project,parent,fixVersions,labels','--start-at',String(start),'--max-results','50'];
    return this.json([...args,'--site',new URL(value.site).hostname,'--profile',value.profile]);
  }
}
