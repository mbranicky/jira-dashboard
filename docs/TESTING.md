# Testing Jira Dashboard

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

## Verified baseline

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

## Production installation smoke test

On 2026-11-03, copied tracked source into a temporary directory without node_modules, credentials or settings and executed the manifest preparation (`npm ci --omit=dev --ignore-scripts`). It installed 11 packages, reported no production vulnerabilities, and imported `@getpaseo/client/node` successfully. The prototype MCP SDK and Cypress were absent. Paseo 0.14.0 loaded the prepared directory under an isolated runtime ID and reported running; the temporary registration was then removed.

This verifies production dependency installation and host loading. It does not yet verify managed Git acquisition at the final release revision, actual rendered clean-install client interactions. Those remain release gates. Real Jira writes are explicitly excluded from automated verification and are not a release requirement. Development dependency audit findings are tracked separately.

## Paseo 0.15.0 compatibility

Verified 2026-11-03: installed app, daemon and CLI all report 0.15.0. In an isolated source copy, install the locked development dependencies, then run `npm install --no-save --ignore-scripts @getpaseo/plugin@0.15.0 @getpaseo/client@0.15.0`. Both type checks, 83 Node tests, 16 Chrome component tests, secret scan and package validation pass. The original checkout retains its locked 0.14.0 SDK/client baseline. CI runs both configurations independently.

The isolated target-SDK copy also loaded as a temporary plugin on the 0.15.0 daemon with status running, then its registration was removed. Live read-only checks on Paseo 0.15.0 confirmed dashboard data, settings, and the dashboard issue panel with comments and attachment controls. These checks do not cover real write operations, agent startup, physical mobile devices or every workflow. The manifest minimum remains 0.14.0; the tested host versions are 0.14.0 and 0.15.0, not a claim about future versions.

## Release preview and start recovery coverage

Three registry capture tests render synthetic dashboard, details, settings and mobile views. Reviewed public copies live in assets/ and are packaged via manifest media. Replacements require visual review and an updated exact digest in the secret audit. They are not pixel-diff baselines.

Three additional browser tests cover branch selection in a separate modal, retry after agent-start failure, and uncertain prompt delivery without offering an unsafe retry. Backend tests independently verify workspace reuse and no duplicate prompt. The current 33-test suite uses mocked service boundaries; no live workspace is created.

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
