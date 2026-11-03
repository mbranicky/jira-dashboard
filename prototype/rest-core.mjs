import { parseEnv } from 'node:util';
export function credentials(text) {
  const values = parseEnv(text);
  const email = values.JIRA_EMAIL?.trim();
  const token = values.JIRA_API_TOKEN?.trim();
  if (!email || !token) throw new Error('Fill in JIRA_EMAIL and JIRA_API_TOKEN in the private jira.env file.');
  if (!/^[^\s:]+@[^\s]+$/.test(email) || /[\r\n]/.test(token)) throw new Error('Invalid credential format.');
  return { email, token };
}
export function reader(cloudId, auth, fetcher = fetch) {
  if (!/^[a-f0-9-]{36}$/i.test(cloudId)) throw new Error('Invalid Jira cloud ID.');
  return async (path, query = {}) => {
    if (!/^\/rest\/api\/3\/myself$|^\/rest\/agile\/1\.0\/board\/\d+\/(configuration|sprint)$|^\/rest\/software\/1\.0\/board\/\d+\/sprint\/\d+\/issue$/.test(path)) throw new Error('Endpoint not allowed by read-only prototype.');
    const url = new URL(`https://api.atlassian.com/ex/jira/${cloudId}${path}`);
    url.search = new URLSearchParams(query).toString();
    let response;
    try { response = await fetcher(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${auth.email}:${auth.token}`).toString('base64')}` } }); }
    catch { throw new Error(`Network or redirect failure reading ${path}`); }
    if (!response.ok) {
      const hint = {401:'Check email, token, expiry, and scopes.',403:'Check token scopes and Jira permissions.',404:'Check board access and endpoint availability.',429:'Rate limited; retry later.'}[response.status] ?? 'Request rejected.';
      throw new Error(`HTTP ${response.status} reading ${path}. ${hint}`);
    }
    return response.json();
  };
}
export async function collect(get, path, query, key, mode) {
  const items=[]; const seen=new Set(); let cursor = mode === 'offset' ? 0 : undefined;
  for(let count=0;count<1000;count++) {
    const paging = mode === 'offset' ? {startAt:String(cursor)} : cursor ? {nextPageToken:cursor} : {};
    const page=await get(path,{...query,maxResults:'50',...paging});
    if(!Array.isArray(page[key])) throw new Error(`Missing ${key} in Jira response.`);
    items.push(...page[key]);
    if(mode === 'offset') {
      if(page.isLast === true || (Number.isFinite(page.total) && items.length>=page.total)) return items;
      if(!page[key].length) {if(page.isLast === false) throw new Error('Empty non-final sprint page.'); return items;}
      cursor += page[key].length;
    } else {
      if(page.isLast === true) return items;
      if(!page.nextPageToken) {if(page.isLast === false) throw new Error('Missing issue pagination cursor.'); return items;}
      cursor=page.nextPageToken;
    }
    if(seen.has(cursor)) throw new Error('Repeated Jira pagination cursor.');
    seen.add(cursor);
  }
  throw new Error('Pagination limit reached; results incomplete.');
}
