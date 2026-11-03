import {execFile} from 'node:child_process';
import {isAbsolute} from 'node:path';

export type TwgRequest = {executable: string; args: string[]; signal?: AbortSignal};
export type TwgRunner = (request: TwgRequest) => Promise<string>;

/** No shell, stdin, retries, logging, or credential-file access. */
export const runTwg: TwgRunner = ({executable, args, signal}) => new Promise((resolve, reject) => {
  const child = execFile(executable, args, {
    shell: false, timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
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
