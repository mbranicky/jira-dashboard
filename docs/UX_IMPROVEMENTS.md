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
