# TWG CLI integration

Current implementation, 5 November 2026: board/details/comments/attachment reads, local Start work and opt-in workflow moves, comment posting/linked replies and uploads. REST remains the default when `transport` is absent. See [user setup](TWG_SETUP.md) and the separate [MCP implementation](MCP_IMPLEMENTATION.md).

## Verified contracts and evidence

TWG 1.4.2 is the verified baseline. Offline help/schema investigation is recorded
in [TWG_CONTRACT_EVIDENCE.json](TWG_CONTRACT_EVIDENCE.json); that file records the
initial investigation, not a full current capability matrix. Subsequent
user-authorized read-only observations resolved the board column mapping gate:
`jira board scope query` returns the Jira board configuration, including all
status IDs for each column. Sprint issue queries alone cannot provide that map.

Previously authorized desktop checks verified OAuth for the intended account/site,
board 51's six columns, sprint/issue reads, independent issue details, comments,
attachment metadata and PNG download. These observations establish the tested
CLI shapes, not universal compatibility with future versions. Subsequent recovery,
Start work and merge-readiness tests use mocks; no live Jira writes or real agent
runs are required.

| Purpose | Fixed CLI command | Decoding |
| --- | --- | --- |
| Profile support | `--help` | Require advertised `--profile` before authenticated requests |
| Current identity | `user get me` | Accept verified direct or nested user layout; expose display name only |
| Columns/status IDs | `jira board scope query --id` | v2 envelope and matching board ID |
| Sprints | `jira board sprints query --board-id` | Active/future, offset pagination |
| Assigned issues | `jira sprint workitems query --sprint-id` | Explicit fields and `assignee = currentUser()` |
| Independent issue | `jira workitem get KEY --strict --fields …` | Exactly one matching key, reject partial acquisition |
| Comments | `jira workitem comment query --issue-id` | Cursor pagination, newest creation/edit first |
| Attachments | `jira workitem attachment query --issue-id` | Validated metadata |
| Attachment bytes | `jira workitem attachment download --attachment-id --output-path` | Plugin-controlled private temporary destination |

Data commands pass site/profile explicitly and request direct JSON with
`-o json --output-summary none`. No shell interpolation, generic API dispatcher,
CLI-returned file path or REST-token fallback is used. `twg access` without a
board ID remains an unverified legacy diagnostic; Settings passes a board ID
and verifies its configuration response.

## Authentication and process boundary

The user runs OAuth login in a terminal on the Paseo host. Background login RPCs
are rejected before spawning a process. The plugin neither reads TWG credential
files nor extracts bearer tokens. The CLI runs with the host user's environment
and owns its authentication; this is not a claim that credentials never enter
CLI memory. The plugin does not install or upgrade TWG.

Execution uses argument arrays, closed stdin, a 30-second timeout, a 2 MiB output
limit and cancellation. Response summaries/file pointers and explicit error
envelopes are rejected. Only recognized error codes/statuses become fixed recovery
guidance. Raw CLI diagnostics are not sent to clients. An issue-lookup 404 produces
the quiet missing-ticket state; 401/403 remain visible authentication/permission
errors. Malformed or ambiguous data is never interpreted as a missing issue.

## Data, caching and attachment lifecycle

Board decoding rejects wrong assignees, duplicate issues, unknown column status
IDs and incomplete pagination. Pages require completion evidence and are capped
at 100. Multiple active sprints require a saved or explicit selection.

Validated board metadata is cached for ten minutes, at most 128 entries, keyed by
executable/site/profile/board/account. Identity, sprint and issue reads remain
fresh. Mapping choices share that cache; Refresh columns invalidates it.
Client query keys include the connection revision to avoid reusing reads after
settings changes.

Comments are fully paginated before sorting by latest creation/edit time and
returning UI pages. Rich content uses the existing safe renderer, not CLI HTML.
Attachment downloads check current issue membership and the 25 MiB transfer limit.
They use a private temporary directory and fixed filename, open without following
symlinks, validate regular-file size, perform bounded reads, and remove the directory
in `finally`. A 50 MiB/32-entry byte cache expires after two minutes; concurrent
reservations are limited to 50 MiB. Content caches contain no credentials.
Shutdown cancels active processes and clears caches.

## Local actions and write opt-in

Play validates the issue through TWG, then uses the existing local branch/worktree,
workspace, labels and agent flow. Existing branches/worktrees are reused; multiple
matches use the separate chooser dialog. Entry skill dispatch is optional and uses
`/skill ISSUE-KEY`. The plugin performs no Jira transition. A configured skill
controls its own later actions independently.

Dashboard cards and details retain Play/Open workspace; workspace Jira panels do not show Play. Without saved `twgWrites`, Jira write controls and drag-and-drop are disabled and server-side guards reject mutations. With opt-in, TWG uses the adapters below. REST credentials are never used as fallback.

## Historical merge review (4 November 2026)

Reviewed the branch against main for routing, backward-compatible settings,
connection-specific client reads, fixed CLI arguments, bounded content handling,
REST credential isolation and local Start work. No additional merge-blocking
finding remains after correcting stale guard wording and the incomplete-URL
validation crash. Guard regression tests also cover workflow sessions and project
status discovery. Both supported Paseo SDK configurations run the full automated
and browser suites in CI; source/history secret scanning is separate.

That original read-only PR deferred writes, now implemented below. CLI distribution/embedding terms and public-release authentication clearance remain separate unresolved gates.

## Opt-in write integration

Workflow moves, Markdown comments/linked replies and attachment uploads are implemented. Existing
connections retain `twgWrites: false`; users explicitly enable **Allow Jira changes** in Settings. This flag is enforced server-side before constructing
write adapters. REST remains independent and is never used as fallback.

Command contracts were inspected offline in installed TWG **1.4.2** using
`help describe --detail full`. Output shapes were cross-checked against the
bundled implementation in the same executable, without executing a mutation or
reading authentication files. Public command availability is also listed in the
[official catalogue](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/commands/commands-catalog/).
No live Jira requests were used for this work.

- Discovery uses `jira workitem transition --id KEY` without a transition ID.
  Its `data.transitions` entries include `id`, `name`, `toName` and screen `fields`
  with `fieldId`, `fieldName`, `required`, schema, operations and allowed values.
  Destination IDs are not included. `jira workitem statuses query` lists existing statuses, which are then filtered
  to the board's actual IDs to resolve names; duplicate names fail closed. Listing
  avoids failing every move when the board retains a deleted status ID. The existing
  move dialog and field converters are reused.
- Submission uses `jira workitem transition --id KEY --transition-id ID
  --fields-json JSON`. The CLI revalidates transitions and screen fields before
  writing. Success requires the matching issue/transition identity and explicit
  `data.success: true`. Only then may the configured destination start local work.
- Comments use `jira workitem comment create --issue-id KEY --body MARKDOWN
  --body-format markdown`. Linked replies include a link to the original comment.
  The original is fetched afresh; internal comments and restrictions without a
  transferable group/role name are refused. CLI group/role flags preserve supported
  restrictions. The existing request-receipt cache prevents duplicate submission.
- Uploads use `jira workitem attachment upload --issue-id KEY --file PATH`.
  The shared upload manager bounds chunks and coalesces submissions. TWG receives
  a private owner-only temporary file preserving the chosen filename; the directory
  is removed after success or failure. Uploads are bound to connection identity
  so switching profile/transport before Finish cannot send the buffered file through
  another account. CLI data must contain a nonempty attachment result array.

No write is retried automatically. Unknown/malformed/timeout responses report
uncertain delivery and tell the user to refresh/check Jira before retrying. Raw
CLI errors are not displayed. Known authentication/permission failures retain
sanitized guidance. Play remains local and never updates Jira on its own.

### Remaining differences from REST

TWG 1.4.2 exposes no native attachment-settings reader in the inspected command surface. A narrow anonymous Jira HTTP supplement reads enabled/uploadLimit without CLI credentials; this is not a native CLI capability. Valid settings block disabled uploads and cap size at the smaller of Jira's limit and 25 MiB. If unavailable, the UI explicitly labels the plugin-only fallback and Jira enforces actual settings at upload. See [attachment settings evidence](MCP_IMPLEMENTATION.md#actual-attachment-settings-for-mcp-and-twg-2026-11-05). Transition destinations with duplicate
names cannot be mapped safely because the CLI removes destination IDs. Identifier-only
comment visibility restrictions cannot be passed through its name-based flags.
Those cases require Jira rather than guessed values or widened visibility.
Detailed arbitrary CLI validator diagnostics are not forwarded to clients;
unknown failures use sanitized recovery guidance.

Verification: full mocked checks and browser suites cover REST and TWG modes,
write opt-in, transition fields/order, rejected/uncertain results, visibility
preservation/refusal, upload cleanup and connection changes. No test invokes a
real CLI mutation, creates a real workspace, or starts a real agent/skill.
