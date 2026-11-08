# Board experience improvements

Sequential review plan inspired by Better Paseo's interaction principles. No copied components, new release, or live Jira write testing. REST, Teamwork Graph CLI and Atlassian MCP remain supported.

1. Card hierarchy, selected state and reduced-motion-aware feedback.
2. Read-only linked-agent activity on cards and in details.
3. Attention and workspace filters.
4. Contextual card actions.
5. Previous/next issue details in board order.
6. Device-local display preferences with a synthetic preview.
7. Mobile column navigation and touch refinements.

Each step has its own PR, regression tests and a Paseo verification record. PRs are left open for review; dependent PRs identify their base.

## 1. Visual hierarchy and feedback

Titles have stronger weight; parent metadata loses its competing outline. Cards and lanes use nested radii and subtle card depth. The open issue has an accent outline and an accessible expanded state. Shared actions, menus and mobile detail presentation honor the device's reduced-motion preference, including changes while mounted. Board refreshes do not animate cards.

Verification: both typechecks; Chrome coverage for card selection in light/dark themes across REST/TWG/MCP, mobile reduced-motion details, and existing keyboard navigation. Reloaded the local plugin successfully and opened the Runtime board and an issue in Paseo, read-only. Compact/light layouts are covered in the browser harness; no physical mobile client was used.

## 2. Linked activity

Cards read linked agent metadata, or workspace metadata for manually discovered links, every 15 seconds while the board is visible. At most four metadata reads run concurrently; duplicate links are read once. No timelines or prompts are read. Idle never means finished: only an explicit agent completion signal displays “Agent finished”. Failed, missing, archived or mismatched links display an unavailable state without hiding the issue. Details offer an on-demand activity section, timestamp and navigation.

Verification: two metadata unit tests; 15 mocked Chrome activity/start-work cases, including all three transports; both typechecks. Reloaded in Paseo and verified a real linked card's “Agent idle” badge, then expanded activity details and confirmed its timestamp and Open agent action. No Jira writes or agent actions were executed.

## 3. Attention filters

The existing filter dropdowns now include Activity: Needs my input, Agent finished, Failed, Working, Has workspace and No workspace. Selections combine with Jira filters and search and can be saved in existing views. Older views default to no activity filter. Unavailable activity is excluded from state filters but still matches workspace-presence filters, with a visible explanation.

Verification: six filter/activity unit tests, ten Chrome filter/saved-view tests across all transports, both typechecks. In Paseo, selected Has workspace, confirmed the linked issue remained, and cleared the filter to restore the board. No Jira writes.

## 4. Card actions

A tooltip-labelled overflow button shares the existing card footer, without adding a new row. It offers Copy issue key, Copy Jira link, Open in Jira and (when linked) Open workspace. The primary Start/Open action remains visible. Copy success or failure stays inside the menu.

Verification: both typechecks and four mocked Chrome cases covering all transports, exact clipboard values, workspace navigation, tooltip, mobile error/retry and dismissal. Reloaded in Paseo, opened the linked card menu, copied its issue key and observed success feedback. No Jira writes.

## 5. Issue navigation

Previous/Next follows filtered column order, deduplicates repeated statuses and disables at boundaries. Removed/filtered-out selections do not jump to an unrelated issue. Closing details restores card focus without scrolling the lane. Mobile navigation selects the destination column. Existing private drafts remain scoped to each issue.

Verification: ordering/boundary unit test, six navigation Chrome cases and six existing draft cases; both typechecks. Direct regressions cover draft retention across Next/Previous and lane scroll preservation. In Paseo, advanced from issue 3 to 4 of 28, closed details and verified focus returned to the new issue's card. No Jira writes.

## 6. Device-local display preferences

The toolbar's Display preferences menu adjusts compact/comfortable spacing, desktop column width and parent/tag visibility, with a synthetic issue preview using the real card component. Priority sits beside status to keep footer keys/actions readable in narrow columns. Defaults retain compact spacing. Preferences are isolated by device and host, never written to shared host settings.

Published SDK 0.15.3 still restricts settings scope to `host` (verified against its npm declarations and runtime), despite newer online reference text mentioning device scope. This implementation uses the existing browser/app local-storage boundary. Native clients or unavailable/full storage retain preferences for the session with an explicit notice. No dependency/minimum-version change is needed; migrate to supported durable native device settings when published.

Verification: two storage unit tests, eight Chrome display/card-action tests across all transports plus compact light layout/storage failure, both typechecks. Reloaded in Paseo, changed spacing, inspected the real preview and restored Compact. No Jira writes.

## 7. Mobile navigation and touch targets

Compact layouts use a column picker with counts and Previous/Next controls instead of a horizontally scrolling button strip. Changing columns resets the lane to its top; detail navigation selects the destination column. Mobile buttons/filter options use 44-pixel targets and removable filter chips use 40 pixels, while desktop controls stay compact. Details remain full-screen on mobile to preserve established scrolling and keyboard behavior. Navigating between issues also restores focus to an available navigation control.

Verification: 21 focused mobile/dashboard/display Chrome cases, then 13 navigation/mobile cases after adding keyboard focus coverage. Light and dark mobile screenshots were inspected. Full local checks passed 302 Node tests, both typechecks, source audit and 140-file package validation. The full browser run passed 178/179 cases; the sole failure was the old mobile-column selector in the listing preview. After updating that selector, all three listing-preview cases passed. All 179 browser cases are covered by the full run and focused reruns. No Jira writes.

Paseo desktop was reloaded throughout and the final board remained readable with 28 issues. A compact native/mobile Paseo client was not available for direct verification; compact behavior, all three transport modes and error cases were exercised in the mocked browser harness. No physical-phone or native durable-storage claim is made.

## Review order

PRs are stacked so each diff contains only its own improvement:

1. [#31](https://github.com/mbranicky/jira-dashboard/pull/31): card hierarchy and reduced motion, based on main.
2. [#32](https://github.com/mbranicky/jira-dashboard/pull/32): linked activity, based on #31.
3. [#33](https://github.com/mbranicky/jira-dashboard/pull/33): attention filters, based on #32.
4. [#34](https://github.com/mbranicky/jira-dashboard/pull/34): card actions, based on #33.
5. [#35](https://github.com/mbranicky/jira-dashboard/pull/35): detail navigation, based on #34.
6. [#36](https://github.com/mbranicky/jira-dashboard/pull/36): device display preferences, based on #35.
7. [#37](https://github.com/mbranicky/jira-dashboard/pull/37): mobile navigation and final integration verification, based on #36.

Merge only when separately authorized, in order, retargeting each next PR to main and checking its new merge result. Do not delete a base branch while another open PR depends on it. Version remains 1.1.0; no tag or npm publication accompanies this work.
