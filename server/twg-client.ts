import {execFile} from 'node:child_process';
import {isAbsolute} from 'node:path';

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
      reject(new Error(code === 'ENOENT' ? 'TWG CLI was not found.' :
        signal?.aborted ? 'TWG request cancelled.' : 'TWG command failed or exceeded its execution limits.'));
    } else resolve(stdout);
  });
  child.stdin?.end();
});

/** Experimental host-only adapter. Construction does not execute TWG. */
export class TwgConnection {
  private readonly pending = new Set<AbortController>();
  private closed = false;
  private login?: AbortController;
  constructor(private readonly executable = 'twg', private readonly run: TwgRunner = runTwg) {
    if (executable !== 'twg' && !isAbsolute(executable)) throw new Error('Choose an absolute TWG executable path.');
  }
  private async json(args: string[]): Promise<unknown> {
    if (this.closed) throw new Error('TWG connection closed.');
    const controller = new AbortController(); this.pending.add(controller);
    try {
      const output = await this.run({executable: this.executable, args: [...args, '-o', 'json'], signal: controller.signal});
      if (controller.signal.aborted) throw new Error('cancelled');
      if (Buffer.byteLength(output) > 2 * 1024 * 1024) throw new Error('oversized');
      const data: unknown = JSON.parse(output);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid envelope');
      return data;
    } catch {
      // Do not pass runner errors or malformed output through an RPC.
      throw new Error(controller.signal.aborted ? 'TWG request cancelled.' :
        'TWG request failed. Check CLI installation, authorization and command compatibility on the Paseo host.');
    } finally { this.pending.delete(controller); }
  }
  /** Explicit desktop action only. CLI owns browser consent and credential storage. */
  async startLogin(): Promise<void> {
    if (this.closed) throw new Error('TWG connection closed.');
    if (this.login) throw new Error('TWG authorization is already in progress.');
    const controller = new AbortController();
    this.login = controller; this.pending.add(controller);
    try {
      // Do not force reauthentication, migrate storage, or request token login.
      // OAuth stdout is deliberately discarded, never returned through an RPC.
      await this.run({executable: this.executable, args: ['login', '--oauth'],
        signal: controller.signal, timeoutMs: 600_000});
      if (controller.signal.aborted) throw new Error('cancelled');
    } catch {
      throw new Error(controller.signal.aborted ? 'TWG authorization cancelled.' :
        'TWG authorization failed or timed out. Complete desktop browser consent and check the host CLI setup.');
    } finally {
      this.pending.delete(controller);
      if (this.login === controller) this.login = undefined;
    }
  }
  cancelLogin() { this.login?.abort(); }
  /** Offline discovery in supported TWG builds; not proof of authorization. */
  capabilities() { return this.json(['capabilities']); }
  /** Explicit cloud check only. Never called automatically or during construction. */
  checkAccess() { return this.json(['access']); }
  close() {
    this.closed = true;
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
  }
}
