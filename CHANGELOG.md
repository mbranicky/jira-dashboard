# Changelog

## 1.2.0

- Show read-only linked workspace and agent activity on cards and in issue details, with attention filters for work needing input, running, finished or failed. Save these filters in board views.
- Add card actions for copying issue keys and Jira links, opening Jira, and navigating to linked workspaces.
- Browse previous/next issues in filtered board order, retaining issue-specific drafts and restoring focus. Mobile navigation uses a column picker with counts and previous/next controls.
- Combine display controls in Settings → Dashboard appearance: card spacing, desktop column width, parent/tag visibility and a live preview. Device-local preferences apply immediately, with an explicit session-only fallback when durable storage is unavailable.
- Simplify the toolbar with tooltip-labeled Filters and Views beside search, right-aligned filter options, and immediate checkbox selection.
- Add priority-colored pills, matching icons and slim card borders. Use lighter dashboard typography, compact action buttons, labeled Start work in details and reduced-motion-aware feedback.
- Refresh dashboard, detail, mobile and connection screenshots and add an appearance settings preview.

REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain included. Paseo requirements remain `>=0.14.0 <0.16.0`. Host support and MCP upload limitations are unchanged; no live Jira write testing was performed.

## 1.1.0

- Filter sprint issues by label, priority, issue type, parent and fix version with searchable multi-select menus. Save named filter/search views per board.
- Save and switch between boards on the same Jira site while retaining connection settings, project mappings and per-board sprint/search state.
- Show related issues and subtasks with relationship labels, statuses and compact Jira links.
- Navigate the desktop board with J/K, focus search with /, and open the focused issue with Enter. Shortcuts do not intercept editors or dialogs.
- Retain private comment and linked-reply drafts on this device, scoped to the host, Jira site, verified account and issue. Desktop/browser storage survives reloads; native mobile clients retain drafts only for the session. Uncertain delivery stays protected against accidental reposting.
- Refresh plugin and board-header icons; add section icons and accessible action tooltips. Compact controls and removable filter chips reduce header height, with responsive toolbar wrapping on smaller screens.

REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain supported. Host coverage and MCP upload limitations are unchanged: macOS Apple silicon is verified, Ubuntu has automated coverage, other hosts remain unverified, and MCP uploads have mock-only verification.

## 1.0.0

First release under the display name **Jira Sprint Workspace**. The Paseo installation ID and npm package name are both `paseo-jira-sprint-workspace`. Existing development installations used `jira-dashboard`. See the [upgrade instructions](docs/GETTING_STARTED.md#updating-from-the-development-id).

- Connect to Jira Cloud through REST, Teamwork Graph CLI OAuth, or Atlassian MCP OAuth. Test board access before saving, and opt in to Jira changes when using either OAuth connection.
- Browse assigned issues by sprint, search by key or title, and return to the same search and mobile column after visiting a workspace.
- Create or reuse issue workspaces and agents with project-specific settings and an optional entry skill. Open matching manually created workspaces from the board.
- Read rich issue details in a modal, side panel or workspace tab. Post Markdown comments and linked replies, preview or download attachments, and upload files on supported clients. If comment delivery is uncertain, refresh the comments beside the retained draft before deciding whether to retry.
- Drag cards to request Jira workflow transitions. Review required fields and optionally start work after a successful move.

The verified Paseo host is macOS on Apple silicon. Linux has automated test coverage on Ubuntu. Windows and Intel Mac hosts are unverified. MCP attachment preview and download were verified on the Mac host. MCP uploads have been tested only with simulated responses. See [known limitations](docs/KNOWN_LIMITATIONS.md) for upload recovery and host credential storage.
