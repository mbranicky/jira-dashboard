<!-- CHECKLIST INSTRUCTIONS
IMPORTANT: When working on items in this checklist, you MUST check off each item
(change `- [ ]` to `- [x]`) AS SOON AS it is implemented/completed.
Do not wait until the end — check off each item immediately after finishing it.
This file is the source of truth for tracking progress.
-->
# Jira Dashboard first-version checklist

Baseline reviewed 2026-11-03: 83 Node tests, 16 Chrome component tests, and both type checks passed; 107 Git candidate files audited; 62 package files checked. Checked means the stated task is complete; partial coverage stays unchecked. Initial Git commit and public release are separate milestones. Do not publish, select a license, or bump the version without the user's direction.

## Before first version

- [ ] **Setup guide** — Token creation, complete scopes, `jira.env`, board configuration, project mappings, and entry-skill examples.

  Already covered: `docs/JIRA_SETUP.md` contains the 27-scope checklist, secret-file permissions, token replacement, endpoint references, troubleshooting, attachment limits, and caching. `OVERVIEW.md` describes mappings and skills. Added `docs/GETTING_STARTED.md` with the complete walkthrough and provider/model/mode/isolation setup; corrected outdated attachment wording. Remaining: reviewed setup screenshots. Existing scope references were not re-verified against Atlassian during this audit.

- [x] **Connection check** — A “Test connection” action that identifies authentication, permissions, and board-access problems clearly.

  Completed: Test connection checks unsaved URL/file values with fresh read-only authentication, board, sprint and search requests; identifies the failing step, and explicitly reports skipped sprint reads. Four backend tests and two browser tests cover success, failure, freshness and unsaved values. It does not validate write/comment/attachment privileges.

- [x] **Automated UI tests** — Cover settings, modal/panel selection, resize/collapse, navigation persistence, and mobile layouts. Unit tests alone won’t catch the visual regressions we’ve encountered.

  Completed 2026-11-03: 16 Chrome browser tests pass. Cypress component tests mount the real React Native Web dashboard/settings with isolated, schema-validated fixture boundaries. See `docs/TESTING.md`.

  - [x] Add isolated browser harness, scripts, test type checking, and fail-closed RPC fixtures.
  - [x] Verify settings validation, save failures, single success message, provider/model dependencies, and appearance selection.
  - [x] Verify loading/error states, search, sprint overlay, tag expansion, column scrolling, and modal Escape dismissal.
  - [x] Verify real panel dragging, resize cursor, collapse/expand, width/selection retention after navigation, and draft/scroll preservation.
  - [x] Verify 390 px full-screen details, fixed close control, field access, stacked settings, and overlay presets.
  - [x] Finish the complete suite run including 320 px light-theme and cross-ticket draft retention; capture review screenshots.

  Separate remaining gates: approved pixel-diff baselines, actual Paseo host widget/navigation smoke tests, and physical-device testing. Screenshot capture alone is not visual regression comparison.

- [ ] **Workflow regression tests** — Verify branch/worktree reuse, archived workspaces, duplicate-click protection, failed transitions, required fields, comments, and attachments.

  Already covered: Node test runner with mocked Jira/Paseo operations and real temporary Git repositories. Tests cover branch reuse and ambiguity, checked-out source branch, archived links, repeated starts, uncertain prompt delivery, transition failures and sequencing, field encoding, linked replies and restrictions, duplicate comment/upload submission, attachment validation, and loopback image previews. Concurrent starts are already covered; a new agent-creation failure/retry test confirms workspace reuse and a single successful skill prompt. Remaining: rendered end-to-end workflows.

- [x] **Public-repository audit** — Ensure tokens, `.local`, logs, screenshots containing private information, and company-specific defaults cannot enter Git.

  Completed point-in-time pre-Git audit: see `docs/SECRET_AUDIT.md`. Added defensive ignore rules and repeatable `npm run audit:secrets`; removed company-specific default and sanitized public examples. This does not make future secret commits impossible: repeat the audit and inspect the actual staged files before committing.

- [x] **CI checks** — Run type checking and tests on every push and pull request; validate the plugin’s distributable contents.

  Already covered: local `typecheck`, `test`, `audit:secrets` commands and npm package allowlist. Added GitHub Actions for both type checks, Node tests, Chrome component tests, secret scan and package-content checks. Local checks and GitHub Actions run `41613924655` on initial commit `8bd3820` pass, including a clean npm install and all 16 browser tests.

- [ ] **Release documentation** — README, license, changelog, supported Paseo version, known limitations, and a short troubleshooting guide.

  Already covered: README documentation index, overview, specification, design guide, troubleshooting, and manifest requirement `paseo >=0.14.0`. Added installation/development instructions, Unreleased changelog, consolidated limitations and user-selected MIT license. Remaining: clean-install smoke test against supported Paseo. Version remains 0.1.0; package remains private.

## Worthwhile product improvements

- [ ] **Remember dashboard filters:** restore the selected sprint, search, and mobile column when returning from a workspace.

  Selected ticket, panel width, and collapse state already survive dashboard navigation per host. Sprint/search/column are still component-local. App/plugin restart retention is a separate decision.

- [ ] **Protect unfinished comments:** warn before switching tickets or closing details when a comment draft would be lost.

  Code inspection found existing host/issue-scoped comment draft storage. The browser suite verifies retention through collapse, ticket switching, and navigation. Restart still clears session drafts; no explicit unsaved-draft warning exists.

- [ ] **Clear partial-failure recovery:** if a workspace is created but agent startup fails, offer a retry that reuses the workspace.

  Existing state recovery and partial-label failure tests provide a base. The explicit failed agent-start test passes. Remaining: verify the recovery UI without creating duplicate workspaces or resending an uncertain skill prompt.

- [x] **Manual setup checklist:** `docs/GETTING_STARTED.md` guides first-time users through connection → board → mapping → first workspace.

## Initial Git checkpoint

- [x] Audit current Git candidates and package contents without initializing the project repository.
- [x] Choose repository name, hosting, public/private visibility, and license with the user: private `mbranicky/jira-dashboard`, MIT.
- [x] Initialize Git, review the actual staged file list and diff, repeat secret audit, and make the initial commit: `8bd3820`.
- [x] Add remote and push: private `https://github.com/mbranicky/jira-dashboard`, branch `main`. No tag, release or npm publication.
- [ ] Complete the release gates above before tagging or publishing a first public release.

## Dependency audit

2026-11-03: npm audit reports 12 moderate findings through the React Native development-tool dependency tree, no high/critical findings. Suggested automatic remediation replaces the host-aligned React Native version; review compatibility before changing it. Not a clean security audit or public-release approval.
