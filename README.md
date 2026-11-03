# Jira Dashboard

A Paseo plugin for viewing assigned Jira Cloud sprint issues, opening workspace-specific Jira details, and creating linked workspaces and agents from issues.

## Install and configure

Start with the [first-time walkthrough](docs/GETTING_STARTED.md). Requires Paseo 0.14.0 or newer and a Jira Cloud scoped API token. This private development checkout is not yet published to npm or the Paseo registry.

## First-version readiness

- [First-version checklist](.claude/plans/first-version-checklist.md): completed coverage and remaining release gates.
- [Pre-Git secret audit](docs/SECRET_AUDIT.md): findings, protections, and limitations.
- Run `npm run audit:secrets` before committing; it never prints matching credential values.

## Development tests

See [Testing](docs/TESTING.md) for unit/integration and browser UI tests. Run `npm run test:ui` for the fixture-backed dashboard/settings suite; no Jira credentials are required.

## Documentation

- [Plugin overview](OVERVIEW.md): capabilities and current limitations.
- [Jira connection setup and token scopes](docs/JIRA_SETUP.md): required setup, complete scope checklists, private credentials and token replacement. Start here before connecting Jira.
- [Product specification](SPECIFICATION.md): agreed behavior and implementation status.
- [Design guide](DESIGN.md): dashboard, settings and workspace-panel interactions.

The plugin is currently private and under active development. Comments and linked replies are supported in issue details. Attachment lists, image previews, downloads and explicit uploads are available in the modal and Jira side panel. See the setup guide for client support and transfer limits.

## Project

Licensed under [MIT](LICENSE). See [Changelog](CHANGELOG.md) and [Known limitations](docs/KNOWN_LIMITATIONS.md). GitHub Actions runs domain tests, browser tests, type checks, secret scanning and package-content validation.
