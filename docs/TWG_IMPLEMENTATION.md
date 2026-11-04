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

## Authorized read-only desktop verification — 4 November 2026

TWG 1.4.2 successfully authenticated through an interactive desktop terminal.
The agent-launched device authorization timed out even though browser consent
was reported complete; the desktop-terminal login completed and saved the
intended profile. Use CLI-owned interactive login; do not interpret browser
success alone as proof that the CLI session is ready. No credential file was
read by the plugin or this verification.

Verified through the explicitly selected profile and site:

- `user get me`: `data` is an object with `accountId`, `name`, and `email`.
  The returned account matched the user-requested account. Only account ID and
  display name belong in dashboard state.
- `jira board get --id 51`: `data` is an array of board objects. The requested
  board was returned with `id`, `name`, `type`, and `location`. This response
  does **not** include column/status mappings or a view-settings ARI.
- `jira board sprints query --board-id 51 --state active,future`: `data.sprints`
  is an array, with `data.total` and `data.isLast`. It included two active
  sprints with different `originBoardId` values. Never pick the first active
  sprint as a proxy for team membership; preserve the user's selection.
- `jira sprint workitems query --sprint-id <selected-active-sprint> --jql
  'assignee = currentUser()' --fields
  summary,status,issuetype,priority,assignee,labels,fixVersions,parent
  --max-results 50`: returned 18 issues and `data.total = 18`,
  `data.startAt = 0`, `data.maxResults = 50`. Issue objects expose `id`, `key`,
  `fields`, and `url`; requested fields were present on the inspected issue.

All calls used `-o json --output-summary none`. No transitions, comments,
attachment uploads, or other Jira writes were performed. Private response
bodies and credentials are not committed as fixtures.

**Remaining dashboard integration gate:** resolve board column/status mappings
through a supported TWG read command. Bundled help requires a view-settings ARI
for `jira board view-settings query` and board-cell IDs/ARIs for
`jira board cells query`; the board-get response supplies neither. Do not
invent these identifiers or replace actual board columns with issue statuses.
The successful reads above establish connectivity and concrete response
shapes, not completion of the dashboard transport adapter.

## Column mapping gate resolved — 4 November 2026

The supported read command is **`jira board scope query --id <boardId>`**.
Despite its scope-oriented name and GraphQL-oriented help text, TWG 1.4.2's
bundled implementation routes this command to the Agile board configuration
GET endpoint. A live read of board 51 confirmed `data.columnConfig.columns`,
with each column's name and full `statuses[].id` array, in board order.
It returned six columns with respectively 2, 10, 4, 1, 2, and 19 status IDs.
No view-settings or board-cell ARI is needed. The backlog query returns issue
search data and is not a configuration discovery route.

Invocation (with CLI-owned authorization):

```sh
twg jira board scope query --id 51 --site example.atlassian.net \
  --profile your-profile -o json --output-summary none
```

`server/twg-columns.ts` validates the v2 command envelope, board identity, and
complete column/status structure. `TwgConnection.boardColumns` explicitly binds
the selected site/profile and invokes only this read route. Synthetic tests
cover multiple statuses per column, empty columns, order preservation, duplicate
status IDs, incorrect board/command/version, and incomplete responses.

This supersedes the earlier unresolved mapping gate. The read-only dashboard
adapter can now combine scope configuration, current user, paginated sprints,
and assigned sprint issues. Runtime dashboard routing, pagination, configuration
caching keyed by site/profile/board, and end-to-end mocked adapter tests remain
integration work; this change does not switch the dashboard away from REST.
No Jira writes were made during the investigation.

## Read-only dashboard integration — 4 November 2026

Settings now offers an explicit **TWG CLI · read-only preview** switch. Existing
installations continue using REST unless the user selects TWG. TWG mode requires
only the board URL, executable path, and saved CLI profile; the secret-file path
is not required and is never used as a fallback. Test TWG access validates the
configured board's scope response before reporting verified board access.

The dashboard RPC now routes TWG mode through `createTwgDashboard`. It reads the
current user, scope configuration, active/future sprints, and assigned sprint
issues. Offset pagination requires explicit completion evidence, rejects
repeated pages/IDs and inconsistent offsets/totals, and is bounded to 100 pages.
Multiple active sprints still require a saved or explicit user selection.

Validated column configuration is cached in memory for ten minutes, with a
128-entry bound and keys containing executable, site, profile, board, and
current account ID. Failed responses are not cached. Identity, sprints and
issues remain fresh. Plugin shutdown cancels active processes and clears cache.

This is a board-reading preview, not full feature parity: ticket titles open
Jira, drag/drop and creating work are disabled, and in-app details/comments/
attachments are not routed through REST. Existing workspace links can still be
opened. Unsupported REST entry points explicitly reject TWG mode before loading
credentials or making HTTP calls. Switching back to REST restores existing
features. A desktop terminal remains necessary for OAuth sign-in.

Synthetic unit tests cover normalization, pagination, cache expiry/isolation,
invalid sprint selections, wrong assignees, and prevention of REST fallback.
Desktop/mobile component tests cover switching modes and saving without a
secret file; sprint-persistence regression tests also pass.

The completed adapter was also verified read-only against board 51: six columns,
six available sprints, and 18 assigned issues in selected sprint 4180. Mapping
column choices reuse the same cache without loading sprints/issues; their explicit
Refresh columns action invalidates cached configuration. The local plugin was
reloaded after integration; the existing user's selected transport is preserved.

## TWG issue details — 4 November 2026

The dashboard details modal/panel and workspace Jira panel now read issue details
through `jira workitem get <key> --strict --fields <explicit-fields>`, bound to
the saved site/profile. A live read confirmed the v2 response flattens issue fields
into each item in `data`, including an ADF description. The decoder requires an
exact single key match, rejects reported failed/omitted/truncated acquisition,
and reuses the existing safe description/field normalizer. No CLI HTML is rendered
and account IDs/email addresses are not included in the details response.

Dashboard details first revalidate membership in the selected assigned sprint.
Workspace lookup is independent of sprint and assignee, preserving existing key
detection rules. Issue content is not cached server-side. Client query keys now
include host and connection revision to avoid reusing another connection's data.

This supersedes the earlier preview restriction on in-app details. Ticket titles
open the configured details presentation again. Comments and attachments remain
explicitly unavailable in TWG mode (their REST components are not mounted), and
Start work/drag-drop remain disabled. Existing workspace links remain available.
Errors and incomplete responses are shown with retry rather than falsely reporting
that an inaccessible issue does not exist. All verification calls were read-only.

## Read-only comments and attachments — 4 November 2026

Both dashboard issue details and the workspace Jira panel now display comments
and attachments through TWG. Verified native commands:

- `jira workitem comment query --issue-id <key> --first 50 --order-by=-created`
  returns `data[]` and `pageInfo.hasNextPage/nextCursor`. Follow `--after` until
  complete, then sort by the newer of creation/modification time before UI paging.
  Reject repeated cursors/comment IDs and incomplete pages; limit to 100 pages.
- `jira workitem attachment query --issue-id <key>` returns metadata in `data[]`.
- `jira workitem attachment download --attachment-id <id> --output-path <path>`
  downloads using CLI-owned OAuth. The plugin supplies a private temporary
  directory and fixed filename; it never follows paths returned in CLI JSON.

Reads reuse the existing author/date, nested-comment (where parent IDs are
provided), rich-text, compact attachment, in-app image preview, download, and
local browser preview components. Posting, linked replies, and uploads are
hidden in TWG mode and remain blocked by server-side REST guards. Upload settings
are not requested. Connection-revision-specific query keys prevent stale data
from being reused after switching connections.

Before bytes are returned, the attachment must still appear on the requested
issue and fit the 25 MB transfer limit. Files are opened without following
symlinks, checked against metadata size, read with a fixed bound, and removed in
`finally` on success or failure. A bounded 50 MB/32-entry in-memory byte cache
expires entries after two minutes (cleanup every 30 seconds) and is cleared on
plugin shutdown; concurrent download reservations are capped at 50 MB. Cache
keys include executable/site/profile/issue/attachment identity. These are content
caches, not credential stores. No OAuth credential is extracted or forwarded.

Live verification read two comments, listed two attachments and downloaded a
102396-byte PNG for a known issue; signature validation passed. No comments,
files, or ticket changes were posted. Synthetic tests cover pagination/order,
private-field removal, attachment membership, size mismatch, cleanup, reuse,
and forbidden upload requests. Desktop/mobile UI tests cover viewing while
write controls and upload-settings requests remain absent.

### Recovery and local Start work — 4 November 2026

Structured TWG errors now distinguish expired/rejected sign-in, permission denial,
missing issues, rate limits, missing executables and execution limits. Only fixed
recovery guidance is displayed; raw CLI diagnostics and suggested commands are
not forwarded. Sign-in recovery remains in a terminal on the Paseo host using the
configured profile, followed by retrying the request or connection check.

An explicit issue-lookup 404 produces the existing quiet “No Jira issue found”
workspace-panel state. Authentication, permission and malformed-response failures
remain errors rather than being mistaken for missing tickets. There is no manual
issue-key input. A 404 can also mean the selected profile cannot see the issue.

Play is available again on eligible cards and dashboard details, with existing
workspace links retaining Open workspace. Start work validates the assigned sprint
issue through TWG and then uses the existing local workspace/branch/agent flow.
It sends `/skill ISSUE-KEY` only when an entry skill is configured. It does not
change Jira or request a transition. Workspace-side details retain no Play action.
The user-configured skill controls its own subsequent actions independently.

TWG status transitions, posting/replying and attachment uploads remain disabled.
Verification used mocks only: 127 automated tests, 12 browser component tests and
both typechecks passed. No real Jira requests, workspaces or agents were created
for these tests.
