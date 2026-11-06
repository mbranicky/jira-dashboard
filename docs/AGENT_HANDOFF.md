# Jira Dashboard — agent handoff

Updated: 2026-11-06. Current continuation brief; implementation detail lives in [MCP implementation](MCP_IMPLEMENTATION.md), [TWG implementation](TWG_IMPLEMENTATION.md), [specification](../SPECIFICATION.md) and [design](../DESIGN.md).

## Repository and delivery status

The repository is public. Atlassian MCP support merged into `main` on 2026-11-05 in [PR #8](https://github.com/mbranicky/jira-dashboard/pull/8) (commit `f5019ca`). All three CI checks passed. The local plugin was reloaded from `main` in `/Users/marek/Projects/paseo/jira-dashboard`. Version 0.1.0 is available from source only.

Latest fix: MCP transition discovery returned `to.name` and `to.statusCategory.key` without destination `id`, causing raw validation JSON before any submission. User-triggered value-free diagnostics confirmed the shape and `listJiraStatuses` site lookup output `{data:{statuses:[{id,name}]}}`. The adapter now resolves an omitted ID through `mode: site, nameContains`, requires one exact case-sensitive name match, rejects malformed/ambiguous/explicitly incomplete results, and rechecks the mapping before writing. Existing IDs bypass lookup. The transition ID remains the submitted action; fresh issue status must match the resolved destination afterward. REST/TWG adapters are unchanged. The temporary lookup probe was removed; readable preflight errors remain.

No live move was tested or submitted by the agent. The fix is covered by mocked response/ambiguity/change/readback regression tests; live successful transition remains unverified. No user diagnostic reply is pending.

## Constraints

- Implement and test writes with mocks only. **No live Jira test writes**, including comments, uploads and transitions. Do not retry a user's submission.
- Preserve selected transport, configuration and saved OAuth authorization. Never reset or disconnect for development convenience.
- Reload only `paseo plugin reload jira-dashboard`, then require running. Never restart the daemon.
- Never read actual credentials or expose tokens, authorization URLs/codes, comment bodies, attachment bytes or raw provider errors in diagnostics.
- All unlabeled action icons use compact, content-sized, left-aligned shared tooltips; obvious close and refresh controls may omit them. No Cypress thank-you sign-off.
- Keep cards content-focused; forms, branch choices and errors belong in separate dialogs. Reuse existing branches/worktrees, without random suffixes. External Jira actions use icon buttons with tooltips.
- Check desktop/mobile for UI changes. No release-readiness claim from focused tests alone.

## Implemented state

REST, TWG and MCP share the board, details, comments/attachments and local Start work UI. Settings uses one connection-method dropdown while preserving other methods' settings. The MCP option is labelled “Atlassian MCP”.

MCP OAuth, board/details/comments and attachment preview/download/Open in browser work on the user's host. Write controls require saved `mcpWrites` and granted write consent. The user completed that consent. Status, comment/reply and upload adapters are implemented; upload outputs remain partly unverified, and transition destination resolution has the mock-tested fix above. Do not claim unrestricted live parity.

The user observed a created MCP reply after manual refresh despite an uncertain-delivery error. Its actual response was a receipt with `data.commentId`, not a full REST comment. The fixed adapter reads back that exact ID through paginated comments; it never invents authors/timestamps or repeats writes. Post-fix UI success is mock-tested, not separately live verified by the agent. The existing comment must not be reposted.

## Implementation map

| Area | Owning files and behavior |
| --- | --- |
| OAuth/lifecycle | `server/mcp-oauth.ts`, `mcp-callback.ts`, `mcp-settings.ts`, `mcp-binding.ts`, `mcp-identity.ts`: explicit host-browser consent; passive restoration; account/cloud/site pin; cancelled upgrade retains saved grant. Same-grant refresh preserves omitted scope, but explicit reductions/new consent/client or issuer changes/invalidation do not inherit old scope. |
| Protected storage | `server/mcp-store.ts`, `mcp-keyring-helper.ts`, `scripts/prepare-native.mjs`: host OS store through standalone Node helper; no plaintext fallback. Installation-local native path is ignored and regenerated. Other OS/runtime packaging still needs verification. |
| MCP boundary | `server/mcp-client.ts`, `mcp-tools.ts`: schema validation, separate read/write allowlists, bounded catalogue pagination, sanitized errors, no mutation retries. |
| Reads | `server/mcp-dashboard.ts`, `mcp-issue.ts`, `mcp-content.ts`: complete bounded pagination, full issue views, exact-key lookup, binding checks. Sprint `all` is filtered to active/future; historical-page overhead remains. |
| Rich text | `server/jira-html.ts`, `server/jira.ts`, `client/jira-content.tsx`: inert HTML/ADF/wiki normalization, shared native renderer, media placeholder; never execute remote HTML. |
| Writes | `server/mcp-writes.ts`, `mcp-upload.ts`: fresh workflow/parent preflight; status/comment/attachment readback; restricted upload command parsed as data, never executed. |
| Attachment settings | `server/attachment-settings.ts`, `index.server.ts`: anonymous, credential-free Jira attachment metadata HTTP supplement for MCP/TWG; strict origin/schema/size/time/redirect rules. Not a native MCP/TWG tool. Fallback is explicitly plugin-only, not verified Jira enabled status. |
| Connection report | `server/mcp-connection-check.ts`, `client/mcp-settings.tsx`: shared step report for unsaved values, fresh reads, no save/consent/writes; other draft site cannot replace active authorization. |
| Workspace navigation | `server/work.ts`, `index.server.ts`: saved links win; otherwise discover a unique active workspace name/title key in the mapped Paseo project. Exclude ambiguous/background/internal/archiving workspaces. Discovery failure keeps board and saved links, discards partial discoveries and shows `workspaceWarning`; successful refresh clears it. |
| Shared presentation | `shared/search-highlights.ts`, `client/search-highlight.tsx`: literal case-insensitive key/title matches using theme accent colors. `shared/comments.ts`, `client/comments.tsx`: linked replies rendered nested across all transports. |

## Linked-reply maintenance rule

Writes currently create top-level comments with a source link. The dashboard recognizes only a standalone leading “Linked reply to …” link for the same site/issue with one numeric parent ID. Native parent IDs take precedence. Missing parents and cycles never hide comments; the original body/link remains visible.

This is a presentation workaround. Before future comment integration changes, recheck REST and advertised MCP/TWG contracts for native parent/back references on both reads and writes. Adopt verified native support per transport while retaining recognition of historical linked replies. MCP `commentId` is an edit target, not a parent. Do not claim Jira universally lacks threading.

## Verification and remaining work

Pre-merge verification is summarized below. [Testing](TESTING.md) records the focused regression checks and full suite results.

Remaining work includes verifying the MCP upload preparation and media response formats without live test writes, checking native credential storage on other supported hosts, and resolving [distribution clearance for the local-token approach](ATLASSIAN_AUTH_POLICY.md) before a registry release.

## Production diagnostics

Temporary response shapes, OAuth progress events and catalogue schema/description logs have been removed. `server/mcp-diagnostics.ts` now accepts only fixed failure codes, with compile-time and runtime allowlists and no response/error payload parameter. Sanitized client errors and uncertain-delivery behavior are unchanged. Successful connection/catalogue discovery is tested to emit no logs. Do not restore provider payload logging to investigate future contracts without an explicit, narrowly scoped need.

Useful checks: `npm run typecheck`, `npm run typecheck:ui`, focused `node --import tsx --test tests/…`, and `npm run test:ui -- --spec cypress/component/…`. Cypress/Paseo may need elevated execution. A macOS trash warning alone is not a failed test; inspect actual results.

Final transition-fix verification (2026-11-05): 50 mocked MCP/TWG/shared-move tests passed, source and UI typechecks passed, whitespace check passed. Plugin reloaded successfully and reported running. No live Jira writes performed.

## Full verification completed — 2026-11-05

Locked 0.14 and isolated 0.15 SDK configurations each passed both typechecks, 277 backend tests, 109 browser tests across 13 specs, source audit and 118-file package validation. Gitleaks history/current-source scans passed after narrowly annotating three synthetic curl fixtures; npm audit reported zero vulnerabilities. Clean production installation/native preparation/imports and temporary unconfigured Paseo loading succeeded on macOS; temporary registration removed, original dashboard running. Representative light/mobile and dark/desktop screenshots inspected. Verification used mocks for Jira writes. See [Testing](TESTING.md) for evidence boundaries. Full current automated/local gates are complete; upload response contracts, other OS native-store verification, public-distribution clearance remain separate gates.

Diagnostics reduction verified (2026-11-05): `npm run check` passed both typechecks, all 278 backend tests, source audit and 118-file package validation. Added no-log success coverage and replaced shape tests with failure-code/no-payload privacy tests. Browser behavior is unchanged; the preceding 109-test suites were not rerun for this backend logging-only change.
