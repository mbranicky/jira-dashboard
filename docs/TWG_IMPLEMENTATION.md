# TWG CLI implementation progress

Branch: `codex/twg-cli-oauth`, based on main revision `1007d1d`, independently of the MCP implementation. Settings now includes an experimental TWG authorization/access-check section. It does not select TWG as the dashboard data backend.

## Implemented

- A host-only CLI adapter with fixed capability-discovery and access-check commands and JSON response parsing. These responses remain untrusted `unknown` values until feature-specific schemas are implemented.
- Execution through argument arrays without a shell; executable may be `twg` or an explicit absolute path.
- Thirty-second execution timeout, bounded stdout/stderr, closed stdin and cancellation on disposal. No automatic retries, login, installation or upgrades.
- Terminal-based OAuth setup guidance. Background login is rejected before any process is started.
- CLI errors and malformed responses are replaced with safe messages rather than returned verbatim.
- Mocked command tests and synthetic Node subprocess tests. No installed TWG process or Jira connection was used for verification.

## OAuth ownership

TWG performs browser OAuth and owns its credentials. The plugin does not implement an OAuth callback server, inspect TWG credential files, extract bearer tokens, or reuse them for REST requests. Future setup should direct the user through an explicit host-side login; it must not trigger login while refreshing the board.

The documented entry point is `twg login`, run by the user in a terminal on the Paseo host. The installation guide explicitly requires a controlling terminal for first-time consent. Our earlier background-login implementation lacked that terminal and has been removed. Settings guides terminal setup and offers an access check afterward. No login command is executed by the plugin. [Installation requirements](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/getting-started/installation/).

The OAuth setup page still contains examples using `--oauth`, while the changelog records its removal. Use the plain documented login entry point; verify installed-version contracts before adding automated terminal orchestration. Secure credential storage remains CLI-owned and must be verified separately. [OAuth setup](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/getting-started/configure-oauth/), [Changelog](https://developer.atlassian.com/cloud/twg-cli/changelog/).

The child process uses the host environment, as a user-run CLI does; the adapter does not inspect or serialize that environment. This does not mean the CLI process cannot access credentials. Scope the future supported environment/profile configuration deliberately and do not accept arbitrary environment overrides from the browser.

## Remaining before user-facing support

- Verify a supported stable TWG version's exact JSON flags and response contracts. Current tests validate our invocation and error handling, not real CLI compatibility.
- Verify that the selected site/profile is represented in the real CLI success response. Commands now receive both explicitly; no automatic fallback is implemented.
- Refine missing-binary/expired-login diagnostics after verifying real CLI error contracts. Settings provides safe failure/retry states and host guidance; no login-output parsing or browser authorization relay is implemented.
- Add schemas and adapters for board columns/status mappings, sprints, issues, descriptions, transitions and required-field errors.
- Add comments and attachment adapters with visibility preservation, bounded binary handling and safe temporary-file cleanup.
- Validate CLI storage expectations, dependency distribution and public-embedding terms.
- Complete mocked UI/workflow tests. Any future tenant authorization requires separate authorization; no live writes are part of the verification plan.

The [official command catalogue](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/commands/commands-catalog/) is the capability reference. CLI feature availability must not be inferred solely from a command name.

REST, existing settings and package version remain unchanged. The server registers explicit TWG RPC actions. Opening Settings makes no TWG calls; only pressing a TWG action starts a process. Navigating away cancels its pending operation. The independent MCP branch is `codex/mcp-v2-oauth` (initial local commit `030bb21`).

## Settings verification — 4 November 2026

Both type checks, ten focused Node tests and three mocked Cypress tests pass. Browser coverage includes desktop login/polling, phone guidance/cancellation and failed checks with REST settings preserved. No installed CLI, credentials or Jira tenant were used.

Desktop trial: run `twg login` in a terminal on the Paseo host and complete browser consent. Then open Jira Dashboard Settings, find **TWG CLI · experimental**, enter `twg` or its absolute host path and select **Test TWG access**. Save connection persists the executable path and profile; the Jira site comes from the board URL. A completed access command does not verify board-specific permissions or switch the dashboard to TWG.

## Pre-PR contract review — 4 November 2026

The previous mocked login tests verified our process wrapper, not actual TWG compatibility. The terminal requirement exposed that gap. Background login has been removed and is rejected by the server even for an older Settings client. Remaining gates: verify real structured CLI output, bind saved site/profile, then implement the dashboard adapters. No live login or tenant request was performed during this correction.

Correction verification: both type checks, 8 focused Node tests and 3 mocked browser tests pass.

## Site/profile binding and terminal investigation

Settings now saves `twgExecutable` and `twgProfile` alongside connection settings, with backward-compatible defaults. Access checks pass the board URL's HTTPS Jira Cloud origin and an explicit profile through separate command arguments. Invalid sites/profile names are rejected before process execution. Known explicit error envelopes fail even with exit code zero. Arbitrary JSON is still not proof of site access; a validated real success schema remains a release gate.

The installed Paseo SDK's `PaseoTerminalCreateOptions` requires `workspaceId` (`node_modules/@getpaseo/client/dist/terminals/index.d.ts`). A plugin could create a terminal in a user-selected workspace, but there is no workspace-independent terminal creation in that contract. No workspace or terminal is created automatically. A future sign-in action should ask for an existing workspace, start a dedicated terminal and leave interactive consent with the user; it must not capture terminal output containing authorization data.

Validation: both type checks, 10 focused Node tests and 3 mocked browser tests pass. No TWG executable, credential store or Jira tenant was accessed.

## Response contract investigation

The bundled TWG guidance (`twg/references/OUTPUT.md`) documents direct structured stdout using `--output-summary none`; agent defaults can otherwise return YAML/file-pointer summaries. The adapter now explicitly requests direct JSON and refuses summary envelopes without reading their output paths. It rejects explicit errors and bounds response size.

No authoritative command-specific `access` success schema was found in the public catalogue or bundled output guidance. A zero-exit JSON result now produces **unverified**, not success. Neither `{}` nor an arbitrary `data` property proves the intended account/site is accessible. Public command names also do not establish exact board/status/pagination shapes.

`server/twg-board.ts` introduces an **internal normalized snapshot contract**, not a fabricated TWG wire format. Synthetic tests verify site/board identity, complete data, assigned-user isolation, status-to-column mappings, active/future sprint selection and duplicate rejection. It is intentionally not wired to production board reads until a versioned CLI decoder can be implemented from authoritative output contracts.

Next evidence needed: the installed supported version's `help describe` output for `access`, `jira board get`, `jira board view-settings query`, `jira board sprints query`, `jira sprint workitems query` and `user get`, including advertised output contracts. Inspect in an isolated environment without credentials/network, or obtain equivalent public schemas. No installed CLI was invoked for this investigation. Mocks can verify our handling but cannot establish an undocumented vendor success shape.

Validation: both type checks and 13 focused Node tests pass; mocked UI covers the explicit unverified state. Full TWG-backed dashboard operation remains a release gate.

## Isolated installed-help inspection — 4 November 2026

Inspected only version and bundled help in a temporary home directory under an OS sandbox denying all network access, reads under the real user home (except the TWG executable), and keychain service lookup. No authentication or data commands were run. Installed binary reports **1.3.0**.

Confirmed command grammar: board get accepts repeated `--id`; sprint listing accepts `--board-id`, `--state`, `--start-at`, `--max-results`; sprint work items accept `--sprint-id`, `--jql`, `--fields` and offset pagination. The `access` and board help objects do not publish an output schema. User help advertises identity at `data` or `data.user`, but that does not establish board/access schemas.

Global help confirms `-o json` and `--output-summary none`, but does not advertise `--profile`. Access checks now preflight help and refuse authenticated execution when explicit profile support cannot be confirmed. No default-profile fallback is allowed. Synthetic tests cover the refusal.

A potentially simpler dashboard transport is also confirmed in bundled help: `twg api jira:/rest/api/3/myself` (and other approved Jira REST endpoints), with explicit `-X GET` and query fields. This keeps authentication inside TWG while potentially reusing existing REST decoders. Pagination is not automatic. Before implementing this transport we still need the supported version's JSON envelope contract and OAuth endpoint coverage; a help description alone is insufficient. The installed CLI was not upgraded or logged in.

## Stable-release inspection — 4 November 2026

The official installer selects **1.4.2**; the public changelog labels 1.4.3 beta. Downloaded the official macOS ARM64 1.4.2 binary into a temporary directory and verified its SHA-256 against Atlassian's versioned checksum list. The installed CLI was not changed. Sources: [installer](https://teamwork-graph.atlassian.com/cli/install), [checksums](https://teamwork-graph.atlassian.com/cli/SHA256SUMS-v1.4.2), [changelog](https://developer.atlassian.com/cloud/twg-cli/changelog/).

Executed version and bundled help only with an empty temporary home, no inherited credentials, and OS sandbox rules denying network, real home-directory reads and keychain service access. See [recorded contract evidence](TWG_CONTRACT_EVIDENCE.json).

Findings:

- 1.4.2 advertises `--profile`, direct JSON and `--output-summary none`.
- Help defaults to compact batch records. Used `--detail full` to inspect full command records.
- `access`, board get, board view settings, board sprints and sprint work items still have **no output contract** in their full help records. Their flags are confirmed; their success envelopes are not.
- `user get` does advertise identity at `data` or `data.user`. Added a tested decoder for those layouts, retaining only account ID/display name. It is not used as proof of board access.
- **Correction to the earlier candidate:** generic `twg api` is unavailable in stable 1.4.2 (both command discovery and direct help reject it). The 1.3.0 shortcut must not be used for our supported transport.

We cannot honestly mark board/access success formats verified from these artifacts. Dashboard runtime integration remains gated on authoritative vendor schemas or separately authorized sanitized response observations. Synthetic fixtures validate internal adapter behavior, not the undocumented vendor shape. No upgrade, login, tenant query or automatic fallback was performed.
