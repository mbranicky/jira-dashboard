# Known limitations

- One Jira Cloud site per Paseo host. Jira Server/Data Center and multiple sites are not supported.
- All clients on that host use the configured REST token, Teamwork Graph profile or MCP account's permissions. Jira project and issue permissions still apply in addition to token scopes.
- Connection diagnostics verify dashboard/search reads, not every comment, attachment or transition permission. A successful check is not a write-permission guarantee.
- Replies are top-level Jira comments with a link to the original. The dashboard renders recognized links as nested replies across all transports; native parent IDs take precedence. Native threaded reply creation and reactions are not implemented.
- Some workflow fields cannot be completed through the plugin; the transition dialog directs the user to Jira. Failed moves keep the original column.
- Panel selection/size and comment drafts are session state. Plugin/app restart clears them. Sprint selection is persisted per board. The search and selected mobile column are remembered per host and board during the client session.
- Provider and isolation choices are explicit. Paseo 0.14 does not expose every saved project default through its plugin API.
- Attachment support has transfer/type/client limits documented in [Jira setup](JIRA_SETUP.md). Local browser preview is for local desktop connections; remote/mobile use in-app preview.
- Automated browser tests use host adapters and synthetic Jira data. They do not prove real Jira permissions or every host/device behavior. The user completed a mobile review; clean Git installation was also verified. Real Jira write tests are not a release requirement. See [Testing](TESTING.md).
- The repository is public and includes Atlassian MCP support on `main`. Version 0.1.0 is available from source only. Registry release requirements are tracked in the [checklist](../.claude/plans/first-version-checklist.md).

## Teamwork Graph

Writes require **Allow Jira changes**. Duplicate destination status names and unsupported comment visibility restrictions require Jira. The CLI has no native attachment-settings reader. An anonymous HTTP supplement reads actual Jira limits/enabled status when available; otherwise the UI explicitly reports the plugin-only fallback. See [setup and limitations](TWG_SETUP.md).

## Atlassian MCP

Host-browser OAuth consent is required; remote clients cannot complete the loopback callback on their own device. Writes require saved opt-in and granted write scope. Observed MCP transitions omit destination IDs; the adapter resolves them through exact status-name lookup and refuses ambiguous matches. This fix is mock-tested, without live move verification. Upload preparation/media response contracts are partly synthetic and may reject real variants. See [MCP setup](MCP_SETUP.md) and [implementation evidence](MCP_IMPLEMENTATION.md). Attachment settings use the same anonymous supplement as TWG. Other operating systems/native-store packaging still need verification.

## Dependency audit (historical, 2026-11-03)

The 2026-11-03 npm audit reports 12 moderate findings in the React Native development toolchain, with no high/critical findings. The proposed automatic fix changes React Native from the host-aligned version; compatibility review is required before updating it. At that checkpoint production dependencies had no reported vulnerabilities; the development-only findings and decision to avoid a forced incompatible upgrade are recorded in the security review.

Current dependency check (2026-11-05): `npm audit` reports zero known vulnerabilities in the current tree, superseding the historical finding count above. This is a point-in-time advisory result, not a security guarantee.
