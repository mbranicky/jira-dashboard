# Testing Jira Sprint Workspace

## 1.2.1 patch verification — 2026-11-09

Verified on macOS Apple silicon with Node 24.16.0 and Paseo app/daemon 0.15.3. The package, shrinkwrap root and MCP handshake identify 1.2.1. All three connection methods and the supported Paseo range are unchanged.

- Both baseline typechecks, 304 Node tests, 201 Chrome tests, 15 publishing-verifier tests, source audit and package-content checks passed.
- Both typechecks also passed in an isolated copy with exact Paseo plugin/client SDK 0.15.3; the working checkout retains its locked 0.14.0 baseline. CI additionally retains lightweight 0.15.0 typechecks and full 0.15.2 coverage.
- Corner regressions cover nested surface/control values, centralized tokens, light/dark themes, desktop/mobile and REST/TWG/MCP fixtures. Compact spacing, independent nested actions and pointer/keyboard feedback remain covered.
- Five synthetic public screenshots were regenerated and reviewed. No private board data is included.
- The extracted tarball completed both manifest build commands with production dependencies only and zero reported production audit vulnerabilities. The isolated, loopback-only Paseo 0.15.3 host loaded and reloaded it successfully; Jira Workspace opened its appearance/first-run settings and displayed all three connection choices in the actual host UI.

This is mocked Jira behavior plus unconfigured host activation/UI evidence, not live Jira write verification. The user's active installation and connection settings were preserved. The final digest is retained outside packaged contents; publication and exact-main evidence belong in the GitHub release notes.

## 1.1.0 candidate verification — 2026-11-07

Prepared on `codex/release-1-1-0` from merged main `3956ad8`, on macOS Apple silicon. Package, shrinkwrap and MCP client metadata all identify version 1.1.0. REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain included.

- `npm run check`: both typechecks, 296 Node tests, source heuristic audit and package validation passed.
- `python3 -B scripts/test_npm_release.py`: 14 release-script tests passed.
- `npm run test:ui`: all 143 Chrome component/capture tests passed, using mocks.
- The clean extracted npm package completed both manifest build commands: `npm ci --omit=dev --ignore-scripts` and `node scripts/prepare-native.mjs`. Installation reported zero dependency vulnerabilities.
- Desktop, detail, mobile and settings screenshots were regenerated with synthetic data and visually reviewed. The settings capture remains byte-identical to the previous approved image; the other three show the updated interface.

The final tarball checksum is recorded outside packaged files in the release checklist and beside the retained artifact. This checkpoint does not establish a new isolated-host runtime test, live Jira write coverage, or additional platform support. The earlier 1.0.0 host test below remains historical evidence. No tag or publication was performed; preparation PR checks and final merged-main verification remain release gates.

## Apple silicon npm tarball test

On 6 November 2026, we packed `paseo-jira-sprint-workspace@1.0.0` from clean `main` at `8ae5eb1`. The candidate tarball had SHA-256 `f69cbb069b35f8e0e74086a15bc527bd2b5be23657f639506a2572bf109ef227`.

On macOS arm64 with Node 24.16.0, the extracted package completed both manifest build steps (`npm ci --omit=dev --ignore-scripts` and `node scripts/prepare-native.mjs`). An isolated, loopback-only Paseo 0.15.2 host loaded the extracted directory and reported the plugin running. In the host’s browser UI, selecting **Jira Workspace** opened the first-run settings. The connection menu offered all three methods.

We then instrumented the temporary installation with mock HTTP responses, a mock TWG executable and mock MCP credential storage. We called the plugin’s read-only connection RPCs on the running host. Each verified a synthetic identity, board, sprint, one assigned issue and independent issue search.

| Connection method | Connection check | Additional coverage |
| --- | --- | --- |
| REST API | 8 of 8 steps passed | Owner-only fixture credential file and site lookup |
| Teamwork Graph CLI | 7 of 7 steps passed | CLI profile support and reads through the fixture executable |
| Atlassian MCP | 7 of 7 steps passed | Saved fixture session and read-tool catalogue |

The UI check preceded instrumentation. The adapter checks used synthetic credentials and exercised neither live OAuth consent nor live Jira writes. The host and fixtures were removed after the test. Installation by name from the public npm registry remains a separate post-publication check.

## Full verification checkpoint — 2026-11-05

Verified the current accumulated `codex/mcp-v2-oauth` working tree, including MCP transition destination resolution and the darker drag-hover tint. No commit, version bump, publication or live Jira write was performed.

| Check | Locked Paseo 0.14 SDK | Isolated Paseo 0.15 SDK |
| --- | --- | --- |
| Source and UI typechecks | Passed | Passed |
| Backend tests | 277 passed | 277 passed |
| Chrome component tests | 109 passed, 13 specs | 109 passed, 13 specs |
| Source heuristic audit | Passed | Passed |
| Package contents | 118 files, passed | 118 files, passed |

Gitleaks 8.30.1 scanned all 26 Git commits and current Git candidate files with no remaining findings. Three curl authorization-header matches were literal synthetic upload-parser fixtures; only those exact lines were annotated `gitleaks:allow`, with an explanation. No broad scanner exclusion was added. Current `npm audit` reports zero known vulnerabilities, including development dependencies; this supersedes the earlier dependency finding count for this checkpoint only.

A separate clean copy ran the manifest's production installation and native preparation: 109 packages installed, zero reported vulnerabilities. Paseo client, MCP SDK and native keyring imports succeeded without credential-entry access. The unconfigured copy loaded in Paseo as temporary `jira-dashboard-verification` and reported running; its registration was removed afterward. The original configured dashboard remained running. This verifies local macOS installation/loading, not Windows/Linux credential stores or new OAuth consent. No credentials/settings were copied.

Representative generated light/mobile search and dark/desktop MCP settings screenshots were visually inspected. Browser tests remain mocked component workflows, not real Jira/device end-to-end tests. MCP upload preparation/media output variants remain partly unverified; no successful live transition or upload is established by these tests. Temporary contract diagnostics were subsequently removed; see the follow-up below. The older records below describe their own revisions and must not be substituted for these results.

## Commands

Use Node 24 (the UI toolchain requires at least Node 22.12) and install dependencies with `npm ci`. Cypress downloads its test runner during installation. Install Google Chrome for the native pointer/keyboard tests.

```sh
npm run typecheck
npm run typecheck:ui
npm test
npm run test:ui
npm run audit:secrets
npm run audit:history # requires Gitleaks 8.30.1
npm run check:package
```

`npm run test:ui:open` opens Cypress component mode for interactive debugging. Choose Chrome. Run a specific spec with `npm run test:ui -- --spec cypress/component/dashboard.cy.tsx`. Tests do not require Paseo to run, a Jira account, or a `jira.env` file.

## Layers and boundaries

The Node test suite exercises domain behavior, RPC input/output rules, mocked Jira/Paseo operations, real temporary Git repositories, and a local attachment preview server. These are unit and integration tests, not browser tests.

The Cypress component suite mounts the actual `Dashboard` and all its child components using React Native Web and React Query in Chrome. Test-only aliases replace the unavailable Paseo host hooks, icons, and desktop settings select. The settings adapter validates values with the real settings schema and JSON serialization rules. RPC responses pass through the real input/output schemas and go through a fixture-only HTTP route intercepted by Cypress. Unexpected RPCs fail; external HTTPS requests fail. Fixture data is synthetic. No Jira writes, agent launches, real attachments, or credential reads occur.

The suite uses real browser pointer/keyboard events for divider dragging and Escape dismissal. Network release gates and retryable assertions replace fixed sleep delays. Each mount has a new host identity, fixture settings, and query cache, so tests do not depend on another test's state. Workspace navigation is simulated by unmounting/remounting the dashboard under the same host.

## Historical verified baseline (2026-11-03)

On 2026-11-03, all 33 Cypress tests passed in Chrome 156 with Cypress 16.2.0 and Node 24.16.0. All 83 Node tests, both type checks, and the secret audit passed. GitHub Actions previously passed the then-current 16-test browser suite on Linux in run `41613924655` for initial commit `8bd3820`. The suite identified and fixed divider responder capture (an inner Pressable could steal dragging) and an absent web `aria-checked` attribute on the appearance selector.

## Covered behavior

- Initial column placeholders and loading indicator; background refresh retains cards; failed reads show errors.
- Search/clear, sprint overlay placement and closed-sprint exclusion, independent tag expansion, long-column scrolling.
- Modal open/close and Escape dismissal after the modal becomes active.
- Panel resizing with a real drag; resize cursor; collapse/expand, remembered width/selection after navigation, ticket switching, scroll preservation, and draft retention.
- Mapping errors appear only after Save; required fields; provider-dependent models reset on provider change; save and remove/add cycles show one success message.
- Read-only connection diagnostics for unsaved values, failure-step messages, and stale-result clearing.
- Modal/panel appearance choice, refresh interval validation/persistence, visible save errors with values retained.
- 390 px mobile layout: stacked settings, collapsible mappings, overlay presets without layout shift, full-screen details, fixed close control, and scrolling to Jira fields.
- 320 px light-theme details: full-width layout and no horizontal overflow.

## Screenshots and limitations

Screenshots are written to ignored `test-results/ui/`. Successful tests capture desktop panel and mobile views; failures capture their current state automatically. These are inspection artifacts, not approved pixel-diff baselines. Geometry/visibility assertions catch specific regressions, but cannot judge all visual quality.

Host icons use Lucide components; desktop `SettingsSelect` uses a semantic select. The suite does not verify Paseo's own widgets, native Explorer tabs, actual application navigation, iOS/Android rendering, real Jira permissions, or credential setup. Compact tests are browser viewport tests, not physical-device tests. Native Paseo checks are recorded below. The user completed the physical-phone review with no issues reported; automated viewport tests remain distinct from that review. GitHub Actions runs these checks on pushes and pull requests. Reviewed visual-diff baselines remain separate checklist work.

Do not weaken assertions to make failures pass. First distinguish fixture/harness mismatches from production bugs. Keep new stable `testID`s limited to otherwise unnamed layout regions such as scroll areas; use accessible names for controls.

## Historical production installation smoke test (2026-11-03)

On 2026-11-03, copied tracked source into a temporary directory without node_modules, credentials or settings and executed the manifest preparation (`npm ci --omit=dev --ignore-scripts`). It installed 11 packages, reported no production vulnerabilities, and imported `@getpaseo/client/node` successfully. The prototype MCP SDK and Cypress were absent. Paseo 0.14.0 loaded the prepared directory under an isolated runtime ID and reported running; the temporary registration was then removed.

This earlier directory check verified production dependency installation and host loading. The managed Git and first-run UI verification below completes the installation check for the merged revision. Real Jira writes are explicitly excluded from automated verification and are not a release requirement. Development dependency audit findings are tracked separately.

## Historical clean managed Git installation from merged main

Verified on 2026-11-03 with Paseo 0.15.0, using an isolated runtime ID:

```sh
paseo plugin install git:https://github.com/mbranicky/jira-dashboard.git \
  --ref f67eea528327773ece1da72d8c5d6ededcfe7634 \
  --id jira-dashboard-git-smoke --json
```

- Paseo cloned and prepared the exact merged main revision, then reported the plugin running from its managed checkout. Tracked source remained clean.
- Production Paseo client dependency was present; Cypress and the historical MCP SDK were absent. All four listing images were declared.
- No `.local` directory, Jira credentials or existing mappings were copied into the checkout.
- Opened the test runtime's actual dashboard surface in Paseo. First-run settings showed empty board URL and secret-file fields, disabled Test connection and Save connection actions, the default 60-second refresh interval, and no mapping rows.
- No connection action was invoked, Jira credentials supplied, Jira operation tested or agent launched. This is unconfigured installation evidence; authenticated workflows remain covered by mocks.
- Removed the temporary registration and managed checkout afterward. The original plugin remained running from the project folder. Repository visibility was reconfirmed PRIVATE.

Private Git acquisition initially failed because the daemon's Git credential helper did not use the existing GitHub CLI login. A temporary helper configuration scoped to this repository URL allowed the clone; it was removed after installation. No token was copied into the plugin. Private installations require Git authentication available to the Paseo host process.

Release-readiness PR #2 and merged-main checks passed. [Merged-main Actions run 41654410542](https://github.com/mbranicky/jira-dashboard/actions/runs/41654410542) passed both SDK configurations, including 83 Node tests and 33 browser tests, type checks, secret scanning and package validation. No version bump, tag, publication or registry submission was performed.

## Paseo 0.15.0 compatibility

Verified 2026-11-03: installed app, daemon and CLI all report 0.15.0. In an isolated source copy, install the locked development dependencies, then run `npm install --no-save --ignore-scripts @getpaseo/plugin@0.15.0 @getpaseo/client@0.15.0`. Both type checks, 83 Node tests, 16 Chrome component tests, secret scan and package validation pass. The original checkout retains its locked 0.14.0 SDK/client baseline. CI runs both configurations independently.

The isolated target-SDK copy also loaded as a temporary plugin on the 0.15.0 daemon with status running, then its registration was removed. Live read-only checks on Paseo 0.15.0 confirmed dashboard data, settings, and the dashboard issue panel with comments and attachment controls. These checks do not cover real write operations, agent startup, physical mobile devices or every workflow. The manifest minimum remains 0.14.0; the tested host versions are 0.14.0 and 0.15.0, not a claim about future versions.

## Release preview and start recovery coverage

Six registry capture tests render eight synthetic dashboard, details, settings, appearance, mobile, Filters, Manage boards and empty-selection views. Reviewed public copies live in assets/ and are packaged via manifest media. Replacements require visual review and an updated exact digest in the secret audit. They are not pixel-diff baselines.

Three additional browser tests cover branch selection in a separate modal, retry after agent-start failure, and uncertain prompt delivery without offering an unsafe retry. Backend tests independently verify workspace reuse and no duplicate prompt. That 33-test checkpoint used mocked service boundaries; no live workspace is created.

## Live verification record and phone review

On 2026-11-03, the Paseo 0.15.0 desktop app successfully opened an existing linked workspace, resolved its Jira tab, scrolled a long issue description to Jira fields, rendered an unsent Markdown comment preview, loaded an authenticated PNG preview, and retained the dashboard selection and collapsed panel across workspace navigation. The temporary comment draft was discarded; no Jira changes or agent turns were triggered. Existing comments displayed author and creation time. This is read-only live evidence, not verification of posting/uploading or new-workspace creation.

The nine settings/mobile browser tests were rerun successfully, and the 390 px dark and 320 px light captures were visually inspected. On 2026-11-03, the user reported checking the mobile Jira Dashboard and finding nothing suspicious. The mobile review is accepted as passed. Device, OS, orientation and per-step results were not supplied, so this does not establish exhaustive device coverage. Retain the following checklist for future phone reviews:

1. Open the dashboard, select a column with several issues, and scroll to the last card.
2. Open a long issue description. Check full-screen details, readable wrapping, and an accessible fixed close button while scrolling.
3. Scroll to Jira fields, attachments and comments. Collapse and expand each section; preview an existing image.
4. Open Add comment, type an unsent draft, and check that the software keyboard does not hide the editor or actions. Preview and discard the draft.
5. Open Settings. Check sprint/refresh choices, mapping expansion and provider/model dropdowns without horizontal overflow.
6. Return through a workspace to the dashboard. Check the selected issue and panel state are restored where applicable.
7. Report phone model, OS, Paseo client/browser, orientation, and the step of any failure. Avoid posting comments, uploading files or triggering work as part of this verification.


## Mocked workflow verification policy

All automated workflows use fictional issues and mocked Jira/Paseo services. Do not connect these tests to Jira Cloud, supply credentials, post to real issues, or launch real agents. Live Jira write tests are not required for release. Physical-phone review is performed separately by the user.

- `workflows.cy.tsx`: same-column drops make no workflow request; unavailable destinations retain the card; a validator error preserves entered fields for correction and successful retry. Comments cover Markdown preview/post/refetch, author and edited timestamp, explicit linked replies, and uncertain submission with draft retention and blocked duplicate posting.
- `attachments.cy.tsx`: the real browser file picker boundary is supplied a synthetic in-memory file; assert begin/chunk/finish payloads and refreshed listing. A failed chunk cancels the incomplete transfer. Preview renders mocked image bytes.
- `start-work.cy.tsx`: Play with/without an entry skill invokes start directly, without transition selection; branch choice stays in a modal; failure retries and uncertain prompt delivery remains guarded.
- Node tests independently verify transition-before-start sequencing, no start after a rejected transition, branch/worktree reuse, optional skill behavior, exact slash prompt, and resource/prompt deduplication. Browser RPC mocks do not by themselves prove those server behaviors.

These are browser component workflows plus backend unit/integration tests, not end-to-end tests against Jira. External HTTPS access and unexpected RPCs fail the browser suite.

## Credential regression coverage

The 2026-11-03 credential audit added six tests, bringing that checkpoint to 89 passing tests. `tests/credentials.test.ts` uses owner-only temporary synthetic files and injected transports for request authentication, rotation/removal, file restrictions and error redaction. `tests/metadata-cache.test.ts` covers equivalent header formats and credential isolation. No real secret file or Jira connection is needed. See [credential security](CREDENTIAL_SECURITY.md) for audit boundaries.

## Diagnostics reduction follow-up — 2026-11-05

After removing OAuth progress, response-shape and tool-catalogue logs, `npm run check` passed both typechecks, 278 backend tests, source audit and package validation. Only fixed, runtime-allowlisted failure codes can be logged; no payload is accepted. Regression coverage verifies quiet successful connection/catalogue discovery and rejects arbitrary events/payloads. Browser code did not change, so the 109-test browser results above remain the prior UI verification rather than a newly repeated run.

## Private comment drafts (7 November 2026)

Six Node tests verify persistence across fresh stores, reply/uncertainty restoration, host/site/account/issue isolation, failed storage and authenticated identity lookup through REST/TWG/MCP. Four browser tests cover all three transports, durable-storage content, uncertain delivery after reopening and account-change rejection without posting. Paseo 0.15.3/macOS arm64 restored an unsent synthetic draft after a plugin reload; the draft was then discarded without posting.

The current public Paseo documentation describes device-scoped settings, but the latest published SDK 0.15.3 still declares host-only settings. This implementation uses app/browser local storage with a visible session-only fallback on native clients or storage failure, preserving the current minimum host version. No private draft text is written to host settings. Native mobile persistence awaits a supported stable device-storage API.

The existing component suite passed its 111 non-registry tests with private drafts enabled. Registry preview fixtures needed the new identity-read response; their three tests passed after that fixture update. A fresh focused draft run also passed after preventing cached identity from restoring a draft until reverified.

An additional browser regression fills device storage immediately before submission and proves that no comment POST occurs. Desktop/browser posting requires a durable uncertainty marker; the draft remains available with a recovery message when writing that marker fails. The focused draft suite now has five passing tests.

CI exposed a delayed-identity remount while clicking Refresh comments on a compact REST fixture. Writable comments now wait for identity verification before rendering controls. A gated identity-response regression covers that boundary; the six draft tests and eight comment-layout tests pass together.
## Saved boards (7 November 2026)

Full `npm run check`, four Node regressions and five Chrome component tests pass. The three transport fixtures cover saving/switching boards, per-board search restoration and a return path; additional cases cover cross-site rejection, failed settings persistence and compact/light layout. Credentials/profile/write consent remain intact in all three configuration tests.

Paseo 0.15.3/macOS arm64 displayed the switcher and management form. A temporary bookmark for the current board was saved, visibly selected, then removed. No live Jira writes or live switch to another board was performed; switching and error paths use mocks.
## Board keyboard navigation (7 November 2026)

Full `npm run check` passes. Four Chrome component tests cover REST/TWG/MCP with mocked RPCs, navigation through filtered cards, search focus, Enter opening details, typing shortcut characters in a comment editor, and an open sprint menu. The initially read-only TWG/MCP fixtures were corrected to enable their mock comment editors.

Paseo 0.15.3/macOS arm64 loaded the feature. With focus on a board control, J focused an issue title and / focused the search input. Shortcuts are board-local and desktop/web-only; native clients retain normal touch navigation. No live Jira writes.
## Related issues (7 November 2026)

Four Node regressions verify direction, custom link labels, deduplication, missing/malformed fields and REST/TWG/MCP normalization. Four Chrome component tests exercise the three modes, compact/light rendering, unavailable fields and external navigation failure. Full `npm run check` passes.

Paseo 0.15.3/macOS arm64 loaded the feature and displayed three related issues with their Jira relationship labels and statuses in an issue detail dialog. This was a read-only smoke check; write operations were not performed. Adapter coverage uses mocks. Missing relationship fields produce an explicit incomplete-list message.
## Next-version quick filters (7 November 2026)

Shared filtering covers labels, priority, type, parent and fix version, with OR within a field and AND across fields. Saved views include literal key/title search, are stored per board in host settings, and are shared by clients of that host. Tests cover missing values after refresh, defaults for existing settings, all three connection modes, restoration after navigation, deletion, compact light-theme layout and save failure.

Paseo 0.15.3 on macOS arm64 loaded the updated plugin and displayed the new controls. Selecting a label reduced the board from 28 to 1 issue; clearing restored 28. No Jira writes were performed. Cross-transport behavior and save failure were exercised with mocked component RPCs, not live transport switching.

Screenshot refresh (2026-11-08): all four capture tests passed. Five PNGs were visually reviewed and copied into assets, including the new appearance settings preview. README, package media and reviewed digests reference the refreshed images. All data is synthetic; no live Jira writes or publication.

## 1.2.0 candidate verification — 2026-11-08

Prepared after UI/media PR #39 merged with all four checks green. Package, shrinkwrap root and MCP handshake report 1.2.0. All three connection methods and Paseo requirements are unchanged.

- Both typechecks, 302 Node tests, all 189 Chrome tests across 26 specs, source secret audit and 142-file package validation passed.
- The candidate tarball was extracted into a clean temporary directory on macOS Apple silicon. Both packaged manifest build commands passed; production installation reported zero vulnerabilities.
- Five synthetic screenshots were reviewed during PR #39. Browser workflows use mocks; no live Jira writes, physical mobile verification, or new host support claims.
- Release execution requires green PR and exact-main checks. Publication evidence belongs in the GitHub release and workflow logs. The exact tarball digest is recorded in the release checklist outside package contents; any subsequent packaged change requires rebuilding it.

## CI coverage

The required checks are **Build, tests & package · Paseo 0.14.0**, **SDK compatibility · Paseo 0.15.2**, and **Secret scan · source & history**. The baseline runs the locked SDK, release-tool tests, clean extracted package build, full checks and browser tests. Compatibility first runs both typechecks against exact 0.15.0 SDKs, restores locked dependencies, then runs the full suite against exact 0.15.2 SDKs. Gitleaks scans history and current source separately. The release verifier and main branch rules use these same three names.


## Screenshot refresh — 2026-11-12

Six mocked capture tests generated eight public PNGs. The refreshed details view shows the panel below the full-width toolbar. New captures cover Filters, Manage boards and the empty-selection state after a successful refresh. Captures were visually reviewed before copying to assets and updating the exact secret-audit digests. README links to the expanded visual tour. The five existing registry media entries remain in place; the three additional documentation images are included in the package. No private Jira data, live writes, version bump or publication.
