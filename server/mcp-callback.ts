import {createServer} from 'node:http';
import {McpOAuthSession} from './mcp-oauth';

/** Bind only loopback. The authorization URL callback is supplied by the future host UI. */
export async function createMcpCallback(authorize: (url: URL) => Promise<void>, timeoutMs = 600_000) {
  let session: McpOAuthSession;
  let resolve!: (url: URL) => void;
  let reject!: (error: Error) => void;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const callback = new Promise<URL>((yes, no) => {resolve = yes; reject = no;});
  // Cancellation may happen before the caller starts awaiting the callback.
  void callback.catch(() => {});
  const shutdown = () => {clearTimeout(timer); server.close(); server.closeAllConnections();};
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'");
    const expected = new URL(session.redirectUrl);
    if (request.method !== 'GET' || request.headers.host !== expected.host || settled) {
      response.writeHead(400).end('Invalid authorization callback.'); return;
    }
    let url: URL;
    try {
      url = new URL(request.url ?? '/', expected);
      // Validation/consumption belongs to completeAuthorization. Validate state here
      // without consuming it so the same session can finish the SDK exchange.
      if (url.origin !== expected.origin || url.pathname !== '/callback' ||
          url.searchParams.get('state') !== session.state()) throw new Error();
    } catch {response.writeHead(400).end('Invalid authorization callback.'); return;}
    settled = true;
    response.end('Return to Paseo to finish connecting.');
    clearTimeout(timer);
    server.close();
    resolve(url);
  });
  await new Promise<void>((yes, no) => {
    server.once('error', no); server.listen(0, '127.0.0.1', () => {server.off('error', no); yes();});
  });
  const address = server.address();
  if (!address || typeof address === 'string') {shutdown(); throw new Error('Could not start authorization callback.');}
  session = new McpOAuthSession(address.port, authorize);
  const cancel = () => {
    shutdown();
    session.dispose();
    if (!settled) {settled = true; reject(new Error('Authorization cancelled or timed out.'));}
  };
  timer = setTimeout(cancel, timeoutMs); timer.unref();
  return {session, callback, cancel};
}
