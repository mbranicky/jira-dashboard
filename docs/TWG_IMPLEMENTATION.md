# TWG CLI integration

Current scope, reviewed 4 November 2026: **experimental read-only Jira access
plus local Start work**. REST remains the default when `transport` is absent.
See [user setup and limitations](TWG_SETUP.md). The MCP implementation remains on
its independent branch and is not included in this change.

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

## Local actions and read-only enforcement

Play validates the issue through TWG, then uses the existing local branch/worktree,
workspace, labels and agent flow. Existing branches/worktrees are reused; multiple
matches use the separate chooser dialog. Entry skill dispatch is optional and uses
`/skill ISSUE-KEY`. The plugin performs no Jira transition. A configured skill
controls its own later actions independently.

Dashboard cards and details retain Play/Open workspace; workspace Jira panels do
not show Play. TWG hides Jira write controls and disables drag-and-drop. Server-side
REST guards block workflow sessions, status discovery, comments and attachment
writes before reading REST credentials or issuing HTTP calls. Switching back to
REST retains the existing feature set. No automatic transport fallback occurs.

## Merge review and follow-up

Reviewed the branch against main for routing, backward-compatible settings,
connection-specific client reads, fixed CLI arguments, bounded content handling,
REST credential isolation and local Start work. No additional merge-blocking
finding remains after correcting stale guard wording and the incomplete-URL
validation crash. Guard regression tests also cover workflow sessions and project
status discovery. Both supported Paseo SDK configurations run the full automated
and browser suites in CI; source/history secret scanning is separate.

Deferred from this read-only PR: workflow transitions/required fields, comment
posting/linked replies and attachment uploads. CLI distribution/embedding terms
and public-release authentication clearance remain separate unresolved gates.
