# Jira Dashboard

Turn your assigned Jira sprint issues into Paseo workspaces. Browse your board, read issue details, and start an agent on an issue without leaving Paseo.

![Jira Dashboard showing assigned issues in Open, In Progress and Done columns, with Start work and Open workspace actions](assets/dashboard.png)

*Browser preview of the plugin's real components using fictional issues. Paseo host controls may differ.*

**Status:** Preparing the first public release. Version 0.1.0 is a private development checkpoint; no npm package or Paseo registry release is available yet.

## What you can do

- **Follow your sprint.** See issues assigned to you in the columns configured on your Jira board. Follow the active sprint, select a future sprint, search issues, and refresh automatically.
- **Start work from an issue.** Play creates or reuses an issue-named workspace and agent in the mapped Paseo project. Existing branches and worktrees are reused; multiple matches open a choice dialog.
- **Choose how the agent starts.** Configure a provider, model, mode and workspace isolation per Jira project. Optionally send an entry skill such as `/init-issue DEMO-123`, or leave it blank to open an agent without an initial prompt.
- **Keep Jira details close.** Open details in a modal or resizable dashboard side panel. Each workspace can also show its relevant issue in a dedicated **Jira** tab, detected from its workspace or agent name.
- **Discuss and share files.** Read comments, compose Markdown with preview, post linked replies, view attachments, preview images, and upload files on supported clients.
- **Move issues through their workflow.** Drag a card between columns. Jira determines allowed transitions; supported required fields appear in a dialog. A successful move into a configured column can also start work.

**Play does not change Jira status.** Dragging between columns requests a Jira transition. Changes made directly in Jira never launch an agent.

## A closer look

The dashboard details panel stays beside the board and remembers its selection, width and collapsed state during the client session.

![Jira issue description in the resizable dashboard side panel](assets/details.png)

On narrow screens, details fill the screen with a fixed header and scrollable content. Description, attachments and comments collapse independently.

[View the mobile preview](assets/mobile.png) · [View settings](assets/settings.png)

## Get started

Requires **Paseo 0.14.0 or newer**, Jira Cloud, and either a scoped Jira API token or the experimental TWG CLI OAuth connection. Compatibility has been checked with Paseo 0.14.0 and 0.15.0. Use Node 24 and npm on the daemon host; Git is required for worktree isolation.

Until publication, install from an accessible checkout:

```sh
git clone https://github.com/mbranicky/jira-dashboard.git
cd jira-dashboard
npm ci
npm run typecheck
paseo plugin install "$PWD"
```

The repository is currently private, so cloning requires access. No registry installation command is advertised before the release exists.

1. Open **Jira Dashboard → Settings**.
2. Enter your Jira board URL and the absolute path to a private `jira.env` file on the Paseo host. Follow the [token and scope guide](https://github.com/mbranicky/jira-dashboard/blob/main/docs/JIRA_SETUP.md).
   Alternatively, enable **TWG CLI · experimental** and follow the [TWG setup guide](docs/TWG_SETUP.md). No API token file is needed for TWG.
3. Test and save the connection.
4. Map each Jira project key to an existing Paseo project, choose the agent settings, and optionally name an entry skill.
5. Open an issue to inspect its details, or use Play to start work.

See the [complete first-time walkthrough](https://github.com/mbranicky/jira-dashboard/blob/main/docs/GETTING_STARTED.md) for setup screenshots, branch reuse, labels and updates.

## Credentials and limits

Your API token stays in a private file on the daemon host and is sent to Atlassian for authentication. The plugin does not send the token to agents or require a hosted authentication service. Clients connected to that Paseo host share the token owner's Jira access. An entry skill runs through your selected agent provider and may access additional data according to your configuration.

TWG owns its OAuth credentials; the plugin does not read its credential files or extract tokens. TWG supports dashboard/details reads and local Start work. Jira changes are off by default; enable them explicitly for workflow moves, comments/replies and uploads. See the TWG setup guide for CLI-specific limitations.

One Jira Cloud site is supported per host. Replies are new top-level comments linked to the original, rather than native threaded replies. Attachment transfers are limited to 25 MiB and Jira's upload limit; native mobile clients have file-picker limitations. Comment drafts are retained during the session, but not across an app/plugin restart.

See [known limitations](https://github.com/mbranicky/jira-dashboard/blob/main/docs/KNOWN_LIMITATIONS.md) and [connection troubleshooting](https://github.com/mbranicky/jira-dashboard/blob/main/docs/JIRA_SETUP.md#troubleshooting-and-verification). The [authentication policy review](https://github.com/mbranicky/jira-dashboard/blob/main/docs/ATLASSIAN_AUTH_POLICY.md) records why public-distribution clearance for the local-token approach is not yet established and what clarification is needed.

See the [credential security audit](https://github.com/mbranicky/jira-dashboard/blob/main/docs/CREDENTIAL_SECURITY.md) for host-side handling and its limits.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Getting started](https://github.com/mbranicky/jira-dashboard/blob/main/docs/GETTING_STARTED.md) | Installation, Jira connection, project mappings and first workspace |
| [Jira setup and scopes](https://github.com/mbranicky/jira-dashboard/blob/main/docs/JIRA_SETUP.md) | Complete token scopes, permissions, credentials and troubleshooting |
| [Known limitations](https://github.com/mbranicky/jira-dashboard/blob/main/docs/KNOWN_LIMITATIONS.md) | Supported clients and current boundaries |
| [Testing](https://github.com/mbranicky/jira-dashboard/blob/main/docs/TESTING.md) | Unit, integration and browser workflow tests using synthetic data |
| [Specification](https://github.com/mbranicky/jira-dashboard/blob/main/SPECIFICATION.md) · [Design](https://github.com/mbranicky/jira-dashboard/blob/main/DESIGN.md) | Behavior and interface decisions |
| [Changelog](https://github.com/mbranicky/jira-dashboard/blob/main/CHANGELOG.md) | Release history |
| [First-version checklist](https://github.com/mbranicky/jira-dashboard/blob/main/.claude/plans/first-version-checklist.md) · [Security review](https://github.com/mbranicky/jira-dashboard/blob/main/docs/SECRET_AUDIT.md) | Release readiness and audit evidence |

## Development

```sh
npm ci
npm run check
npm run test:ui
```

Browser tests require Google Chrome. Automated workflow tests use mocked Jira/Paseo services, require no credentials, and never connect to Jira Cloud or launch real agents. CI also checks Paseo 0.15 compatibility and scans Git history for secrets. See the testing guide for details.

Licensed under [MIT](https://github.com/mbranicky/jira-dashboard/blob/main/LICENSE). This is an independent plugin, not an Atlassian product.
