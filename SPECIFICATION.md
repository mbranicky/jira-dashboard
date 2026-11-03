# Jira Dashboard for Paseo

Status: current product specification and implementation checkpoint, 31 October 2026.

## Purpose and identity

**Jira Dashboard** is a Paseo plugin for viewing assigned Jira sprint issues and turning them into linked Paseo workspaces and agents. The sidebar entry, screen title, plugin display name and command launcher use this name. The runtime ID remains `jira-dashboard`.

The plugin provides board interaction and workspace orchestration. An optional external entry skill is supplied by the user; the plugin neither bundles that skill nor predicts its subsequent behavior.

## Jira connection

Support one Jira Cloud site and one configured board per host configuration. The board URL supplies the site and board ID. The project segment of a board URL does not restrict the board to that project: issues may belong to several Jira projects.

Example: `https://example.atlassian.net/jira/software/c/projects/DEMO/boards/51` selects board 51 on the example site.

Connectivity uses scoped Jira API tokens and REST, superseding the unsuccessful MCP/OAuth experiment. No hosted authentication service, Atlassian password or language model is needed for dashboard reads.

The implemented credential source is an absolute path to a private `jira.env` file on the Paseo daemon host:

```dotenv
JIRA_EMAIL=your.name@example.com
JIRA_API_TOKEN=replace-with-your-scoped-api-token
```

Parse the file as data, never execute or source it. Require owner-only file permissions on supported systems. Store only the file path in ordinary settings. Never expose credentials in client responses, logs, snapshots or agent prompts. Resolve the site's cloud ID and route scoped-token requests through `https://api.atlassian.com/ex/jira/{cloudId}`; use the site URL for Jira links and association identity.

Direct email/token entry with secure storage is agreed future scope, not an implemented settings control. Manual cloud-ID fallback and credential replacement/removal UI are also future work. Historical MCP investigation files remain reference artifacts only.

Token scopes are immutable: create a replacement token with the complete applicable scope list, replace the secret in jira.env, verify it, and revoke the superseded token. Exact endpoint scopes and setup instructions are maintained in [docs/JIRA_SETUP.md](docs/JIRA_SETUP.md). Connection validation remains read-only. Public-distribution applicability of Atlassian's API-token collection guidance remains unresolved; local prototype availability does not settle that question.

## Board and refresh behavior

- Mirror Jira board column names, order and status mappings. Horizontal swimlanes are not required.
- Show only issues assigned to the authenticated account within the selected board and sprint.
- Follow the active sprint automatically when exactly one is active. Allow an explicit sprint override; offer only active and future sprints, never closed sprints.
- Show an explicit selection/empty state when several or no sprints are active.
- Search by issue key or summary; show the matching count when filtering.
- Provide manual Refresh, last successful update time and Settings actions. Retain the previous snapshot with an error message if refresh fails.
- Refresh interval accepts whole-number seconds of at least 30, with no product-defined maximum. Presets are 30, 60, 120 and 300 seconds in an editable dropdown.
- Jira is the source of confirmed status. Workflow-aware board moves are supported; there is no Start column or optimistic column reassignment.

## Cards and issue details

Cards display the full wrapping title, optional parent, fix versions and labels, actual status, issue type, Jira key, priority and a compact footer action. The key opens Jira externally.

Clicking the title opens the issue-details modal. Clicking the parent or tags toggles metadata expansion independently of the title. Collapsed metadata shows up to two versions and one label, plus a vertically aligned overflow count. Parent and tags share a compact interactive group rather than separate tall rows.

The details modal displays the title, status, type, priority, description, parent, versions, labels, assignee, reporter, due date, created date and updated date. It includes Open in Jira, loading, error/retry and close controls. Fetch details on demand through the sprint issue endpoint, checking selected-sprint membership and assignment. Basic Jira wiki text and document blocks are rendered as readable text, headings, lists and code; rich formatting and embedded attachments are not fully reproduced. A separate attachments section provides file access. Story points and custom fields are not yet included.

Desktop details use a wide two-column dialog; mobile uses a stacked, scrollable body. See [DESIGN.md](DESIGN.md) for layout details.

## Jira project mappings

Each Jira project key has at most one mapping. Several keys may map to the same Paseo project.

| Setting | Requirement and behavior |
| --- | --- |
| Mapping name | Required, user-entered |
| Jira project key | Required uppercase key |
| Paseo project | Required selection from existing Paseo projects |
| Entry skill | Optional; blank opens an idle agent without a prompt |
| Agent provider | Required explicit selection from available Paseo providers |
| Model | Optional; options depend on the provider, otherwise use its default |
| Workspace isolation | Required: new Git worktree or shared project directory |
| Automatically update Jira status | Independent toggle, enabled by default for new mappings |

Explicit provider and isolation choices are the agreed Paseo 0.14 workaround because the plugin API does not expose saved app creation defaults. Changing provider clears the model override. Unavailable saved provider/model choices are identified; startup validates model availability before creating resources.

Mapping cards are collapsible. New drafts open expanded without validation errors. Save mappings validates required fields, marks invalid controls with red borders, places errors directly above them and expands invalid mappings. Collapse preserves draft edits. Remove is a generic trash-icon action aligned right. Successful saves produce one confirmation.

An unmapped issue shows **Configure mapping** in place of Start work. It opens mapping settings with an expanded unsaved draft at the top, prefilled with the issue's Jira project key. The user supplies the mapping name and remaining fields before saving. Existing mappings are preserved and a matching saved mapping is not duplicated. No workspace, agent or Jira update occurs from Configure mapping.

New Paseo projects currently must be created in Paseo before selecting them. In-plugin project creation remains future work. Project keys, repositories, providers, models and skills must not be hard-coded to personal examples.

## Start work and Jira updates

Start work resolves the mapping and creates or reuses the issue's workspace and initial agent:

1. Use the mapping's explicit isolation choice. Worktree mode uses the issue key as branch name; directory mode shares project files.
2. Name both workspace and initial agent with the exact issue key, such as `DEMO-1234`, without the issue summary or prefixes.
3. Apply the workspace label `In Progress`, creating it if absent and applying it to reused workspaces too.
4. Use the selected provider and model/default. Open the agent and invoke the external entry skill only when configured. Blank skill sends no prompt.

If automatic Jira updates are enabled for a first start, retrieve transitions into the In Progress status category and ask the user to choose one. Do not infer transitions from board column names. An already In Progress issue needs no transition. A rejected transition blocks workspace creation; required workflow fields are not yet collected. Once accepted by Jira, the transition is not rolled back if local setup later fails.

If automatic updates are disabled, Start work performs no Jira write. A skill or person may change status later. External Jira changes never launch work. Existing linked work is reused without repeating the skill or transition.

After a successful start in the mounted card, its action becomes Open workspace and opens the linked agent. After reload, Start work still resolves the persisted association safely; persistent linked-state presentation and live agent activity indicators remain future refinements.

## Persistence and recovery

Store issue associations privately under the target daemon home, scoped by daemon, Jira site and issue key. Stable idempotency identifiers and coalesced simultaneous requests prevent duplicate resources. Resume partial local setup using saved workspace/agent identifiers. Deleted or archived linked resources produce an error rather than silently creating duplicates.

Persist the skill delivery attempt before sending. An uncertain acknowledgement is surfaced and never automatically resent. Dedicated retry/rerun controls and manual recovery for deleted linked resources remain future work. There is no agreed automatic removal of the In Progress workspace label.

## Acceptance scenarios

1. Board 51 resolves from the example URL and follows its active sprint without a manually entered sprint ID.
2. Columns match Jira; other users' issues and closed sprints are excluded.
3. Search filters keys/summaries; failed refresh preserves the last snapshot.
4. Full titles open details, while parent/tags independently expand metadata.
5. Unmapped `TC-551` offers Configure mapping and opens an unsaved `TC` draft without side effects.
6. Adding a mapping does not display required-field errors; saving an incomplete mapping does.
7. Provider/model choices come from Paseo and model options follow the selected provider.
8. Starting a mapped issue creates the exact issue-key workspace/agent and In Progress label, or reuses existing resources.
9. Blank skill creates an idle agent; a configured skill receives the issue reference once.
10. Rejected Jira transitions create no local resources; later local failure does not undo an accepted transition.
11. Disabling automatic updates prevents plugin Jira writes during Start work.
12. External Jira changes never start work; only explicit user moves or Start work can launch work; there is no Start column.
13. Desktop details place description left and fields right; compact details remain stacked and scrollable.

## Verification and outstanding scope

The plugin is installed locally on Paseo 0.14. Live read checks against board 51 returned six columns, Runtime 225 and 17 assigned issues at the time of testing. Issue details were also retrieved live through the sprint endpoint with the existing token. These counts are observations, not fixed requirements.

Latest recorded checks: typecheck and 26 automated tests passed. A disposable local smoke test verified an idle workspace/agent named SMOKE-1, label creation and reuse; no real Jira write or skill prompt was sent by that test. Real entry-skill execution and live transitions have not been systematically validated by this workflow.

Desktop UI and compact-content previews were inspected. Some early modal screenshots centered a 375-point body in desktop framing and exaggerated gutters; they are not evidence of physical-phone appearance. Physical-device touch gestures, keyboard, safe areas and full mobile-sheet behavior remain unverified.

Future scope includes direct-token secure storage, in-plugin project creation, app-default inheritance when supported, standalone status changes, explicit skill rerun/recovery controls, persistent agent activity indicators, richer description/custom-field rendering, and multiple saved boards on the single Jira site. None should be presented as already implemented.

## Workspace Jira issue panel

A **Jira** tab is registered in Paseo's right-side Explorer panel, scoped to each workspace. It is also available through the workspace command **Open workspace Jira issue**. Start work opens this tab for the returned workspace after successful creation/reuse. Paseo 0.14 provides an open-panel operation, not a background-only tab insertion operation; opening the tab reveals Explorer while the agent remains in the main workspace area.

Resolve one issue in this order:

1. A saved dashboard association for this workspace and configured Jira site.
2. A complete uppercase issue key in the workspace name/title.
3. A complete uppercase issue key in the titles of this workspace's non-archived agents, corresponding to agent tab labels. Arbitrary agent metadata labels are not searched.

Deduplicate repeated keys within a tier. Multiple distinct keys at the first matching tier are ambiguous; do not fall through or choose arbitrarily. No matches, or a successful Jira search with no visible result, show **No Jira issue found.** There is no manual key input, ticket selector, or unrelated issue search. Permission/network/token failures render a separate retryable error. A saved link remains authoritative even when the names change.

New Start work records persist the site and issue key alongside workspace/agent identifiers. Legacy hash-only records can be recovered when a current workspace/agent name still contains the original key; recovered records retain that association for subsequent renames. An old record whose original key was already removed from every name cannot be reverse-decoded.

The panel reads the exact key through `GET /rest/api/3/search/jql`, independent of board, sprint, assignee and project mapping. Jira account visibility still applies. It displays the full summary, status, type, priority, description, parent, fix versions, labels, assignee, reporter and dates. Refresh rechecks detection and details; Open in Jira opens the resolved ticket. The panel also supports the explicit comment actions described below. No status updates, workspace creation or skill execution occur from this panel.

Details are fetched when the panel mounts and cached for one minute in the plugin's host-scoped query cache. Workspace names react to the host snapshot; agent titles are refreshed on agent events and every 30 seconds while mounted. No background Jira polling is introduced. The layout is a single vertically scrollable column suitable for both the narrow desktop Explorer and compact clients.

Verification for this addition: typecheck and 26 automated tests pass. The Explorer tab, scope-error state and “No Jira issue found.” state were verified in the running desktop app. On 1 November 2026, the replacement token passed board 51 reads (sprint 4180, 17 assigned issues), independent lookup of DEMO-7415 and workflow reads. The running desktop Explorer tab displayed its full description and Jira fields. No Jira changes or real agent starts were made during this verification. Physical-phone verification remains outstanding.


## Issue comments and linked replies

Comments are available in both the dashboard issue-details modal and the workspace Jira tab. Read through the dedicated per-issue comments endpoint with 50-row pages and an explicit Load more action. Preserve `parentId` relationships supplied by Jira, render children under their parents, cap visual indentation on narrow screens, and keep orphaned or cyclic data visible once rather than dropping it. A parent on a later page is labelled unavailable/not loaded until fetched.

Show author initials/name, local creation date and time, edited/restricted markers, formatted body, Reply and Open in Jira. Reactions, votes and comment editing/deletion are not implemented.

Add comment and Reply open a Markdown composer with formatting shortcuts and preview. The supported subset is bold, italic, inline code, fenced code blocks, headings, simple ordered/unordered lists, quotes and HTTP(S) links. The plugin converts this subset to Atlassian Document Format (ADF) for Jira REST v3; it does not rely on Jira accepting raw Markdown. Unsupported syntax remains text. Existing ADF is normalized into safe native text with basic formatting, mentions and attachment placeholders; remote HTML is never executed. Full Markdown, native mention autocomplete and embedded-media rendering are not included.

The user chose **linked replies**: Reply posts a new top-level comment prefixed with a link labelled “Linked reply to [author]”. The editor and Post linked reply action explicitly describe this. It does not claim to create a native Jira thread. Fetch the original comment immediately before posting; retain its visibility restriction. If the original is inaccessible or its audience cannot be preserved, fail rather than post publicly. Internal Jira Service Management comments must be replied to in Jira. Dedicated comment reads expose native parent IDs, but the published Add comment contract does not document a supported parent-comment input.

Posting occurs only when the user presses Post comment/Post linked reply. Disable duplicate clicks; coalesce identical request IDs during the server plugin session. Never automatically retry a failed write. Retain failed drafts and require the user to check comments/Jira before enabling another attempt. Drafts survive modal/tab unmounting in client memory, scoped by host and issue; they do not survive plugin/app reload. Request receipts also do not survive plugin reload, so they are not an exactly-once delivery guarantee. Successful posting clears the draft and refreshes comments. No automatic author mention or notification is inserted in linked replies; normal Jira notifications may apply.

Verification on 1 November 2026: typecheck and 32 tests pass. Live DEMO-7415 comment reads, author/timestamp rendering, the linked-reply editor and Markdown preview were checked in the narrow desktop Explorer. The temporary draft was discarded without posting. Posting, restriction preservation and duplicate protection were exercised through mocked requests; no real Jira comment was created for this verification. Physical-phone verification remains outstanding.

## Attachments

Both the details modal and Jira workspace panel share an attachments section: filename, size, author, local creation time, safe raster image preview, download and Open in Jira. Desktop/browser clients select one file, review its name and destination, then explicitly upload. Native mobile clients use Upload in Jira. In-app transfers are capped at 25 MiB and respect Jira upload settings. Credentials stay on the host; bounded chunks and short-lived upload sessions limit buffering. Duplicate finish requests reuse the same result; uncertain uploads are not automatically retried. Uploads attach to the issue, not restricted comments. No deletion or inline comment attachment editing.

Description, Attachments and Comments are independently collapsible in both issue detail surfaces, expanded by default. Headers expose expanded state and provide a 44-point touch target. Collapsing preserves mounted content, comment drafts and upload state. Compact attachment rows place actions beside file details when space permits and wrap them below on narrow panels.

Attachment actions have distinct destinations: Eye previews supported images inside the plugin, Download saves the file, and External link opens the containing issue in Jira using the system browser. The external action avoids direct attachment URLs, which Jira may serve as downloads.

Local browser image previews: the attachment external action opens PNG, JPEG, GIF and WebP inline through a temporary server bound only to 127.0.0.1. Random preview URLs expire after five minutes, images remain in memory (25 MiB per file, 50 MiB combined), and plugin shutdown removes them. Jira tokens never enter the browser URL. A nonce probe checks that the selected host is reachable on the client’s loopback; mobile clients, remote hosts and failed local previews fall back to the existing in-app image preview. Non-image external actions continue to open the containing Jira issue. This supersedes the earlier external-action description for images.

On mobile widths below 760 points, issue details occupy the full screen rather than a bottom sheet. The issue-key header and 44-point close action remain fixed above the scrolling content. Native safe-area space is respected; descriptions, attachments, comments and Jira fields share one vertical scroll area. Desktop retains the centered two-column modal.

Comments are sorted newest first by the later of creation and modification timestamps. All Jira comment pages are collected before sorting and exposing 50-item display pages, so recently edited older comments are included at the top. Nested replies remain grouped below their parent; siblings use the same newest-first ordering.

Comment metadata labels the creation timestamp as Created. When modification is later than creation, a separate Edited line shows the last modification date and time in the client’s locale, making newest-activity ordering clear on narrow screens as well.

Descriptions and comments share a native rich-content renderer. ADF formatting includes bold, italic, strike, underline, inline code, headings, lists, HTTP(S) links, mentions, code blocks, quotes, tables and panels. Legacy Jira wiki descriptions support common inline marks, h1–h6 headings, numbered/bulleted list markers, code/noformat blocks, pipe tables, quotes and panels. Tables scroll horizontally within narrow screens. This is a supported subset, not full Jira editor parity: embedded media remains a readable attachment fallback (previews are in Attachments), unsupported macros remain text, and table spans/advanced layout are not reproduced. Remote HTML is never executed.

Start work visibility: hide the Play action for Jira In Progress and Done status categories, and for developed, completed, closed, resolved, review, and validation states. Keep it available for To Do/development-ready issues. An already-created workspace can still be opened through its existing Open workspace action.

Persisted issue/workspace links are loaded with the board. Linked cards show Open workspace instead of Play regardless of Jira status or current mapping configuration, including after dashboard reload. Opening a workspace navigates directly without starting an agent, invoking a skill, or transitioning Jira.

Saved workspace links are checked against Paseo on each board load. Missing or archiving workspaces do not offer Open workspace; the usual Jira status eligibility determines whether Play is shown. Starting again creates a fresh workspace/agent generation rather than reusing stale creation identifiers. Lookup failures are surfaced rather than treated as deleted workspaces.

### Issue dialog work actions
The dashboard issue details dialog offers the same compact Start work / Open workspace action as its card, beside the status and Open in Jira row. Status eligibility, mapping setup, transition selection and persisted workspace links use the same component. The workspace Jira side panel does not expose these actions.

### Workflow-aware board moves
Desktop cards support dragging into another board column. There is no separate Move to control. The server queries transitions available to the current user for this specific issue, maps destination status IDs to actual board columns, and checks fresh transition availability again before submission. Same-column transitions are omitted. Multiple transitions into a column require an explicit choice.
Every explicit move updates Jira regardless of the mapping's automatic-update setting. Required-field transitions are disabled with a handoff message to complete them in Jira; workflow validators remain enforced by Jira. A failed or uncertain update never starts work and is not automatically retried. Refresh confirmed Jira state after every attempted move.
Destinations matching the project mapping’s selected Start work status ID invoke the existing Start work flow after Jira accepts the transition. Validate the project mapping before changing Jira. Workspace/agent reuse and optional skill behavior are unchanged. Other transitions only update Jira. No status-name or category guessing is used for move triggers.
If workspace creation fails after Jira succeeds, show an explicit partial-success warning; do not roll Jira back. Concurrent move requests for the same issue are rejected while one is running.

Each project mapping has an optional Start work on move to selector populated from Jira project workflow statuses, grouped into unique status IDs with issue type labels. An unset selection disables automatic work starts on moves, including for existing mappings; Play behavior is unchanged. Changing the Jira project key clears the selection. Renaming a status does not change its identity. An unavailable saved selection is visibly flagged and can be cleared or replaced. Transition availability for the individual issue is still revalidated before any move.

### Attempt-first move interaction
This supersedes pre-filtered drag targets and disabled required-field transitions. Users may drop into any board column; no Jira request is made on drag start. After a drop, resolve issue transitions for the destination. If none exists, explain that Jira offers no transition and retain the original card position. Offer a choice when multiple transitions match.
A compact confirmation dialog renders transition fields from Jira metadata: text, number, parent issue key, enumerated single choice and multiple choice. Unsupported schemas link to Jira. Send edited fields together with the transition, rechecking metadata and allowed choices server-side. Jira remains authoritative for required fields and workflow validators. Surface Jira error messages, retain user-entered values and refresh transition metadata for retry. Never automatically retry writes. Cancel leaves the original status untouched; board placement only changes after confirmed Jira data is refreshed. Start work still runs only after a successful trigger-status transition.

The standalone Move to card control and destination menu have been removed. Board moves are initiated by dragging; post-drop transition selection, fields and error handling remain available.

Dropping into the source column is silently ignored before any Jira request, including columns containing multiple statuses. Drag targets have no added outlines or eligibility borders.

Status selector revision: use configured board status IDs with names from already-loaded tickets, falling back to column plus status ID. Do not call the project-status endpoint or require additional scopes. Options are board-wide, not a claim that every status applies to every project; per-issue transitions remain authoritative. Stable successful metadata uses bounded host-memory caching (site 24h, identity 1h, board configuration 10m); Refresh statuses bypasses board configuration cache. Errors, issue data, sprint lists, transitions and writes are not cached.

### Play action correction
Play only creates/reuses the mapped workspace and agent and sends the optional entry-skill prompt. It never updates Jira or asks for a transition. The automatic Jira update switch and inline transition picker are removed; legacy saved automatic-update preferences have no effect. Explicit drag-and-drop transitions remain separate and may invoke work creation after Jira confirms the configured trigger status.

Start work reuses local branches matching the complete issue key, including prefixed or suffixed issue branches. An existing checked-out worktree is used in place; an unchecked-out branch uses Paseo checkout. Only when no match exists is the issue-named branch created. No random branch suffixes. Multiple matches require explicit selection in a separate modal, with branch and worktree path shown. Never put choosing forms, workflow inputs, extra buttons or error blocks inside ticket cards; preserve their layout.

Project mappings include an optional Mode dropdown beside Model, populated through Paseo's provider modes API for the mapped project. Changing provider clears the mode selection. No selection inherits the provider default. New agents receive the selected mode ID after server validation; existing agents are not reconfigured. Mode descriptions and unavailable-mode feedback appear in settings only.

The optional initial skill prompt uses exactly `/<skill-name> <issue-key>`, for example `/init-issue APP-4225`. A leading slash in the configured skill is normalized; a blank skill sends no prompt.

New issue branches explicitly start from the branch currently checked out in the mapped project directory, matching Paseo's manual creation flow. Detached HEAD uses its exact commit. Existing issue branches/worktrees retain their history. This replaces delegating the source branch to Paseo's repository default.

### Start work column selection (November 2026)

Project mappings select a board column as the Start work destination. The dropdown contains unique board column names sorted alphabetically, plus the option to disable automatic Start work on moves. A successful transition into any status belonging to the chosen column triggers the same workspace/agent action as Play. Existing saved status IDs are interpreted through their containing board column for compatibility. Play itself does not change Jira status. This replaces the earlier individual-status selector.

Fix-version choices in transition dialogs exclude released and archived versions using Jira's explicit flags. Already-selected values remain visible. Versions without release metadata stay available rather than being classified by their name. Filtering affects the chooser only and does not change Jira's allowed-value validation.

### Workspace issue-type labels

Start work retains the In Progress workspace label and also assigns Story (green) for Jira Story or User Story issues, or Bug (red) for Jira Bug or Problem issues. Other issue types receive no additional type label. Reuse existing labels by name or create them through label assignment when absent. Story and Bug labels use the specified colors. Both Play and the configured drag-and-drop Start work trigger apply these rules using the issue type already read from Jira. Label failures can be retried without creating a duplicate workspace or agent.

### Dashboard details preference

- Dashboard settings include an automatically saved, host-scoped `detailsView` preference: `modal` (default for existing installations) or `panel`.
- Title selection opens one dashboard-owned detail view. Panel mode allows selecting another card while details remain open. Closing restores the full board area.
- On compact screens or when the dashboard has less than 1000 px available for a docked panel, panel details are full-screen with a fixed header and scrollable body.
- Both modes reuse the existing detail data, rich description, Jira fields, attachment and comment components. Dashboard Start/Open workspace actions remain available; workspace Jira tabs do not gain them.
- Appearance changes do not modify credentials, project mappings, Jira issues, or workspace tab selection.

Dashboard panel resizing and collapse: drag the left divider to resize, bounded to keep at least 360 px for details and 400 px for the board. Collapsing leaves a 48 px rail with the same toggle at the same location; expanding restores the selected issue, content state, scroll position, and previous width. Selecting a card while collapsed expands it. Width and collapse state are retained during the dashboard session; resizing the application temporarily clamps the visible width without discarding the preferred width.

Dashboard navigation retains the selected issue, panel width, and collapsed state in host-isolated client-session storage. Returning from a workspace restores that view. Explicitly closing full-screen/modal details clears the selection; collapsing the docked panel does not. App restart or plugin reload resets this transient state. Details wait for appearance settings and layout measurement before restoring, avoiding a temporary modal flash.

Initial dashboard loading shows neutral empty column surfaces with placeholder headings and a small labeled activity indicator. Desktop uses horizontally arranged columns; compact screens show one full-width column. No status names or zero issue counts are invented before Jira responds. Background refresh retains the last successful board and adds a small activity indicator beside its update time. Fetch failures replace the loading view with the existing error state.
