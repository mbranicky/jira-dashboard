# Read-only Jira MCP connection prototype

This standalone Node harness verifies Atlassian authentication and actual tool schemas before integrating with the Paseo UI. It is not an installed Paseo plugin.

Run `npm ci --ignore-scripts`, then `npm run prototype`. Node 22 or newer is required. On macOS the authorization page opens automatically; other systems print its URL. Complete authorization on the same machine as the process. The loopback callback uses port 18761 and waits up to ten minutes.

The SDK handles OAuth discovery, public-client registration, PKCE, and token exchange. The prototype validates callback state and explicitly limits the consent URL to identity, offline access, and Jira read/search scopes. This override is necessary because SDK discovery otherwise prefers the server's broad supported-scope list.

Credentials are saved in `.local/auth.json`, with owner-only permissions, for reconnect/refresh testing. They are not encrypted. The entire `.local` directory is ignored by Git. Delete it to remove local credentials; this does not revoke the grant at Atlassian.

On connection, the harness saves the paginated tool catalog to `.local/tools.json`. Inspect actual input schemas before preparing requests. To execute reads, supply a JSON file containing an array of MCP tool requests:

```sh
npm run prototype -- .local/requests.json
```

For the isolated comparison with Claude's v1 endpoint, run `JIRA_MCP_VERSION=v1 npm run prototype`. This uses `.local/v1/` for separate registration, tokens, catalog, and results. It requests classic Jira read scopes; inspect the actual Atlassian consent screen because a server may not honor a narrowed request. The same strict read-only tool allowlist applies to both versions.

Each request has `name` and `arguments`. An explicit allowlist rejects write tools and generic dispatchers before any tool in the batch is invoked. Results are saved privately in `.local/result-*.json`; they may contain internal Jira information. Do not commit them.

The target for the initial live validation is board 51 on `https://example.atlassian.net`. Read accessible resources first, resolve that exact site, inspect the board configuration and active sprints, identify the current user, then fetch the assigned sprint issues with complete pagination. A successful login alone does not establish that these board capabilities work.

Run `npm test` to verify the read-only call boundary. No Jira transition, write operation, agent launch, or workspace creation is implemented in this harness.
