import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection, runTwg, type TwgRequest} from '../server/twg-client';

test('TWG construction is inert and commands use fixed argument arrays', async () => {
  const calls: TwgRequest[] = [];
  const client = new TwgConnection('/Applications/Tools with spaces/twg', async request => {
    calls.push(request); return '{"synthetic":true}';
  });
  assert.equal(calls.length, 0);
  assert.deepEqual(await client.capabilities(), {synthetic: true});
  await client.checkAccess();
  assert.deepEqual(calls.map(c => c.args), [['capabilities', '-o', 'json'], ['access', '-o', 'json']]);
  assert.equal(calls[0].executable, '/Applications/Tools with spaces/twg');
  assert.throws(() => new TwgConnection('twg --token secret'));
});
test('TWG failures and malformed responses never expose output', async () => {
  for (const run of [async () => {throw new Error('secret');}, async () => 'secret', async () => 'null', async () => '[]', async () => 'x'.repeat(2 * 1024 * 1024 + 1)]) {
    const client = new TwgConnection('twg', run);
    await assert.rejects(client.capabilities(), error => error instanceof Error && !error.message.includes('secret'));
  }
});
test('closing TWG aborts in-flight work and prevents future commands', async () => {
  let signal: AbortSignal | undefined;
  let finish!: (value: string) => void;
  const client = new TwgConnection('twg', request => {signal = request.signal; return new Promise(resolve => {finish = resolve;});});
  const pending = client.capabilities(); client.close();
  assert.equal(signal?.aborted, true); finish('{}');
  await assert.rejects(pending, /cancelled/);
  await assert.rejects(client.checkAccess(), /closed/);
});
test('runner handles synthetic process output and redacts failures without executing TWG', async () => {
  assert.equal(await runTwg({executable: process.execPath, args: ['-e', 'process.stdout.write("{}")']}), '{}');
  await assert.rejects(runTwg({executable: process.execPath, args: ['-e', 'process.stderr.write("synthetic-secret");process.exit(1)']}), error => error instanceof Error && !error.message.includes('synthetic-secret'));
  await assert.rejects(runTwg({executable: process.execPath, args: ['-e', 'process.stdout.write("x".repeat(3*1024*1024))']}), /execution limits/);
});
