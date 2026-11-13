# Changelog

## 1.3.1

- Add a violet Test workspace label for Jira Test issues alongside the existing Story and Bug labels.
- Add a default-on **Label workspaces by issue type** toggle per mapping destination, covering Play and Start work on move. Disabling it preserves existing labels and the In Progress label.
- Align the labeling toggle with adjacent dropdowns using Paseo's shared settings row, and refresh public screenshots.

REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain included. Existing mappings default to enabled; Paseo requirements and host/upload limitations are unchanged. Jira writes remain mock-tested only.

## 1.3.0

- Map one Jira project to multiple Paseo projects, grouped in one Settings card with separate agent, skill and workspace preferences per destination.
- Choose the destination before Start work when several projects are mapped. Carry that choice through branch selection and workspace creation; open existing linked workspaces directly.
- Include destination selection in Start work on move. Reject missing, stale or unavailable destinations before a Jira transition, and keep existing active workspace links bound to their original project.
- Enable Save connection and Save mappings only when their respective settings differ from saved values. Reverting edits or saving successfully disables the button again; failed saves retain the draft for retry.

- Update locked Hono dependencies to compatible patched versions addressing dependency advisories.

Existing single-project mappings remain compatible. REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain included; Paseo requirements and host/upload limitations are unchanged. Jira writes are tested with mocks only.

## 1.2.2

- Open Filters and Manage boards in anchored popovers without shifting the board. Keep filter dropdowns together and actions on a separate row; prevent flicker when opening nested menus with Native Polish enabled.
- Dock issue details beside the columns below the full-width toolbar, keeping search and board controls accessible.
- Share Start work progress between cards and details, preventing duplicate starts and updating both actions together.
- Show “Nothing selected” in the open panel when a successful refresh removes the selected issue. Preserve selection during filtering or failed refreshes.
- Refresh public screenshots and add a visual tour covering filters, board management and empty selection.

REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain included. Paseo requirements remain `>=0.14.0 <0.16.0`; host coverage and mock-only write verification are unchanged.

## 1.2.1

- Consolidate dashboard, details and settings corners into a smaller shared radius system, with inset-aware nesting for columns, cards and controls.
- Match the card's Start work/Open workspace button corners to the details action. Preserve priority pills, circular avatars and mobile touch targets.
- Tighten compact card spacing and reduce title size. Select cards by clicking their background while keeping nested actions independent.
- Replace blue selection outlines and title underlines with theme-aware surfaces; show the focus ring only during keyboard navigation, without a mouse-down flash.
- Refresh the five public screenshots. Simplify CI job names and retain the lightweight Paseo 0.15.0 typecheck alongside full baseline/0.15.2 coverage.

REST API, Teamwork Graph CLI OAuth and Atlassian MCP OAuth remain included. Paseo requirements remain `>=0.14.0 <0.16.0`; host coverage and mock-only MCP upload limitations are unchanged.

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
