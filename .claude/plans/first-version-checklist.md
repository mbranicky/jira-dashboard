<!-- CHECKLIST INSTRUCTIONS
IMPORTANT: When working on items in this checklist, you MUST check off each item
(change `- [ ]` to `- [x]`) AS SOON AS it is implemented/completed.
Do not wait until the end — check off each item immediately after finishing it.
This file is the source of truth for tracking progress.
-->
# Jira Sprint Workspace first-release checklist

Baseline reviewed 2026-11-03: 83 Node tests, 33 Chrome component/capture tests, and both type checks passed; 118 Git candidate files audited; 68 package files checked. Checked means the stated task is complete; partial coverage stays unchecked. Initial Git commit and public release are separate milestones. Do not publish, select a license, or bump the version without the user's direction.

## 1.3.0 minor release preparation (2026-11-13)

- [x] User authorized minor-release preparation; keep all three transports and existing Paseo requirements.
- [x] Set package, shrinkwrap and MCP metadata to 1.3.0; update README, changelog and handoff for multiple destinations and change-aware Save buttons.
- [x] User confirmed multi-mapping works in their workflow; retain mock-only Jira write verification.
- [x] Refresh and visually review public media for grouped mappings, project selection and the connection Save state.
- [x] Both typechecks, 317 Node tests, 15 release-verifier tests and 241 browser tests passed across the full run and focused rerun of the corrected sprint test/new preview; see docs/TESTING.md.
- [x] Final tarball: 151 files, 1,530,405 bytes; clean extracted manifest build and production audit passed with zero vulnerabilities after compatible Hono patch updates. Retained at `/tmp/jira-1.3.0-candidate/paseo-jira-sprint-workspace-1.3.0.tgz`; SHA-256 `79be75f8c6ba934a4e32472f54dae374674d4d315666da9b8dfd9c0dbee75689`. Any packaged edit requires rebuilding.
- [x] Obtain commit/PR, merge, tag and publication authorization on 2026-11-13.
- [ ] Require green preparation PR and exact-main checks.
- [ ] Publish exact verified bytes, then verify npm and the separate registry update.

## 1.2.2 patch release (2026-11-12)

- [x] User authorized version 1.2.2, release preparation, tag and publication; retain all three connection methods.
- [x] Merge UI fixes and eight refreshed synthetic screenshots in PR #44; add the linked visual tour.
- [x] Synchronize package, shrinkwrap, MCP metadata, README, changelog and handoff at 1.2.2; retain `>=0.14.0 <0.16.0`.
- [x] Candidate checks: both baseline and isolated 0.15.4 typechecks, 305 Node tests, 15 release-verifier tests, 148 packaged files and clean extracted manifest build passed; production audit found zero vulnerabilities. Isolated macOS arm64 Paseo 0.15.4 activation/reload and first-run UI passed with all three choices. PR #44/main passed 226 mocked Chrome tests. Final artifact identity is retained under `/tmp/jira-1.2.2-candidate` and in release assets.
- [ ] Require green preparation PR and exact-main checks, compare merged package, then tag and publish through OIDC. Record completion in GitHub release notes and workflow evidence; do not modify published bytes.

## 1.2.1 patch release (2026-11-09)

- [x] Authorization: commit/push, PR, green checks, merge, tag, release notes and npm publish.
- [x] Keep all three transports and `>=0.14.0 <0.16.0`; synchronize package, shrinkwrap, MCP metadata and README at 1.2.1.
- [x] Document consolidated corners, compact cards and keyboard-only focus; preserve primary button rounding and touch targets.
- [x] Refresh and review all five synthetic public screenshots.
- [x] Both baseline and isolated 0.15.3 typechecks passed; 304 Node, 201 browser and 15 publishing-verifier tests passed. Production dependency audit: zero vulnerabilities.
- [x] Extracted manifest build passed; isolated macOS arm64 Paseo 0.15.3 activation/reload and first-run UI passed with all three connection choices. Final artifact: `paseo-jira-sprint-workspace-1.2.1.tgz`, 1049305 bytes, 143 files; SHA-256 `9ea6b4ba293ae80261004e55bf0e89b1825237faee6e741ece600a5de5ccf680`. Retained under `/tmp/jira-1.2.1-candidate`.
- [x] PR #43 and exact-main CI passed; v1.2.1 and npm publication completed. [Publishing verification](https://github.com/mbranicky/jira-dashboard/actions/runs/42609393160) checked the exact artifact.

## 1.2.0 completed release (2026-11-08)

- [x] Merge UI/media PR #39 only after all four checks pass; reload from updated main.
- [x] Keep REST, Teamwork Graph CLI and Atlassian MCP, the plugin ID, and existing Paseo requirements.
- [x] Set package, shrinkwrap root/package and MCP handshake metadata to 1.2.0.
- [x] Prepare changelog and handoff; include five reviewed synthetic screenshots.
- [x] Verify both typechecks, 302 Node tests, 189 Chrome tests, source audit and package contents. Clean extracted manifest build passed on macOS arm64. Candidate: `/tmp/jira-1.2.0-candidate/paseo-jira-sprint-workspace-1.2.0.tgz`, 142 files, 1064790 bytes; SHA-256 `dbe0d107eacc3492d17387522e138b70325318525269b8f088b975a960cc79f6`. Rebuild after any packaged changes.
- [x] PR #40 merged; exact-main checks passed at `7e39a4178ada9ffaf5a8431eef9511a224cf4209`.
- [x] Explicit authorization received on 2026-11-08 to merge after green checks, tag, create release notes and publish 1.2.0.
- [x] Published immutable npm 1.2.0 and GitHub release v1.2.0 through OIDC; downloaded bytes verified. Registry approval/deployment is a separate channel.

Policy ticket ECOHELP-182681 remains unresolved. Existing host coverage and mock-only MCP upload verification remain unchanged. No live Jira writes are authorized.

## 1.1.0 release completed (2026-11-07)

Version 1.1.0 is published to npm and deployed in the Paseo registry. Older sections below are historical records; unchecked first-release items do not describe the current delivery status. Atlassian policy questions remain unresolved independently of registry acceptance.

- [x] Merge PRs #23–#27 after green checks; reload main (`3956ad8`) and verify the board loads.
- [x] Set package, shrinkwrap root/package entry and MCP handshake metadata to 1.1.0. Preserve plugin ID and Paseo requirement `>=0.14.0 <0.16.0`.
- [x] Keep REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth.
- [x] Add 1.1.0 changelog and update the handoff. Document native mobile draft fallback and unchanged host/upload limitations.
- [x] Refresh and visually review all four public screenshots using synthetic data; update approved media hashes.
- [x] Run full Node/browser tests, both typechecks, package validation and source scan on the release candidate. Passed 296 Node tests, 143 Chrome tests and 14 release-script tests; see `docs/TESTING.md`.
- [x] Pack the final candidate, record SHA-256 outside packaged contents, inspect version/contents and run the manifest build from a clean extraction. Final artifact: `paseo-jira-sprint-workspace-1.1.0.tgz`, 130 files, 1,001,488 bytes; SHA-256 `90b40f0e97dfff51a0238a96aa18975899868457a0b092612a55aa9831f143f5`. Both manifest commands passed on macOS arm64; zero reported production dependency vulnerabilities. This checklist is excluded from the tarball.
- [x] Merge preparation [PR #28](https://github.com/mbranicky/jira-dashboard/pull/28) and verify all four [main checks](https://github.com/mbranicky/jira-dashboard/actions/runs/42390391099) for release commit `5c738db438238222198927ff7fec6659efa7dd1b`.
- [x] Configure the explicitly authorized npm trusted publisher: `mbranicky/jira-dashboard`, workflow `publish.yml`, environment `npm`, direct publication allowed, separate dist-tag management disabled. Successful OIDC publication validated the connection.
- [x] Record the maintainer's explicit instruction to release 1.1.0 with all three connection methods while ECOHELP-182681 remains unresolved. This is release authorization, not new Atlassian policy clearance.
- [x] Publish the authorized [v1.1.0 tag and GitHub release](https://github.com/mbranicky/jira-dashboard/releases/tag/v1.1.0), including release notes, the exact tarball and checksum. The tag remains pinned to `5c738db`.
- [x] Publish [npm 1.1.0](https://www.npmjs.com/package/paseo-jira-sprint-workspace/v/1.1.0) as `latest`; [publishing run](https://github.com/mbranicky/jira-dashboard/actions/runs/42391878271) verified registry integrity and byte-identical download against the tested tarball.
- [x] Install npm 1.1.0 by name on an isolated macOS arm64 Paseo 0.15.3 host. Startup and reload passed; Jira Workspace opened first-run settings with all three connection methods. No Jira credentials or live writes were used. Stop the temporary host and preserve the active installation.
- [x] Submit the separately authorized registry migration in [#2089](https://github.com/getpaseo/plugins/issues/2089); [PR #2090](https://github.com/getpaseo/plugins/pull/2090) was approved and merged. Verify the [live index](https://plugins.paseo.sh/index.json) now uses npm `paseo-jira-sprint-workspace@1.1.0`, preserving listing ID `mbranicky/jira-dashboard`. [Registry deployment](https://github.com/getpaseo/plugins/actions/runs/42409290244) passed. Future npm releases can receive automatic update PRs; each still needs registry approval and deployment.

Screenshot-only [PR #29](https://github.com/mbranicky/jira-dashboard/pull/29) subsequently merged as `58d404d`. Its refreshed assets are on main, not in the immutable npm 1.1.0 package or tag. The registry uses the media shipped with the reviewed npm package. No new version or publication accompanies this record update.

## 1.0.0 release preparation (2026-11-06)

- [x] Choose the public display name **Jira Sprint Workspace**, default plugin ID and package name `paseo-jira-sprint-workspace`, and package version `1.0.0`. Document the ID change for development installations.
- [x] Prepare the 1.0.0 changelog and update installation and setup text for the public repository.
- [x] Review runtime and development dependencies, scripts and packaged files. Keep publication disabled during preparation.
- [x] Confirm the 1.0.0 connection methods: ship all three — REST API with a scoped token, Teamwork Graph CLI OAuth, and Atlassian MCP OAuth.
- [x] Verify that Atlassian documents tools invoking the separately installed Teamwork Graph CLI. The plugin calls a user-selected CLI profile and ships no CLI binary.
- [x] Submit both distribution questions to Atlassian Developer Support. Filed on 6 November 2026 as [ECOHELP-182681](https://ecosystem.atlassian.net/servicedesk/customer/portal/34/ECOHELP-182681).
- [ ] **Local REST tokens — awaiting Atlassian’s response.** Confirm whether a distributed plugin may read a scoped token from the user’s private file, and which supported authentication flow to use if a change is required.
- [ ] **Shared host access — awaiting Atlassian’s response.** Confirm the identity requirements for REST and TWG when the account owner uses several devices or a different person connects to the same host. Record the answer and satisfy any conditions before registry submission. See the [authentication policy review](../../docs/ATLASSIAN_AUTH_POLICY.md#submitted-support-request).
- [x] Record 1.0.0 host coverage: macOS on Apple silicon verified, Ubuntu CI coverage only, Windows and Intel Macs unverified.
- [x] Document verified MCP attachment reads, mock-only upload coverage and how to check an unconfirmed upload in Jira. See [known limitations](../../docs/KNOWN_LIMITATIONS.md#atlassian-mcp).
- [x] Build the 1.0.0 candidate tarball from `8ae5eb1` on Apple silicon and open **Jira Workspace** on an isolated Paseo 0.15.2 host. All mock connection steps passed for REST (8/8), Teamwork Graph CLI (7/7) and Atlassian MCP (7/7). See the [tarball test record](../../docs/TESTING.md#apple-silicon-npm-tarball-test).
- [x] Record the maintainer’s 6 November decision to release all three methods to npm with the local-token and shared-host questions unresolved. Continue tracking Atlassian’s answer before a separate Paseo directory submission.
- [x] Prepare npm installation instructions, the 1.0.0 changelog and public package metadata. The maintainer selected browser-authenticated CLI publication for the first version and GitHub Actions trusted publishing for subsequent releases. On 6 November 2026 the public npm registry returned 404 for `paseo-jira-sprint-workspace`. Recheck the name before publishing.
- [ ] Verify the exact final tarball after release edits. Run CI, review packaged contents and record the final digest before requesting authorization to tag and publish.
- [ ] After authorized npm publication, install version 1.0.0 by name on a clean host. Submit a Paseo directory listing only with separate authorization.

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

- [x] **Protect unfinished comments:** retain drafts across ticket changes and closing details, with explicit storage limitations.

  Superseded by PR #27: verified-account-scoped device-local drafts survive reloads on desktop/browser clients. Native mobile clients explicitly report session-only retention. Uncertain delivery remains protected, and a missing durable delivery marker blocks web submission. Regression tests cover identity, restoration and failure paths.

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
- [x] Confirm documented CLI invocation by external tools. The shared-host identity question remains open in the 1.0.0 checklist above.

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
- [ ] Before expanding host claims, verify installation and native credential storage on Linux, Windows and Intel Macs.

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
