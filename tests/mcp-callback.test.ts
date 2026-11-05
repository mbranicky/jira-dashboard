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
test('stopping the listener after connection preserves OAuth credentials and clears expiry', async () => {
  const flow = await createMcpCallback(async () => {}, 10);
  flow.session.saveTokens({access_token: 'synthetic', token_type: 'Bearer'});
  flow.stop();
  await assert.rejects(flow.callback, /cancelled/);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(flow.session.tokens()?.access_token, 'synthetic');
  flow.cancel();
  assert.throws(() => flow.session.tokens(), /closed/);
});

test('browser consent keeps its complete ten-minute callback window',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});
 const flow=await createMcpCallback(async()=>{});
 let settled=false;void flow.callback.catch(()=>{settled=true;});
 try {
  context.mock.timers.tick(599999);await Promise.resolve();assert.equal(settled,false);
  context.mock.timers.tick(1);await assert.rejects(flow.callback,/timed out after ten minutes/);
 }finally{flow.cancel();context.mock.timers.reset();}
});
