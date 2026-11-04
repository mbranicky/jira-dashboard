# Known limitations

- One Jira Cloud site per Paseo host. Jira Server/Data Center and multiple sites are not supported.
- All clients on that host use the configured REST token or Teamwork Graph profile's permissions. Jira project and issue permissions still apply in addition to token scopes.
- Connection diagnostics verify dashboard/search reads, not every comment, attachment or transition permission. A successful check is not a write-permission guarantee.
- Replies are top-level comments with a link to the original. Native threaded reply creation and reactions are not supported.
- Some workflow fields cannot be completed through the plugin; the transition dialog directs the user to Jira. Failed moves keep the original column.
- Panel selection/size and comment drafts are session state. Plugin/app restart clears them. Sprint selection is persisted per board. Search and mobile-column selection are not restored after dashboard navigation.
- Provider and isolation choices are explicit. Paseo 0.14 does not expose every saved project default through its plugin API.
- Attachment support has transfer/type/client limits documented in [Jira setup](JIRA_SETUP.md). Local browser preview is for local desktop connections; remote/mobile use in-app preview.
- Automated browser tests use host adapters and synthetic Jira data. They do not prove real Jira permissions or every host/device behavior. The user completed a mobile review; clean Git installation was also verified. Real Jira write tests are not a release requirement. See [Testing](TESTING.md).
- This is a private development checkpoint, not a published release. Public-release gates remain in the [checklist](../.claude/plans/first-version-checklist.md).

## Teamwork Graph

Writes require **Allow Jira changes**. Duplicate destination status names and unsupported comment visibility restrictions require Jira. The CLI does not expose attachment settings, so the plugin applies its 25 MiB cap and Jira checks the actual server limit during upload. See [setup and limitations](TWG_SETUP.md).

## Dependency audit

The 2026-11-03 npm audit reports 12 moderate findings in the React Native development toolchain, with no high/critical findings. The proposed automatic fix changes React Native from the host-aligned version; compatibility review is required before updating it. Production dependencies have no reported vulnerabilities; the development-only findings and decision to avoid a forced incompatible upgrade are recorded in the security review.
