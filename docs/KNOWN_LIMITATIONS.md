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
- The repository is public and includes Atlassian MCP support on `main`. Version 1.0.0 is in preparation. Install from source until the first release. Registry release requirements are tracked in the [checklist](../.claude/plans/first-version-checklist.md).

## Paseo hosts

| Host | 1.0.0 verification |
| --- | --- |
| macOS on Apple silicon | Verified on a local Paseo host. Host testing covers Paseo 0.14.0 and 0.15.0. |
| Linux | Automated checks run on Ubuntu. Installation on a running Linux daemon and MCP credential storage through Secret Service remain unverified. |
| Windows and Intel Macs | Host installation and credential storage remain unverified. |

The mobile review covered a client connected to a Paseo host. See the [verification record](TESTING.md) for details.

## Teamwork Graph

Writes require **Allow Jira changes**. Duplicate destination status names and unsupported comment visibility restrictions require Jira. The CLI has no native attachment-settings reader. An anonymous HTTP supplement reads actual Jira limits/enabled status when available; otherwise the UI explicitly reports the plugin-only fallback. See [setup and limitations](TWG_SETUP.md).

## Atlassian MCP

Host-browser OAuth consent is required; remote clients cannot complete the loopback callback on their own device. Writes require saved opt-in and granted write scope. Observed MCP transitions omit destination IDs; the adapter resolves them through exact status-name lookup and refuses ambiguous matches. This fix is mock-tested, without live move verification. See [MCP setup](MCP_SETUP.md) and [implementation evidence](MCP_IMPLEMENTATION.md). Attachment settings use the same anonymous supplement as TWG.

MCP attachment preview and download were verified on macOS on Apple silicon. Uploads are available with Jira changes enabled and have been tested only with simulated responses. If the plugin cannot confirm an upload, refresh the issue’s attachments and check Jira before trying again. If the file is missing, you can upload it directly in Jira. The MCP catalogue describes the upload steps but provides no output schema for the upload instructions or the returned file ID.

## Dependency audit (historical, 2026-11-03)

The 2026-11-03 npm audit reports 12 moderate findings in the React Native development toolchain, with no high/critical findings. The proposed automatic fix changes React Native from the host-aligned version; compatibility review is required before updating it. At that checkpoint production dependencies had no reported vulnerabilities; the development-only findings and decision to avoid a forced incompatible upgrade are recorded in the security review.

Current dependency check (2026-11-05): `npm audit` reports zero known vulnerabilities in the current tree, superseding the historical finding count above. This is a point-in-time advisory result, not a security guarantee.
