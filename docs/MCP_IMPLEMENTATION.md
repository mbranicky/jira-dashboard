# MCP v2 implementation progress

Branch: `codex/mcp-v2-oauth`. This is an incremental implementation, not an available connection setting yet.

Completed initial foundation:

- Host-only SDK OAuth provider with isolated session credentials, PKCE verifier storage, random state, ten-minute callback expiry and replay rejection.
- Read/search consent only for the initial connection work; no write authorization requested yet.
- MCP v2 transport with explicit authorization completion and bounded catalogue pagination.
- Raw OAuth/transport errors are not returned to the client.
- No credential files are read or written. Credentials currently survive only for the session; this is not persistent login.
- Synthetic tests cover callback validation, expiry, replay, consent destinations, credential isolation and disposal.

Remaining before users can select MCP:

- Loopback callback listener lifecycle, cancellation and transport integration tests with a mock OAuth/MCP server.
- Protected persistent credential storage and account/site binding.
- Settings connection UI and host-aware authorization for remote/mobile clients.
- Tool-schema validation and dashboard adapter; workflow, comments and binary attachment adapters.
- Runtime dependency packaging (the SDK is currently a development dependency used by the existing prototype).
- Full mocked browser/workflow verification and documentation of supported capabilities.

The current REST backend remains active. Nothing in this implementation automatically starts authentication or contacts Jira. Do not wire the foundation into runtime until the remaining lifecycle and storage work is verified. See [connectivity research](JIRA_CONNECTIVITY_OPTIONS.md).
