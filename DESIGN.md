# Jira Sprint Workspace design

Status: current implemented design and agreed refinements, 5 November 2026. Product behavior is specified in [SPECIFICATION.md](SPECIFICATION.md).

## Identity and visual direction

Use **Jira Workspace** for the sidebar label and **Jira Sprint Workspace** for the screen, plugin display name and Open Jira Sprint Workspace command. Keep the familiar Jira board structure while providing compact Paseo workspace actions. Use theme colors, quiet secondary controls, icons, restrained surfaces and consistent spacing. Do not introduce large full-width card actions.

## Dashboard header and controls

The header contains a board icon, board name, authenticated user's name and fixed Assigned to me scope. Refresh and Settings are compact icon-and-label actions with pressed feedback. Refresh shows its busy state.

On desktop, place the sprint selector and search on one row. The sprint selector shows a calendar icon, selected sprint, Auto indicator when following the active sprint and a chevron. Its menu contains Follow active sprint plus active/future sprints, with a 220-point maximum scrolling height. Closed sprints are excluded.

Search includes a search icon, focus border and clear button. Below the controls, show issue count and last-update time with a clock icon and stable-width numerals. Filtering shows matching versus total count. Compact layouts stack the controls and wrap the header actions.

## Board layout

Desktop uses horizontally arranged 300-point columns with Jira's actual names and counts. Columns hold vertically scrollable cards. Compact mode offers a horizontal column selector with counts and one visible column; the outer vertical scroll handles its issue list rather than a second nested issue-list scroll.

Column names and issue counts are data, not fixed design labels. The board supports workflow-aware drag-and-drop. There is no board-switcher implying multiple saved boards and no Start column.

## Compact issue cards

Card hierarchy:

1. Full wrapping summary, clickable to open details; never truncate it to a fixed line count.
2. Optional parent summary, versions and labels in one compact expandable group.
3. Actual Jira status in muted text.
4. Footer: issue-type icon, Jira-linked key, priority icon/text, and action icon.

Collapsed metadata shows up to two versions and one label with an inline overflow count, vertically centered beside the tags. Clicking the parent or tags toggles all metadata. Expansion does not alter the title behavior. The parent summary can wrap when expanded.

Use 6-point section spacing, compact chip padding, and one minimum-44-point metadata interaction area instead of separate 44-point parent/tag rows. The footer action keeps a 44-point hit area around a smaller 30-point visible button. Full titles may naturally increase card height; avoid artificial empty gaps.

Start work uses an accent play icon. After a successful start in that mounted card, Open workspace uses an arrow icon. Unmapped issues use a quiet mapping icon in the same footer position, with Configure mapping tooltip and accessible label. All icon actions have accessible names; do not add an extra full-width action row.

Do not repeat an assignee avatar on every card when the board only shows the current user's issues. Do not invent Jira custom fields, story points or agent-state indicators that are not loaded.

## Ticket details modal

The title opens the configured modal or dashboard side panel, with write controls governed by the selected connection. Its full wrapping title sits above status, type, priority and Open in Jira. Load description and additional fields on demand; retain basic card information while loading or after a request error. Offer Retry for errors.

Desktop at widths of at least 760 points uses a centered dialog up to 1180 points wide, bounded by 24-point viewport margins. A fixed header holds the key and Close control. The body scrolls within available height. Description occupies the flexible left column; a 300-point fields panel sits on the right with 28-point separation.

Below 760 points use the host modal/sheet with a single stacked, scrollable body. Content stretches across available width with one 16-point outer inset. Description and Jira fields align to the same left edge. The mobile fields section has a heading and separator rather than an additional padded panel. Do not center a fixed-width content strip inside a larger modal.

Fields include parent, fix versions, labels, assignee, reporter, due date, created and updated timestamps. Description rendering supports basic wiki/document text, headings, lists and code blocks; attachment placeholders point users to Jira. The supported rich-formatting subset is described below; embedded media, custom fields and story points are not fully rendered; a separate attachments section provides file access.

## Settings

Use a centered maximum width of 960 points and a single outer scroll when embedded in the dashboard. The current sections are Jira connection and Project mappings; direct-token entry and credential-management controls are not implemented.

### Connection

An icon-led heading introduces the connection-method dropdown and selected transport card. REST shows the board URL and absolute host secret-file path; TWG shows CLI/profile inputs; MCP shows host sign-in controls. Preserve each method’s settings when switching. Never show credentials.

Refresh interval uses an editable seconds input with integrated preset dropdown: 30, 60, 120 and 300. Accept whole numbers at least 30 with no product maximum. Invalid values show an inline message and red border. Place the control beside its explanation on desktop and below it on compact layouts. Save connection is a compact accent icon-and-label action aligned right.

### Project mappings

Collapsible cards have user-entered names and summarize Jira key, Paseo project and provider. Headers expose expanded state. Draft edits survive collapse. New drafts open without errors; Save mappings validates fields and expands invalid cards. Render validation messages immediately above affected controls with red borders. Show a single save confirmation.

Mapping name and Jira key share a row on desktop and stack on compact layouts. Project, provider, model and isolation are dropdowns. Provider/model options come from Paseo; selecting a provider resets the model. Compact dropdowns place labels above full-width controls, allow long values to wrap and bound menus to 220 points. The entry skill remains optional with explanatory text.

Start work on move to column is an optional mapping choice; Play never changes Jira status. Remove is a generic trash-icon action aligned right. Add mapping, Refresh projects and Save mappings remain compact icon-and-label actions with minimum 44-point hit targets.

Configure mapping from an issue opens the mapping section with an expanded, unsaved draft first and the Jira key prefilled. It does not save automatically or create a workspace. Other fields remain user choices. Existing saved mappings are preserved; new Paseo projects must currently be created in Paseo first.

## Work interaction and feedback

Start work prepares or reuses the workspace/agent without changing Jira. Branch choices, workflow forms and failures appear in separate dialogs, never inside the card. Explicit moves use issue-specific transitions and supported fields; card position follows confirmed Jira status.

A blank entry skill opens an idle agent. Existing work is reused without automatic skill reruns. Live agent running/idle indicators, a standalone Change Jira status action and explicit skill retry/rerun controls remain future design work.

## Empty and error states

- Missing connection opens setup.
- No or several active sprints prompts sprint selection in Auto mode. Explicit choices and Auto persist per host/site/board across dashboard reopening. Failed preference saves show a visible retry message; unavailable saved sprints offer Choose another sprint.
- No assigned issues or search matches has an explicit empty message.
- Failed refresh retains the last successful snapshot and marks it potentially stale.
- Missing mapping offers the compact Configure mapping icon.
- Startup failures remain visible; an uncertain skill acknowledgement must not trigger automatic resend.
- Details failures retain card metadata and expose Retry and Open in Jira.

## Verification and limitations

Desktop layouts were visually checked in Paseo. Dashboard/settings were also inspected in a temporary 375 × 740 compact preview, including expanded mapping dropdowns. Long issue details were scrolled through to the final Jira fields and closed from the bottom in a 375-point content preview.

Those checks are desktop-hosted previews, not physical-phone tests. Early details screenshots retained a wider desktop shell around centered content and therefore showed misleading side gutters. Preview overrides were removed; the current mobile body stretches with consistent 16-point padding and no doubled fields inset.

The user completed a phone review without reported issues on 3 November; device details were not recorded, so this does not establish exhaustive gestures, keyboard or safe-area coverage. Preserve this distinction when reporting mobile readiness or sharing screenshots.

## Workspace Jira issue tab

The right-side Explorer gains a **Jira** tab with a FileText icon. The workspace command opens it for existing workspaces; dashboard Start work opens it automatically after successful creation/reuse. This uses Paseo's existing tab and collapsible-panel controls. Its public API currently reveals the panel when opening a tab; silent background insertion is unavailable.

Keep the panel compact and vertically stacked at every width. A fixed header shows the resolved issue key and quiet icon actions for Open in Jira and Refresh, with 44-point accessible hit areas. The scrolling body has one consistent 16-point inset: full wrapping title, status/type/priority, description, then Jira fields separated by a subtle divider. Avoid nested cards or extra side padding. Use theme colors, selectable content, and readable wrapping for long values/code. The panel scroll resets when the resolved key changes.

Show a muted loading message during initial resolution. Show **No Jira issue found.** for no match, with no entry field or chooser. Multiple keys at the winning detection tier produce a short ambiguous-match message. Connectivity and scope errors remain explicit and retryable using Refresh; do not disguise them as absent tickets. A workspace tab is always available from Explorer even when its workspace has no Jira key.

Saved dashboard links win over workspace names, which win over agent tab titles. Repeated occurrences of one key count once; unrelated agent metadata labels are not considered. The panel never offers Start work, skill execution or status changes. It now includes the comments section described below. Existing dashboard cards and their details modal keep their current behavior.

Current validation covers detection, independent read boundaries and legacy-link recovery. The installed desktop panel, token-scope error and no-match state were visually verified with the current token; real DEMO-7415 description and fields were also verified in the desktop Explorer on 1 November 2026 after token replacement. This historical observation predates the user’s 3 November phone review; see [Testing](docs/TESTING.md).


## Comments and composer

Both details surfaces include a Comments section. In the desktop modal it follows the description in the left column; in the narrow workspace tab it follows Jira fields. Use initials avatars, author name, localized date/time and subtle edited/restricted markers. Bodies retain basic inline formatting and readable paragraph/list/code spacing. Existing threaded comments have a quiet left rule and indentation capped at 24 points to preserve reading width. Reply and external-link actions are compact, with 40–44 point hit areas; no reaction controls.

Add comment opens a composer above the list. Reply places it below the selected comment and labels it “Linked reply to [author]”, with the explicit explanation that this posts a new top-level comment linked to the original. Only one composer is active per surface. Its wrapping icon toolbar offers bold, italic, list, code, link and preview; the multiline editor uses a single inset. Post comment/Post linked reply is the primary action; Discard is secondary. Blank or pending submissions are disabled. Preview uses the same ADF normalization as displayed comments.

Keep the surrounding details surface as the outer scroll container, including on narrow layouts. Use selectable wrapping content and theme colors. Loading/error/empty states belong to the comments section and do not hide the issue. Load more exposes pagination. Failed submissions retain the draft and prompt the user to check Jira before enabling a new attempt, since delivery may be uncertain. Refresh errors after a successful post must not suggest reposting.

## Attachments

A shared compact section sits before Comments in the modal and Jira side panel. File rows wrap filenames and show size, author and timestamp. Small labeled icon actions preview raster images, download or open in Jira. Previews expand inside the row. Add attachment opens a file picker; a selected-file card shows the destination issue and explicit Upload/Cancel actions, followed by progress or inline errors. The layout stacks without horizontal scrolling in narrow panels. Native mobile offers Upload in Jira.

Description, Attachments and Comments are independently collapsible in both issue detail surfaces, expanded by default. Headers expose expanded state and provide a 44-point touch target. Collapsing preserves mounted content, comment drafts and upload state. Compact attachment rows place actions beside file details when space permits and wrap them below on narrow panels.

Attachment actions have distinct destinations: Eye previews supported images inside the plugin, Download saves the file, and External link opens a local browser image preview when supported or the containing Jira issue for other files.

Local browser image previews: the attachment external action opens PNG, JPEG, GIF and WebP inline through a temporary server bound only to 127.0.0.1. Random preview URLs expire after five minutes, images remain in memory (25 MiB per file, 50 MiB combined), and plugin shutdown removes them. Jira tokens never enter the browser URL. A nonce probe checks that the selected host is reachable on the client’s loopback; mobile clients, remote hosts and failed local previews fall back to the existing in-app image preview. Non-image external actions continue to open the containing Jira issue.

On mobile widths below 760 points, issue details occupy the full screen rather than a bottom sheet. The issue-key header and 44-point close action remain fixed above the scrolling content. Native safe-area space is respected; descriptions, attachments, comments and Jira fields share one vertical scroll area. Desktop retains the centered two-column modal.

Comments are sorted newest first by the later of creation and modification timestamps. All Jira comment pages are collected before sorting and exposing 50-item display pages, so recently edited older comments are included at the top. Nested replies remain grouped below their parent; siblings use the same newest-first ordering.

Comment metadata labels the creation timestamp as Created. When modification is later than creation, a separate Edited line shows the last modification date and time in the client’s locale, making newest-activity ordering clear on narrow screens as well.

Descriptions and comments share a native rich-content renderer. ADF formatting includes bold, italic, strike, underline, inline code, headings, lists, HTTP(S) links, mentions, code blocks, quotes, tables and panels. Legacy Jira wiki descriptions support common inline marks, h1–h6 headings, numbered/bulleted list markers, code/noformat blocks, pipe tables, quotes and panels. Tables scroll horizontally within narrow screens. This is a supported subset, not full Jira editor parity: embedded media remains a readable attachment fallback (previews are in Attachments), unsupported macros remain text, and table spans/advanced layout are not reproduced. Remote HTML is never executed.

Start work visibility: hide the Play action for Jira In Progress and Done status categories, and for developed, completed, closed, resolved, review, and validation states. Keep it available for To Do/development-ready issues. An already-created workspace can still be opened through its existing Open workspace action.

Card action priority: an existing workspace link takes precedence over status eligibility and Configure mapping. Show the compact ArrowUpRight button with an Open workspace tooltip/accessibility label. Resolve saved links on every board refresh, including workspaces whose agent setup is incomplete.

Open workspace is shown only while the linked workspace still exists and is not archiving. A removed/archived workspace returns the card to its normal status-based action.

### Work actions inside issue details
Place the shared compact Play / Open workspace action at the end of the dialog's status/action row. Allow metadata to wrap on narrow screens and retain the 44px action touch target, tooltip and accessible label. Keep branch/workflow choices and errors in separate dialogs. Configure mapping closes the dialog and opens the prefilled settings. The Jira workspace side panel stays informational and has no work action.

Workflow-aware drag and drop is available on desktop. Resolve transitions after a drop; a configured destination can start local work after a confirmed move.

Move controls: cards have no separate Move to control. Dragging does not highlight columns. The move area shows issue key, loading/busy feedback, transition choices, required-field explanations and results. No optimistic card relocation occurs; refresh the board after the server responds.

Each project mapping has an optional Start work on move to column selector populated from actual board columns. An unset selection disables automatic work starts on moves, including for existing mappings; Play behavior is unchanged. Changing the Jira project key clears the selection. Renaming a status does not change its identity. An unavailable saved selection is visibly flagged and can be cleared or replaced. Transition availability for the individual issue is still revalidated before any move.

### Revised move interaction
All columns accept attempted drops. There is no Move to menu. The card remains in its confirmed position while the move is pending. Resolve workflow transitions after destination selection; show rejection reasons without simulated relocation. A scrollable, compact modal presents transition fields, retained inputs, Jira validation feedback, Cancel, Open in Jira and Move issue. Unsupported field types explicitly direct users to Jira.

The standalone Move to card control and destination menu have been removed. Board moves are initiated by dragging; post-drop transition selection, fields and error handling remain available.

Dropping into the source column is silently ignored before any Jira request, including columns containing multiple statuses. Drag targets have no added outlines or eligibility borders.

During dragging, only the hovered column receives a subtle 8% black background tint. Cards and text are unchanged; there is no outline. The tint clears on leave, drop or drag cancellation.

Status selector revision: use configured board status IDs with names from already-loaded tickets, falling back to column plus status ID. Do not call the project-status endpoint or require additional scopes. Options are board-wide, not a claim that every status applies to every project; per-issue transitions remain authoritative. Stable successful metadata uses bounded host-memory caching (site 24h, identity 1h, board configuration 10m); Refresh statuses bypasses board configuration cache. Errors, issue data, sprint lists, transitions and writes are not cached.

### Play action correction
Play only creates/reuses the mapped workspace and agent and sends the optional entry-skill prompt. It never updates Jira or asks for a transition. The automatic Jira update switch and inline transition picker are removed; legacy saved automatic-update preferences have no effect. Explicit drag-and-drop transitions remain separate and may invoke work creation after Jira confirms the configured trigger status.

Start work reuses local branches matching the complete issue key, including prefixed or suffixed issue branches. An existing checked-out worktree is used in place; an unchecked-out branch uses Paseo checkout. Only when no match exists is the issue-named branch created. No random branch suffixes. Multiple matches require explicit selection in a separate modal, with branch and worktree path shown. Never put choosing forms, workflow inputs, extra buttons or error blocks inside ticket cards; preserve their layout.

Project mappings include an optional Mode dropdown beside Model, populated through Paseo's provider modes API for the mapped project. Changing provider clears the mode selection. No selection inherits the provider default. New agents receive the selected mode ID after server validation; existing agents are not reconfigured. Mode descriptions and unavailable-mode feedback appear in settings only.

Play's new-branch source follows the mapped project's checked-out branch (or detached HEAD commit). This source is passed explicitly to Paseo so the comparison base does not silently fall back to a different default release branch.

### Transition dialog controls

The move confirmation uses a separate modal with a fixed header and footer and a scrollable field area. The header separates the issue key, action title, and destination status. An icon-only external link with an accessible label and hover/focus tooltip opens the issue in Jira. Cancel and the primary Move issue action sit together at the right of the footer, with at least 44 px touch targets.

Jira-provided choice fields use compact disclosure selectors with search and bounded scrolling instead of a page-length stack of option buttons. Multiple-choice fields show checkboxes, selected labels in the closed control, and a Done action. Unsupported fields are grouped in one explanation that directs users to Jira if those values are required. Errors remain inside the dialog; ticket cards retain their existing layout. Compact screens use smaller gutters while retaining the scrolling fields and visible actions.

### Start work destination column

The mapping selector lists each configured board column once, alphabetically. It uses column names rather than individual workflow statuses. Any successful move into the selected column can trigger Start work; Jira still determines which underlying status transitions are available. Existing saved status triggers resolve to their containing board column. Selecting “Do not start work on moves” explicitly disables the trigger.

Column labels in the Start work destination dropdown are displayed in uppercase and use only the text before the first slash. The complete original column name remains the saved value and is used for transition matching.

Fix-version transition selectors hide choices explicitly marked released or archived by Jira. A selected historical version stays visible and can be deselected. Missing flags do not imply that a version is released. Release metadata comes from transition allowed values, with no additional lookup. Server validation retains the complete Jira-allowed list so selected historical versions remain valid.

Automatically started workspaces use an additional colored type label for quick recognition: Story in green for Story/User Story; Bug in red for Bug/Problem. Other types keep only the existing In Progress label. Paseo's green label color token is emerald. Existing named type labels are reused and their colors corrected when needed.

### Overlay dropdowns and focus styling

Sprint choices, refresh presets, compact mapping selectors and transition choice fields use anchored overlay menus rather than expanding the document flow. Menus dismiss on outside click or Escape/back, scroll within bounded space, flip above their trigger when needed and stay within viewport gutters. Refresh presets continue to allow a custom typed interval; multi-choice transition controls retain search and checkboxes.

Default browser focus outlines are suppressed within Jira Sprint Workspace surfaces and dialogs. The suppression is scoped to plugin-owned elements; Paseo's surrounding UI retains its own styling. Normal control borders, hover feedback, text carets and validation borders remain intact.

### Shared tooltip presentation

All plugin-owned tooltips use the shared Tooltip component: left-aligned 12 px text with a 16 px line height, 8 px horizontal and 4 px vertical padding, and a 5 px corner radius. Width follows the content without a forced minimum, bounded to 280 px or the available viewport width for longer messages. Start work, Open workspace, Configure mapping and Jira-link tooltips share this styling. Trigger-specific anchoring may differ to fit the surrounding layout.

### Dashboard detail presentation

Dashboard appearance offers two illustrated choices: Modal dialog (default) and Right side panel. The preference saves automatically per host, independently of connection and project mappings. Paseo's Explorer panel requires a workspace, so the dashboard owns this panel without changing workspace tabs.

The panel initially occupies 520 px at the right edge, has a fixed issue-key/close header and independent scrolling, and leaves the board interactive. Selecting another title replaces its content. Below 1000 px of available dashboard width, or on compact clients, it uses full-screen details with a fixed close control. The modal retains its wide two-column desktop layout. Shared Jira fields, rich content, attachments, and comments keep the workspace tab and dashboard consistent. Start/Open workspace controls appear in dashboard details only. Card tag/parent expansion stays independent of details selection.

Dashboard panel resizing and collapse: drag the left divider to resize, bounded to keep at least 360 px for details and 400 px for the board. Collapsing leaves a 48 px rail with the same toggle at the same location; expanding restores the selected issue, content state, scroll position, and previous width. Selecting a card while collapsed expands it. Width and collapse state are retained during the dashboard session; resizing the application temporarily clamps the visible width without discarding the preferred width.

Dashboard navigation retains the selected issue, panel width, and collapsed state in host-isolated client-session storage. Returning from a workspace restores that view. Explicitly closing full-screen/modal details clears the selection; collapsing the docked panel does not. App restart or plugin reload resets this transient state. Details wait for appearance settings and layout measurement before restoring, avoiding a temporary modal flash.

Initial dashboard loading shows neutral empty column surfaces with placeholder headings and a small labeled activity indicator. Desktop uses horizontally arranged columns; compact screens show one full-width column. No status names or zero issue counts are invented before Jira responds. Background refresh retains the last successful board and adds a small activity indicator beside its update time. Fetch failures replace the loading view with the existing error state.

## Connection test feedback

Place a compact Test connection action inside the connection settings card. Keep results directly below it: a short overall heading, then left-aligned step names and messages with pass/fail/skipped icons. Show progress while running and disable duplicate submissions. Explain that unsaved values are tested read-only and write/comment/attachment permissions are not verified. Clear stale results when URL or secret-file path changes.

### TWG connection and local actions

The connection-method dropdown selects TWG and reveals its executable/profile inputs while preserving other methods’ settings. Details, comments and attachments reuse the shared responsive sections. Local Play/Open workspace controls remain on dashboard cards/details, with separate branch/error dialogs; workspace Jira panels do not gain Play. Without saved write opt-in, hide comment/upload controls and disable moves while retaining reads and local work.

Keep recovery within existing error/retry surfaces. Missing issues use the quiet workspace empty state; authentication/permission failures remain explicit.

### TWG opt-in Jira changes

TWG retains read-only behavior by default. Connection settings expose an explicit
Allow Jira changes switch, enforced on the server. When enabled, use
the existing move dialog, comment/linked-reply editor and attachment uploader in
both dashboard details and workspace Jira panel. Card layout stays unchanged.
Start work after a move occurs only after a confirmed Jira transition; Play remains
local. The upload UI distinguishes the plugin cap from unknown server limits.
Ambiguous destination status names and unpreservable reply visibility are refused.
See `docs/TWG_IMPLEMENTATION.md` for verified command contracts and remaining
CLI differences; this does not constitute unrestricted REST parity.

### Atlassian MCP connection

Settings uses one Connection method dropdown: REST API, Teamwork Graph CLI, or Atlassian MCP. Only the selected method’s configuration card is visible. Switching preserves the other methods’ draft settings and saved credentials. The Atlassian MCP card uses the shared section heading, themed surface and compact wrapping icon/text actions; signing in alone does not switch transports. Display verified account/site metadata, inline progress/errors, and Continue in browser only while sign-in is pending, without printing the raw authorization URL. Require host-browser confirmation and explain the phone/remote handoff. Keep Save connection behavior unchanged. Leaving Settings or selecting another connection method cancels pending sign-in while retaining saved credentials; Disconnect is a distinct explicit action.

The MCP connection keeps the existing dashboard layout. Its Settings description explains read access to details, comments and attachments, plus local Start work. Cards and dashboard details use the shared Start work / Configure mapping / Open workspace controls and separate branch/error dialogs. Jira move, comment/reply and upload controls remain hidden until the MCP write opt-in is saved; preserve the issue key link to Jira and existing workspace navigation.

### MCP connection card action hierarchy

Use a compact inset status panel and consistent 40px icon/text controls. During browser consent, show only the primary Continue in browser action and outlined Cancel sign-in; hide disabled sign-in, check and disconnect controls. Connected state shows the account display name and selectable verified technical account ID and outlined management actions without a primary reconnect button. Reconnect reveals the host-confirmation step before launching consent. Host guidance is shown only before sign-in; keep the credential-storage explanation as one muted footer. Controls wrap on compact screens without stretching across the card.

Comment layout: keep author, creation/edit timestamps and the external-link icon in one header. Place the icon at the trailing edge, with the shared content-sized, left-aligned compact tooltip. Read-only comments have no action footer. Replies retain a muted vertical guide and indentation capped at two levels to preserve mobile reading width. Comment toolbar and refresh icons use the same tooltip treatment.


MCP write opt-in uses a compact Allow Jira changes through MCP row inside the connection-method card, matching the Teamwork Graph row with a bold label, muted description and trailing switch. When enabled on a read grant, the card explains that Reconnect MCP and host-browser sign-in are needed. Saving the switch does not itself launch consent. Enabled controls reuse the existing REST move dialog, comment/reply editor and upload flow in dashboard details and workspace panels; no new forms or errors are inserted into ticket cards.


MCP Test connection displays the same inset step-by-step report as REST/TWG, beneath the connection actions. Show passed, failed and skipped stages with the shared icons and read-only footer. Keep the report within the card on desktop and mobile, clear stale reports when the draft board URL changes, and keep explicit sign-in separate from testing saved access.


Dashboard search highlights literal, case-insensitive matches in both issue keys and titles. Use the theme’s accent/accentForeground pair with bold nested text, preserving original text, wrapping and accessible card labels. No dedicated search-highlight token is exposed by the current Paseo plugin theme. Clearing search removes all marks; parent text, tags and status are not searched or highlighted.

### Linked reply presentation compatibility

Jira Sprint Workspace renders its generated linked replies beneath the referenced comment even though those writes currently create top-level Jira comments. Recognition is shared across transports and restricted to a standalone leading reply link for the same site/issue. The visible source link remains, native parent IDs take precedence, and missing parents/cycles never hide comments. No server comment is changed by this presentation step.

This is a compatibility workaround, not a native Jira thread guarantee. When updating comment integrations, recheck REST and advertised MCP/TWG contracts for supported parent-comment back references on both reads and writes. Adopt verified native threading per transport when available, retaining the fallback for existing historical replies. A generic link elsewhere in a comment must never become a parent relationship.

### Workspace discovery and section spacing

An existing saved workspace link wins. Otherwise show Open workspace for one unambiguous active name/title match within the mapped Paseo project. Discovery failure shows a sanitized warning above board controls while retaining issues and validated saved links; successful refresh clears it.

Stacked issue-details section gaps and attachment/comment top padding are 14px. The final Jira fields separator uses the same 14px gap/padding. Wide modal columns retain 28px separation and 20px fields padding.

### Corner radius system

All plugin-owned rounded shapes use `client/radii.ts`; avoid local numeric radius values. Large settings sections and board columns use 10px; dialogs and floating menus use 8px; cards and form controls use 4px; small inset controls, tags and image previews use 2px. Corner geometry is independent of theme, screen size and card density. Mobile full-screen details remain square. Touch-target dimensions are independent of corner radius.

For nested surfaces, start with `inner radius = outer radius - edge-to-edge inset` (including borders). This produces concentric curves where those curves overlap. When the inset consumes the outer curve, clamp to an optical floor: 4px for a content surface, 2px for a small control. This is an intentional optical adaptation, not an assertion that all nested shapes remain geometrically concentric. Never increase the inner radius beyond its parent. Widely separated content uses its semantic radius instead of inheriting its container's radius.

The board shares its column radius and 12px inset with the drop wrapper and hover layer; its issue cards derive a 4px radius from those values. Secondary card action backgrounds step down to 2px. The primary Start work/Open workspace button retains the shared 4px control radius in both cards and details, so its small filled shape remains visibly rounded. An 8px floating menu with 4px padding plus a 1px border uses the 4px content-surface floor for its menu items. Insets and radii must change together when these layouts change. Settings sections contain 4px controls and preview cards; attachment thumbnails use 2px within 4px attachment cards.

Exceptions are semantic shapes: priority pills remain capsules, avatars and radio indicators remain circular. Paseo-owned settings primitives, switches and the plugin artwork retain their host/asset styling; do not override global host styles to change them.

### Toolbar popovers

Filters and Manage boards open in portaled panels, 4px from their toolbar triggers, without changing the board layout. Filters aligns to the trigger's right edge; Manage boards aligns left. Panels use the shared overlay radius and theme surfaces, stay at least 12px inside the viewport, and scroll internally on small screens. Each has a compact title and close action; Escape and clicking outside dismiss it. Filter dropdowns occupy one horizontally scrollable row; actions occupy a separate row below. Filter selections apply immediately. Nested filter dropdowns remain separate overlays above the parent panel. Menu modals activate immediately. Their web roots declare a scoped 1ms opacity transition and stable opacity/scale so host overlay embellishments recognize motion ownership instead of animating full-screen wrappers or cloning them when nested modals change dialog roles.

The docked issue-details panel belongs to the columns region, below the full-width dashboard header and toolbar. Opening, collapsing or resizing it changes only the space available to columns; search, board/sprint selection, filters and settings retain their position and width. Columns and details scroll independently. Narrow layouts retain the existing full-screen details presentation.

Start-work progress and the newly created workspace link are shared by issue key within each host's dashboard. The card and expanded details subscribe to the same operation, including branch discovery and creation. A synchronous acquisition guard prevents duplicate starts before React rerenders. Other issues remain independent; branch-choice and error dialogs belong only to the initiating control.

If a successful completed board refresh no longer contains the selected issue, clear that selection and replace docked details with a centred “Nothing selected” state. Preserve panel width/collapse state and allow selecting another card. Do not show this empty panel on initial load, and do not clear selection merely because search/filters hide the card or a refresh fails.
