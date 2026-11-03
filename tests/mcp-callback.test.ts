import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMcpCallback} from '../server/mcp-callback';

test('loopback callback rejects wrong state and accepts one matching callback', async () => {
  const flow = await createMcpCallback(async () => {});
  try {
    assert.equal((await fetch(flow.session.redirectUrl)).status, 400);
    const url = new URL(flow.session.redirectUrl);
    url.searchParams.set('state', flow.session.state()); url.searchParams.set('code', 'synthetic');
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(flow.session.acceptCallback(await flow.callback), 'synthetic');
    assert.throws(() => flow.session.acceptCallback(url));
  } finally {flow.cancel();}
});
test('callback listener cancellation clears the session', async () => {
  const flow = await createMcpCallback(async () => {});
  flow.cancel();
  await assert.rejects(flow.callback, /cancelled/);
  assert.throws(() => flow.session.tokens(), /closed/);
});
test('callback listener times out without a browser', async () => {
  const flow = await createMcpCallback(async () => {}, 10);
  await assert.rejects(flow.callback, /timed out/);
  assert.throws(() => flow.session.state(), /closed/);
});
