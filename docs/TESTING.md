# Testing Jira Dashboard

## Commands

Use Node 24 (the UI toolchain requires at least Node 22.12) and install dependencies with `npm ci`. Cypress downloads its test runner during installation. Install Google Chrome for the native pointer/keyboard tests.

```sh
npm run typecheck
npm run typecheck:ui
npm test
npm run test:ui
npm run audit:secrets
npm run check:package
```

`npm run test:ui:open` opens Cypress component mode for interactive debugging. Choose Chrome. Run a specific spec with `npm run test:ui -- --spec cypress/component/dashboard.cy.tsx`. Tests do not require Paseo to run, a Jira account, or a `jira.env` file.

## Layers and boundaries

The Node test suite exercises domain behavior, RPC input/output rules, mocked Jira/Paseo operations, real temporary Git repositories, and a local attachment preview server. These are unit and integration tests, not browser tests.

The Cypress component suite mounts the actual `Dashboard` and all its child components using React Native Web and React Query in Chrome. Test-only aliases replace the unavailable Paseo host hooks, icons, and desktop settings select. The settings adapter validates values with the real settings schema and JSON serialization rules. RPC responses pass through the real input/output schemas and go through a fixture-only HTTP route intercepted by Cypress. Unexpected RPCs fail; external HTTPS requests fail. Fixture data is synthetic. No Jira writes, agent launches, real attachments, or credential reads occur.

The suite uses real browser pointer/keyboard events for divider dragging and Escape dismissal. Network release gates and retryable assertions replace fixed sleep delays. Each mount has a new host identity, fixture settings, and query cache, so tests do not depend on another test's state. Workspace navigation is simulated by unmounting/remounting the dashboard under the same host.

## Verified baseline

On 2026-11-03, all 16 Cypress tests passed in Chrome 156 with Cypress 16.2.0 and Node 24.16.0. All 83 Node tests, both type checks, and the secret audit passed. GitHub Actions also passed the complete suite on Linux in run `41613924655` for initial commit `8bd3820`. The suite identified and fixed divider responder capture (an inner Pressable could steal dragging) and an absent web `aria-checked` attribute on the appearance selector.

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

Host icons are represented by simple placeholders and desktop `SettingsSelect` by a semantic select. The suite does not verify Paseo's own widgets, native Explorer tabs, actual application navigation, iOS/Android rendering, real Jira permissions, or credential setup. Compact tests are browser viewport tests, not physical-device tests. A native Paseo smoke test and physical-phone review remain release gates. GitHub Actions runs these checks on pushes and pull requests. Reviewed visual-diff baselines remain separate checklist work.

Do not weaken assertions to make failures pass. First distinguish fixture/harness mismatches from production bugs. Keep new stable `testID`s limited to otherwise unnamed layout regions such as scroll areas; use accessible names for controls.
