# Historical prototype validation

Early OAuth/MCP experiments were superseded by the scoped-token REST implementation. Private live-validation notes and snapshots are excluded from source control.

Use [the official setup guide](../docs/JIRA_SETUP.md) for supported authentication, required scopes, and troubleshooting. Automated verification is available through `npm test` and `npm run typecheck`. Mocked write tests do not establish that a particular account has live Jira write permissions.
