<!-- CHECKLIST INSTRUCTIONS
IMPORTANT: When working on items in this checklist, you MUST check off each item
(change `- [ ]` to `- [x]`) AS SOON AS it is implemented/completed.
Do not wait until the end — check off each item immediately after finishing it.
This file is the source of truth for tracking progress.
-->
# Jira Sprint Workspace first-release checklist

Baseline reviewed 2026-11-03: 83 Node tests, 33 Chrome component/capture tests, and both type checks passed; 118 Git candidate files audited; 68 package files checked. Checked means the stated task is complete; partial coverage stays unchecked. Initial Git commit and public release are separate milestones. Do not publish, select a license, or bump the version without the user's direction.

## 1.0.0 release preparation (2026-11-06)

- [x] Choose the public display name **Jira Sprint Workspace**, default plugin ID and package name `paseo-jira-sprint-workspace`, and package version `1.0.0`. Document the ID change for development installations.
- [x] Prepare the 1.0.0 changelog and update installation and setup text for the public repository.
- [x] Review runtime and development dependencies, scripts and packaged files. Keep publication disabled during preparation.
- [x] Confirm the 1.0.0 connection methods: ship all three — REST API with a scoped token, Teamwork Graph CLI OAuth, and Atlassian MCP OAuth.
- [ ] Resolve the outstanding distribution questions for REST token authentication and use of the Teamwork Graph CLI before registry submission.
- [ ] Decide the supported host platforms and how to describe MCP uploads given the outstanding verification below.
- [ ] Verify the final artifact for the chosen distribution channels. Obtain release authorization before tagging, publishing or submitting a directory listing.

## Before first version

- [x] **Setup guide** — Token creation, complete scopes, `jira.env`, board configuration, project mappings, and entry-skill examples.

  Already covered: `docs/JIRA_SETUP.md` contains the 27-scope checklist, secret-file permissions, token replacement, endpoint references, troubleshooting, attachment limits, and caching. `OVERVIEW.md` describes mappings and skills. Added `docs/GETTING_STARTED.md` with the complete walkthrough and provider/model/mode/isolation setup; corrected outdated attachment wording. Overview rewritten to match Play, workflow drag-and-drop, attachments and provider data flow. Reviewed synthetic setup and interface screenshots are included in the guide and registry media. Reverified all 17 endpoint rows against current public Platform/Software OpenAPI specifications on 2026-11-03: exact 27-scope union. Corrected stale automatic-status checkbox and unsupported-field wording; no tenant requests performed.

- [x] **Connection check** — A “Test connection” action that identifies authentication, permissions, and board-access problems clearly.

  Completed: Test connection checks unsaved URL/file values with fresh read-only authentication, board, sprint and search requests; identifies the failing step, and explicitly reports skipped sprint reads. Four backend tests and two browser tests cover success, failure, freshness and unsaved values. It does not validate write/comment/attachment privileges.

- [x] **Automated UI tests** — Cover settings, modal/panel selection, resize/collapse, navigation persistence, and mobile layouts. Unit tests alone won’t catch the visual regressions we’ve encountered.

  Completed 2026-11-03: 33 Chrome browser tests pass. Cypress component tests mount the real React Native Web dashboard/settings with isolated, schema-validated fixture boundaries. See `docs/TESTING.md`.

  - [x] Add isolated browser harness, scripts, test type checking, and fail-closed RPC fixtures.
  - [x] Verify settings validation, save failures, single success message, provider/model dependencies, and appearance selection.
  - [x] Verify loading/error states, search, sprint overlay, tag expansion, column scrolling, and modal Escape dismissal.
  - [x] Verify real panel dragging, resize cursor, collapse/expand, width/selection retention after navigation, and draft/scroll preservation.
  - [x] Verify 390 px full-screen details, fixed close control, field access, stacked settings, and overlay presets.
  - [x] Finish the complete suite run including 320 px light-theme and cross-ticket draft retention; capture review screenshots.

  Separate remaining gates: approved pixel-diff baselines and actual Paseo host widget/navigation smoke tests. Physical-phone review was completed by the user with no issues reported. Screenshot capture alone is not visual regression comparison.

- [x] **Workflow regression tests** — Verify branch/worktree reuse, archived workspaces, duplicate-click protection, failed transitions, required fields, comments, and attachments.

  Already covered: Node test runner with mocked Jira/Paseo operations and real temporary Git repositories. Tests cover branch reuse and ambiguity, checked-out source branch, archived links, repeated starts, uncertain prompt delivery, transition failures and sequencing, field encoding, linked replies and restrictions, duplicate comment/upload submission, attachment validation, and loopback image previews. Concurrent starts are already covered; a new agent-creation failure/retry test confirms workspace reuse and a single successful skill prompt. Rendered mocked workflows now cover same-column drops, unavailable transitions, required-field rejection/correction, comment posting and linked replies, uncertain delivery, attachment uploads and failed-transfer cleanup, image previews, branch choices and start recovery. All Jira/Paseo service boundaries are mocked; real temporary Git repositories test branch behavior. Live Jira write tests are not a release requirement.

- [x] **Public-repository audit** — Ensure tokens, `.local`, logs, screenshots containing private information, and company-specific defaults cannot enter Git.

  Completed point-in-time pre-Git audit: see `docs/SECRET_AUDIT.md`. Added defensive ignore rules and repeatable `npm run audit:secrets`; removed company-specific default and sanitized public examples. This does not make future secret commits impossible: repeat the audit and inspect the actual staged files before committing.

- [x] **CI checks** — Run type checking and tests on every push and pull request; validate the plugin’s distributable contents.

  Already covered: local `typecheck`, `test`, `audit:secrets` commands and npm package allowlist. Added GitHub Actions for both type checks, Node tests, Chrome component tests, secret scan and package-content checks. Local checks and GitHub Actions run `41613924655` on initial commit `8bd3820` pass, including a clean npm install and all 16 browser tests.

- [x] **Release documentation** — README, license, changelog, supported Paseo version, known limitations, and a short troubleshooting guide.

  Already covered: README documentation index, overview, specification, design guide, troubleshooting, and manifest requirement `paseo >=0.14.0`. Added installation/development instructions, Unreleased changelog, consolidated limitations and user-selected MIT license. Clean production-only copy loaded successfully on Paseo 0.14.0 with an isolated runtime ID; no Jira credentials or mappings copied. Managed Git installation and rendered first-run settings verified on Paseo 0.15.0 at merged main `f67eea528327773ece1da72d8c5d6ededcfe7634`; see `docs/TESTING.md`. That checkpoint used version 0.1.0 and disabled npm publication.

## Worthwhile product improvements

- [x] **Remember dashboard filters:** restore the selected sprint, search, and mobile column when returning from a workspace.

  Sprint selection is saved per board. PR #10 added per-host, per-board session retention for search and the mobile column; it also added a read-only refresh beside uncertain comment drafts.

- [ ] **Protect unfinished comments:** warn before switching tickets or closing details when a comment draft would be lost.

  Code inspection found existing host/issue-scoped comment draft storage. The browser suite verifies retention through collapse, ticket switching, and navigation. Restart still clears session drafts; no explicit unsaved-draft warning exists.

- [x] **Clear partial-failure recovery:** if a workspace is created but agent startup fails, offer a retry that reuses the workspace.

  Existing state recovery and partial-label failure tests provide a base. The explicit failed agent-start test passes. Completed: a Retry start action in the existing modal rechecks resource choices. Browser tests cover retry, branch selection and uncertain delivery with no retry; backend tests verify resource reuse and single prompt delivery.

- [x] **Manual setup checklist:** `docs/GETTING_STARTED.md` guides first-time users through connection → board → mapping → first workspace.

## Initial Git checkpoint

- [x] Audit current Git candidates and package contents without initializing the project repository.
- [x] Choose repository name, hosting, public/private visibility, and license with the user: private `mbranicky/jira-dashboard`, MIT.
- [x] Initialize Git, review the actual staged file list and diff, repeat secret audit, and make the initial commit: `8bd3820`.
- [x] Add remote and push: private `https://github.com/mbranicky/jira-dashboard`, branch `main`. No tag, release or npm publication.
- [ ] Complete the release gates above before tagging or publishing a first public release.

## Dependency audit

2026-11-03: npm audit reports 12 moderate findings through the React Native development-tool dependency tree, no high/critical findings. Suggested automatic remediation replaces the host-aligned React Native version; review compatibility before changing it. Not a clean security audit or public-release approval.

## Git installation readiness (2026-11-03)

- [x] Correct outdated overview and disclose agent-provider data flow.
- [x] Historical baseline (2026-11-03): moved the prototype MCP SDK out of production dependencies. The current MCP implementation requires the SDK and keyring as production dependencies; repeat clean-install verification for that dependency set.
- [x] Declare locked preparation: `npm ci --omit=dev --ignore-scripts`.
- [x] Execute that preparation in an isolated source copy with no existing node_modules or private settings. Installed 11 packages; production dependency audit reported no vulnerabilities. MCP SDK and Cypress absent; production Paseo client import succeeds.
- [x] Install the isolated prepared directory as `jira-dashboard-install-smoke` on Paseo 0.14.0; verify running, then remove it. Existing live plugin remains registered to the real checkout.
- [x] Verify managed Git acquisition/preparation at merged main `f67eea528327773ece1da72d8c5d6ededcfe7634` on Paseo 0.15.0. Actual first-run settings have empty connection fields, disabled connection actions and no mappings. Test registration and checkout removed; existing plugin unchanged. No Jira connection configured or requested. This revision is not tagged or published.

## Paseo 0.15.0 compatibility (2026-11-03)

- [x] Confirm app, daemon and CLI version 0.15.0.
- [x] Check unchanged runtime code against exact 0.15.0 SDK/client in an isolated copy: both type checks, 83 Node tests and 16 browser tests pass.
- [x] Confirm live dashboard, settings and dashboard issue panel render on the 0.15.0 app with read-only Jira data.
- [x] Add separate 0.15.0 CI job, preserving the locked 0.14.0 baseline. Both configurations passed on merged main: 83 Node tests and 33 browser tests, with type checks and package validation (Actions run `41654410542`).
- [x] Verify write-workflow and workspace-start behavior with mocked Jira/Paseo boundaries, without Cloud access or real agents.
- [x] Physical-mobile review by the user: no suspicious behavior or layout issues reported (2026-11-03). Plugin version remains 0.1.0; no release or publication authorized by this compatibility check.

## Listing media and browser coverage

- [x] Capture and visually inspect fictional dashboard, details, settings and mobile screenshots; include manifest media and package checks.
- [x] Replace test icon placeholders with Lucide icons, and verify all 22 browser tests.
- [x] Document preview provenance and exact-digest secret-audit review.

## Live workflow and mobile verification (2026-11-03)

- [x] On the live Paseo 0.15.0 app, open an existing workspace from the dashboard and confirm its Jira tab resolves the issue, with no Start/Open workspace controls inside that workspace tab.
- [x] Scroll a long live description to Jira fields, attachments and comments; confirm the panel header stays available.
- [x] Open the live comment composer, preview a Markdown draft, then discard it without posting.
- [x] Read existing comments with author/creation time and load an authenticated PNG attachment in the in-app preview.
- [x] Collapse dashboard details, navigate to a workspace and back, then expand: selection and collapsed state are retained.
- [x] Re-run the nine settings/mobile browser tests; inspect 390 px dark-theme fields/settings and 320 px light-theme description captures. No horizontal clipping observed in these captures.
- [x] Replace live write/startup testing with synthetic mocked workflow tests, per user direction. Do not request a real test issue or connect to Jira Cloud for automated verification.
- [x] User mobile review: on 2026-11-03, the user reported checking the mobile Jira Dashboard and finding nothing suspicious. Device, OS, orientation and individual checklist steps were not recorded; this is user-reported acceptance, not a claim that every device or keyboard interaction was independently verified.

The live observations used existing private issues but no private screenshots were added to the repository. These checks do not establish native threading, edited-comment ordering, external browser image previews, all workflow validators, or upload success.

## Verification policy

All further automated workflow verification uses synthetic data and mocked Jira/Paseo services. No real Jira data, Cloud connection, posted comments, uploads, status changes or agent runs. Historical read-only observations above remain historical evidence only. The user completed the mobile review with no issues reported.


## Final public-release preparation

- [x] Reverify all documented endpoint scopes against official public OpenAPI documents.
- [x] Register all four reviewed screenshots in manifest media; package validation now rejects missing/empty media.
- [x] Scan all reachable Git history and current Git candidates with checksum-verified Gitleaks 8.30.1: no findings.
- [x] Add the pinned scanner and full-history checkout to CI; merged-main Actions run `41654410542` passed.
- [x] Reassess dependency audit: no production findings; 12 moderate development-only findings documented without an incompatible forced React Native upgrade.
- [x] Research Atlassian's API-token policy using official sources; document findings and local-host distinctions in `docs/ATLASSIAN_AUTH_POLICY.md` (2026-11-03). No explicit local-plugin exemption found.
- [ ] Close the authentication distribution gate: obtain written Atlassian confirmation for this architecture, or adopt a supported authentication design before public distribution/registry submission. Research alone does not establish approval; local-token code remains unchanged.
- [x] Review changes, repeat audits and merge release-readiness PR #2 after its checks passed. Merged-main checks also passed in Actions run `41654410542`.
- [x] Verify clean managed Git installation from merged main `f67eea5` without real Jira credentials; first-run UI verified and temporary installation removed (2026-11-03).
- [x] Make the source repository public and prepare the first release notes. Submission remains a separate decision.

- [x] Refresh README for discovery: dashboard screenshot near the top, main capabilities, setup path, details preview and absolute documentation links for registry/npm readers. Remote assets become anonymously accessible after these changes reach main and the repository is public.

## Credential-handling audit (2026-11-03)

- [x] Audit runtime credential flow without reading actual credentials or contacting Jira Cloud; document findings in `docs/CREDENTIAL_SECURITY.md`.
- [x] Harden descriptor-based file reads, shorten session credential lifetime, remove unused credential-keyed state, normalize cache isolation and sanitize workflow errors.
- [x] Verify with synthetic credential regression tests: all 89 Node tests and both type checks pass. Actual-token secret scan intentionally not run under the no-secret-read constraint.
- [ ] Obtain the separate Atlassian distribution clarification; security hardening does not establish policy approval.

## Alternative Jira connectivity research — 2026-11-03

- [x] Compare public documentation for REST, official MCP v2, TWG CLI, ACLI, third-party wrappers and Forge in `docs/JIRA_CONNECTIVITY_OPTIONS.md`. No credentials read or Jira tenant calls made.
- [ ] Evaluate MCP v2 and TWG OAuth against the complete dashboard contract using synthetic fixtures; verify supported schemas, credential storage and distribution terms for the OAuth methods. The 1.0.0 scope decision retains REST alongside both OAuth options.
## TWG CLI alternative — read-only preview (2026-11-04)

- [x] Verify TWG 1.4.2 command contracts and authorized read-only desktop OAuth/board observations; see `docs/TWG_IMPLEMENTATION.md`.
- [x] Keep OAuth in the CLI; guide terminal login on the host, explicitly bind site/profile, reject background login, and never fall back to REST credentials.
- [x] Read board columns, active/future sprints and assigned issues with bounded pagination and success-only metadata caching.
- [x] Persist sprint selection by board. Multiple active sprints require an explicit or saved selection.
- [x] Show descriptions, fields, comments and attachments in dashboard details and workspace panels; safely preview/download attachments.
- [x] Show sanitized recovery errors and quiet missing-ticket state only for explicit issue-lookup 404 responses.
- [x] Restore local Start work and optional `/skill ISSUE-KEY` dispatch without Jira transitions; preserve branch/worktree reuse and separate dialogs.
- [x] Verify REST and TWG with mocks; standard and Paseo 0.15 CI plus source/history secret scans passed at `f2fd2fc`.
- [x] Consolidate setup/current-scope documentation and correct outdated unsupported-operation wording.
- [x] Review branch against main for REST compatibility, connection isolation and Jira write guards; extend guard coverage to workflow sessions and status discovery.
- [x] Merge read-only PR #4 after checks passed.

Deferred beyond this PR:

- [x] Implement opt-in TWG transitions, screen fields and drag-and-drop using the shared workflow UI; ambiguous destination names fail closed.
- [x] Implement opt-in TWG Markdown comments and linked replies with visibility preservation and duplicate-submission protection.
- [x] Implement opt-in TWG uploads with private temporary files, cleanup, connection identity checks and explicit plugin-only limit guidance.
- [ ] Resolve CLI distribution/embedding terms and the separate public-release authentication-policy gate. Private merge is not public-distribution approval.

Further automated verification uses mocks, without real Jira writes or agent/skill execution. Any entry skill selected by a user controls its own subsequent actions.

### TWG write-mode verification (feature-parity branch)

- [x] Verify installed 1.4.2 help and bundled output contracts offline.
- [x] Existing configurations remain read-only until explicitly enabled.
- [x] Mocked verification: 135 backend tests and 52 browser tests (complete suites), both typechecks, secret audit and package validation pass.
- [ ] Resolve CLI limitations for duplicate destination names and identifier-only comment restrictions before claiming unrestricted REST parity.
- [x] Read actual attachment settings through a bounded anonymous HTTP supplement for MCP/TWG, with explicit plugin-only fallback; no native metadata capability is claimed.
- [x] Review write integration, including blank visibility restrictions and malformed upload receipts.
- [x] Merge write integration in PR #5 after GitHub checks passed; no live Jira writes are required for automated verification.

### Desktop follow-up (2026-11-04)

- [x] User verified Teamwork Graph attachment upload and linked comment replies in Jira UI.
- [x] User verified workflow moves after the stale-board-status lookup fix, including required story points and the In Development prerequisite before In Progress.
- [x] PR #6 merged with expanded read diagnostics and Settings UI alignment.
- [x] Remove experimental UI headings; preserve documented CLI and public-distribution limitations.
- [x] Refresh user documentation and fictional listing screenshots for both connection options.

These are user-performed live observations. Automated tests continue to use mocks; no live write tests are required or run by the agent.

## Atlassian MCP v2 continuation

- [x] Bring the OAuth branch up to date with merged REST/Teamwork Graph support.
- [x] Exercise the real SDK handshake and tool-catalogue pagination with mocked HTTP; reject closed-session reuse and sanitize transport failures.
- [x] Complete mocked OAuth exchange/refresh, OS-store persistence and account/site verification in the MCP connection flow. User sign-in now works on the current macOS host; other native-store/platform packaging remains unverified.
- [x] Inspect current advertised read/write input schemas and preserve existing connection options; output-contract limitations remain tracked below.

- [x] Mock SDK OAuth discovery, registration, PKCE exchange, refresh and revoked-refresh recovery.
- [x] Add account/site binding validation with mismatch and ambiguity tests; wire identity tools into the MCP connection flow.
- [x] Replace session-only storage with an OS credential-store adapter, restore/rotation/disconnect tests and no plaintext fallback. No real Keychain or Jira access used.

- [x] Verify the combined SDK OAuth/MCP persistence/restart/refresh flow using mocks.
- [x] Integrate the MCP Settings connection and serialize active flows, cancellation, reconnect and disconnect; verify with lifecycle and desktop/mobile RPC mocks.
- [x] Implement the guarded read-only MCP board adapter and opt-in Settings selection using synthetic contracts; cover pagination, caching, permissions, expired sessions and desktop/mobile restrictions with mocks.
- [x] User verified MCP OAuth, board/details/comments and attachment reads on the current host.
- [ ] Verify native-store packaging on other supported hosts and repeat clean production installation for the current dependency set.

- [x] Enable MCP local Start work using the shared mapping, branch/worktree and agent workflow, without Jira writes or REST credentials.
- [x] Confirm live MCP attachment preview, download and Open in browser with the user.
- [x] Implement authorized MCP status/comment/reply/upload adapters and UI using advertised input schemas and mocked tests; no live test writes.
- [x] Handle observed MCP comment receipts through exact-ID paginated readback, with mocked regression tests and no automatic write retries.
- [x] Resolve observed MCP name-only transition destinations through exact status lookup, reject ambiguity/incomplete data, recheck before submission and replace raw validation JSON with readable errors. Regression tests use mocks; live successful moves remain unverified.
- [ ] Establish upload preparation/media output contracts through authoritative schemas or safe evidence from ordinary user usage; no live test writes.
- [x] Preserve omitted scope on same-grant OAuth refresh, with explicit reductions and grant separation tested.
- [x] Keep board reads usable when optional workspace discovery fails; test saved-link retention and desktop/mobile warning recovery.
- [x] Add MCP connection reports, themed search highlights, shared linked-reply nesting and manual-workspace navigation.
- [x] Remove temporary OAuth progress, response-shape and catalogue diagnostics; retain only fixed failure codes with no payloads. Privacy/no-log success regressions and all 278 backend tests passed.
- [x] Run full current automated/local verification (2026-11-05): both 0.14/0.15 SDKs, 277 backend and 109 browser tests each, typechecks, source/history scans, package validation, zero-vulnerability npm audit, and clean local production installation/loading. Other OS credential stores and unresolved MCP upload contracts remain separate gates.
