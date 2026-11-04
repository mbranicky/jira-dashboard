<!-- CHECKLIST INSTRUCTIONS
IMPORTANT: When working on items in this checklist, you MUST check off each item
(change `- [ ]` to `- [x]`) AS SOON AS it is implemented/completed.
Do not wait until the end — check off each item immediately after finishing it.
This file is the source of truth for tracking progress.
-->
# Jira Dashboard first-version checklist

Baseline reviewed 2026-11-03: 83 Node tests, 33 Chrome component/capture tests, and both type checks passed; 118 Git candidate files audited; 68 package files checked. Checked means the stated task is complete; partial coverage stays unchecked. Initial Git commit and public release are separate milestones. Do not publish, select a license, or bump the version without the user's direction.

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

  Already covered: README documentation index, overview, specification, design guide, troubleshooting, and manifest requirement `paseo >=0.14.0`. Added installation/development instructions, Unreleased changelog, consolidated limitations and user-selected MIT license. Clean production-only copy loaded successfully on Paseo 0.14.0 with an isolated runtime ID; no Jira credentials or mappings copied. Managed Git installation and rendered first-run settings verified on Paseo 0.15.0 at merged main `f67eea528327773ece1da72d8c5d6ededcfe7634`; see `docs/TESTING.md`. Version remains 0.1.0; package remains private.

## Worthwhile product improvements

- [ ] **Remember dashboard filters:** restore the selected sprint, search, and mobile column when returning from a workspace.

  Selected ticket, panel width, and collapse state already survive dashboard navigation per host. Sprint/search/column are still component-local. App/plugin restart retention is a separate decision.

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
- [x] Move historical MCP prototype SDK out of production dependencies.
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
- [ ] Finalize release notes and obtain direction to make the repository public and submit it.

- [x] Refresh README for discovery: dashboard screenshot near the top, main capabilities, setup path, details preview and absolute documentation links for registry/npm readers. Remote assets become anonymously accessible after these changes reach main and the repository is public.

## Credential-handling audit (2026-11-03)

- [x] Audit runtime credential flow without reading actual credentials or contacting Jira Cloud; document findings in `docs/CREDENTIAL_SECURITY.md`.
- [x] Harden descriptor-based file reads, shorten session credential lifetime, remove unused credential-keyed state, normalize cache isolation and sanitize workflow errors.
- [x] Verify with synthetic credential regression tests: all 89 Node tests and both type checks pass. Actual-token secret scan intentionally not run under the no-secret-read constraint.
- [ ] Obtain the separate Atlassian distribution clarification; security hardening does not establish policy approval.

## TWG CLI alternative — experimental branch

- [x] Start an isolated host-side TWG adapter with bounded process execution, safe errors, cancellation and synthetic tests. See `docs/TWG_IMPLEMENTATION.md`.
- [ ] Verify supported CLI contracts, OAuth setup/storage, site/profile binding and full dashboard parity before enabling the alternative in Settings. This foundation does not close the authentication distribution gate.

- [x] Add experimental TWG Settings login/access actions with host job polling, cancellation and safe errors; verified with 10 focused Node tests and 3 mocked desktop/mobile browser tests (2026-11-04). Real CLI compatibility and dashboard data adapters remain pending.
