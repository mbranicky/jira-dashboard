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
