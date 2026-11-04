# TWG CLI implementation progress

Branch: `codex/twg-cli-oauth`, based on main revision `1007d1d`, independently of the MCP implementation. Settings now includes an experimental TWG authorization/access-check section. It does not select TWG as the dashboard data backend.

## Implemented

- A host-only CLI adapter with fixed capability-discovery and access-check commands and JSON response parsing. These responses remain untrusted `unknown` values until feature-specific schemas are implemented.
- Execution through argument arrays without a shell; executable may be `twg` or an explicit absolute path.
- Thirty-second execution timeout, bounded stdout/stderr, closed stdin and cancellation on disposal. No automatic retries, login, installation or upgrades.
- Explicit OAuth login lifecycle with cancellation; no automatic login.
- CLI errors and malformed responses are replaced with safe messages rather than returned verbatim.
- Mocked command tests and synthetic Node subprocess tests. No installed TWG process or Jira connection was used for verification.

## OAuth ownership

TWG performs browser OAuth and owns its credentials. The plugin does not implement an OAuth callback server, inspect TWG credential files, extract bearer tokens, or reuse them for REST requests. Future setup should direct the user through an explicit host-side login; it must not trigger login while refreshing the board.

The documented manual entry point is `twg login`, which opens browser consent. The adapter now offers an explicit `startLogin()` action using `twg login --oauth`, with a ten-minute timeout, duplicate-attempt prevention, cancellation and discarded output. Settings now invokes it explicitly through a short-lived host job, with polling and cancellation. It was not executed against the installed CLI during development. A successful process exit is not proof of site access; the separate access check remains necessary. Secure storage is a separate setup consideration: Atlassian documents experimental encrypted storage, and existing installations are not automatically migrated. Never claim that the CLI always uses an OS vault. [OAuth setup](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/getting-started/configure-oauth/).

The child process uses the host environment, as a user-run CLI does; the adapter does not inspect or serialize that environment. This does not mean the CLI process cannot access credentials. Scope the future supported environment/profile configuration deliberately and do not accept arbitrary environment overrides from the browser.

## Remaining before user-facing support

- Verify a supported stable TWG version's exact JSON flags and response contracts. Current tests validate our invocation and error handling, not real CLI compatibility.
- Bind operations to an explicit site/profile; the experimental access check is discovery, not permission to use whichever site happens to be the default.
- Refine missing-binary/expired-login diagnostics after verifying real CLI error contracts. Settings provides safe failure/retry states and host guidance; no login-output parsing or browser authorization relay is implemented.
- Add schemas and adapters for board columns/status mappings, sprints, issues, descriptions, transitions and required-field errors.
- Add comments and attachment adapters with visibility preservation, bounded binary handling and safe temporary-file cleanup.
- Validate CLI storage expectations, dependency distribution and public-embedding terms.
- Complete mocked UI/workflow tests. Any future tenant authorization requires separate authorization; no live writes are part of the verification plan.

The [official command catalogue](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/commands/commands-catalog/) is the capability reference. CLI feature availability must not be inferred solely from a command name.

REST, existing settings and package version remain unchanged. The server registers explicit TWG RPC actions. Opening Settings makes no TWG calls; only pressing a TWG action starts a process. Navigating away cancels its pending operation. The independent MCP branch is `codex/mcp-v2-oauth` (initial local commit `030bb21`).

## Settings verification — 4 November 2026

Both type checks, ten focused Node tests and three mocked Cypress tests pass. Browser coverage includes desktop login/polling, phone guidance/cancellation and failed checks with REST settings preserved. No installed CLI, credentials or Jira tenant were used.

Desktop trial: open Jira Dashboard Settings, find **TWG CLI · experimental**, enter `twg` or its absolute host path, select **Sign in with TWG**, complete desktop consent, then select **Test TWG access**. The path is not persisted yet. A completed access command does not verify board-specific permissions or switch the dashboard to TWG. If login cannot work without an interactive terminal, finish setup in the host terminal; that compatibility remains unverified.
