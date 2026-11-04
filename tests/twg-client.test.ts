import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TwgConnection, runTwg, type TwgRequest} from '../server/twg-client';

test('TWG construction is inert and commands use fixed argument arrays', async () => {
  const calls: TwgRequest[] = [];
  const client = new TwgConnection('/Applications/Tools with spaces/twg', async request => {
    calls.push(request); return request.args[0]==='--help'?'  --profile <name>':'{"synthetic":true}';
  });
  assert.equal(calls.length, 0);
  assert.deepEqual(await client.capabilities(), {synthetic: true});
  await client.checkAccess({site:'https://example.atlassian.net',profile:'default'});
  assert.deepEqual(calls.map(c => c.args), [['capabilities', '-o', 'json', '--output-summary', 'none'], ['--help'], ['access', '--site', 'https://example.atlassian.net', '--profile', 'default', '-o', 'json', '--output-summary', 'none']]);
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
  await assert.rejects(client.checkAccess({site:'https://example.atlassian.net',profile:'default'}), /closed/);
});
test('runner handles synthetic process output and redacts failures without executing TWG', async () => {
  assert.equal(await runTwg({executable: process.execPath, args: ['-e', 'process.stdout.write("{}")']}), '{}');
  await assert.rejects(runTwg({executable: process.execPath, args: ['-e', 'process.stderr.write("synthetic-secret");process.exit(1)']}), error => error instanceof Error && !error.message.includes('synthetic-secret'));
  await assert.rejects(runTwg({executable: process.execPath, args: ['-e', 'process.stdout.write("x".repeat(3*1024*1024))']}), /execution limits/);
});

test('access requires an explicit valid site/profile before invoking CLI',async()=>{
 let calls=0;const client=new TwgConnection('twg',async()=>{calls++;return '{}';});
 for(const target of [{site:'https://evil.example',profile:'default'},{site:'https://example.atlassian.net/path',profile:'default'},{site:'https://example.atlassian.net',profile:'--other'}]) {
  assert.throws(()=>client.checkAccess(target));
 }
 assert.equal(calls,0);
});
test('JSON error envelopes fail even when CLI exits successfully',async()=>{
 for(const body of ['{"ok":false}','{"success":false}','{"error":"synthetic-secret"}','{"errors":["synthetic-secret"]}']){
  const client=new TwgConnection('twg',async request=>request.args[0]==='--help'?'  --profile <name>':body);
  await assert.rejects(client.checkAccess({site:'https://example.atlassian.net',profile:'work'}),error=>error instanceof Error&&!error.message.includes('synthetic-secret'));
 }
});

test('unsupported profile contract stops before any authenticated command',async()=>{
 const calls:string[][]=[];
 const client=new TwgConnection('twg',async request=>{calls.push(request.args);return 'Usage: twg\n  --site <site>';});
 await assert.rejects(client.checkAccess({site:'https://example.atlassian.net',profile:'work'}),/profile support/);
 assert.deepEqual(calls,[['--help']]);
});
