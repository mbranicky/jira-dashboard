# Jira Cloud connectivity options

Historical research dated 3 November 2026. The recommendations and untested claims below describe that date, not current implementation status. MCP and TWG have since been implemented; see [MCP implementation](MCP_IMPLEMENTATION.md), [TWG implementation](TWG_IMPLEMENTATION.md) and [current limitations](KNOWN_LIMITATIONS.md). This research does not establish public-distribution approval.

## Recommendation

Evaluate **official Atlassian Rovo MCP v2 with OAuth** first, and **official Teamwork Graph CLI (TWG CLI) with OAuth** alongside it. Both are materially more promising than substituting another API-token wrapper. Keep the current implementation while evaluating; do not remove working features based on a tool catalogue alone.

The important change since our earlier investigation is that MCP v2 now documents board configuration, sprint operations, comments and attachment tools. Our earlier authentication failures do not establish that these capabilities are unavailable today, but neither does the updated documentation prove that our standalone client can authorize successfully. The findings below are documentation-backed; none were tested against a Jira tenant.

Our priority is a predictable dashboard that does not require us to operate an authentication server. Calling a deterministic MCP tool or CLI command does not require asking Claude to interpret every operation. The user's optional entry skill remains a separate Start work action.

## What we must preserve

- Actual board columns and their status mappings; active/future sprints; assigned-to-me filtering and pagination.
- Independent issue lookup for workspace tabs, descriptions, custom fields and rich content.
- Workflow transitions, required-field forms and useful validation errors.
- Comments with author, creation/update dates, visibility and linked replies.
- Attachment metadata, preview, download and upload, including remote/mobile Paseo clients.
- Current workspace/branch reuse, agent creation and optional entry skill behavior.
- Host-side credentials, no secrets in browser state, prompts, logs or exported settings.

A successful search or issue-read command is insufficient to establish replacement parity.

## Comparison

The assessments here are engineering judgments based on the sources in the following sections.

| Option | Authentication | Infrastructure we operate | Assessment |
| --- | --- | --- | --- |
| Current direct REST | Scoped user API token | None | Best-known feature coverage; unresolved public-distribution policy gate |
| Official MCP v2 | Browser OAuth | Local client; Atlassian hosts service | First candidate; verify schemas, binary transfers and authorization |
| Official TWG CLI | Browser OAuth managed by CLI | Local executable | Strong second candidate; verify stable command contracts and credential storage |
| Official ACLI | Browser OAuth available | Local executable | Useful partial route; documented gaps for this dashboard |
| Direct REST with 3LO | Our distributable OAuth app | Secure secret handling architecture unresolved | Closest API migration, but documented exchange needs client secret |
| Third-party Jira CLI/local MCP server | Usually existing token or separately configured OAuth | Local executable/server | Different interface does not resolve authentication policy by itself |
| Forge companion app | Atlassian app permissions plus external-client authentication | App deployed on Atlassian | Possible larger redesign; not strictly local-only |
| Ask an agent to perform dashboard operations | Agent's configured connector | Agent dependency | Appropriate for skills, unsuitable as the dashboard's primary data layer |

## 1. Official Atlassian MCP v2

Use the current endpoint `https://mcp.atlassian.com/v2/mcp`. Atlassian recommends OAuth for interactive use and documents administrator-enabled API-token authentication for noninteractive scenarios. These are distinct choices; the MCP token scopes are not the same as our REST scopes. [Authentication](https://developer.atlassian.com/cloud/rovo-mcp/guides/authentication-and-authorization/), [API-token configuration](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-authentication-via-api-token/).

Relevant documented tools:

| Dashboard need | Tool candidates |
| --- | --- |
| Board columns/status mappings | `getJiraBoardConfig` |
| Sprint selection/data | `listJiraBoardSprints`, `getJiraBoardSprintData` |
| Identity and issue lookup | `getJiraCurrentUser`, `getJiraIssue`, `searchJiraIssuesUsingJql` |
| Workflow operations | `listJiraIssueTransitions`, `transitionJiraIssue` |
| Comments | `listJiraIssueComments`, `addOrEditJiraIssueComment` |
| Attachments | `downloadJiraIssueAttachment`, `uploadAttachmentToJiraIssue` |

The catalogue includes deferred tool discovery; available tools depend on authorization. A flat catalogue is available through `?tools=all`. Tool names establish candidates, not field-level compatibility. [Supported tools](https://developer.atlassian.com/cloud/rovo-mcp/guides/supported-tools/).

Atlassian's official repository documents local MCP clients and custom integrations. We could implement an MCP client on the Paseo host rather than depend on Claude's private connection. OAuth still entails local access/refresh credentials; it does not mean no secrets exist. Redirect-domain restrictions and organization settings can affect consent. [Official integration repository](https://github.com/atlassian/atlassian-mcp-server), [OAuth configuration](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-oauth-2-1/).

Before selecting it, establish:

1. Exact structured response schemas, pagination and preservation of ADF/custom fields.
2. Transition IDs, required-field metadata, field payloads, validators and actionable errors. A transition tool alone does not prove our dynamic form works.
3. Comment visibility and reply relationships; preserve our explicit linked-reply behavior unless a supported native threading contract is proven.
4. Attachment byte-transfer protocol. A remote server cannot directly read a file on the user's host simply because the tool description says local file. Inspect upload staging and download URL lifetime, size limits and permitted origins. Never execute a returned shell command blindly.
5. Standalone OAuth registration, renewal, revocation and mobile-to-host authorization. Do not reuse Claude's credentials or send an MCP access token directly to unrelated REST resources. MCP authorization requires resource-specific token handling. [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

Our original site-selection error remains unexplained. Possible causes must be investigated from sanitized protocol evidence rather than guessed from the successful Claude connection. No new authorization attempt is part of this report.

## 2. Official Teamwork Graph CLI

TWG CLI is separate from ACLI and from third-party `jira` executables. It supports browser OAuth and can be invoked by tools, not only conversational agents. Its FAQ also documents delegated OAuth, which is not automatically a solution when the embedding application does not already have a supported credential lifecycle. [TWG FAQ](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/faq/).

The stable command catalogue lists issue query/get, transition discovery/execution, sprint work-item queries, comment reads/writes, and attachment upload/download/thumbnail operations. These make it a serious candidate. It distinguishes direct-product commands from enriched, credit-consuming graph operations. [Command catalogue](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/commands/commands-catalog/).

Authentication credentials are local. The documentation describes experimental encrypted storage that is not enabled automatically, with different key-storage arrangements across operating systems. Therefore we cannot claim that using TWG automatically meets our credential-storage expectations. [Authentication and storage](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/getting-started/how-authentication-works/).

Proposed integration: call a pinned supported CLI through argument arrays, consume structured output, enforce timeouts and output limits, and leave authentication ownership with the CLI. Do not read its credential files. Confirm exact board column/status mapping output, workflow-field schemas, comment visibility fidelity and attachment behavior before choosing it. Check stable release capabilities separately from the beta catalogue; the changelog explicitly distinguishes beta releases. [Changelog](https://developer.atlassian.com/cloud/twg-cli/changelog/).

Tradeoff: easier authentication delegation and local file transfers, but an additional installed binary, platform support, upgrade compatibility and process-management work. These are implementation costs, not measured performance findings.

## 3. Official Atlassian CLI (ACLI)

ACLI supports `acli jira auth login --web`. Its token alternative currently documents an unscoped token, so we should not assume it accepts our existing scoped-token configuration. [Login reference](https://developer.atlassian.com/cloud/acli/reference/commands/jira-auth-login/).

It provides board sprint listing with JSON output and state filtering, and work-item operations. However, the reviewed board command reference does not expose board configuration, the attachment group lists only list/delete, and the transition command does not document a transition-field payload or metadata discovery. These are documented-surface gaps, not proof that future versions cannot add them. [Board commands](https://developer.atlassian.com/cloud/acli/reference/commands/jira-board/), [Sprint listing](https://developer.atlassian.com/cloud/acli/reference/commands/jira-board-list-sprints/), [Attachment commands](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-attachment/), [Transitions](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-transition/).

Comment creation accepts text or ADF input. That is useful but does not alone establish restricted-comment reply parity. [Comment creation](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-comment-create/).

Recommendation: do not select ACLI as the sole backend for the current feature set on this evidence. Do not extract its OAuth token to bypass missing commands.

## 4. Direct REST with OAuth 2.0 (3LO)

This would preserve most of our existing endpoint and error-handling logic. Atlassian recommends a single distributable OAuth integration rather than requiring customers to create their own applications. However, its documented token exchange and refresh use a client secret. Shipping a shared secret inside a public plugin does not keep it confidential. This review found no confirmed native public-client REST flow that removes that concern. [Jira 3LO documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).

A hosted broker could protect that secret but conflicts with the preference not to operate such a service. Ask Atlassian whether an officially supported native/public-client flow is available before designing a local-only REST OAuth replacement. MCP OAuth support does not prove the same flow is supported for direct Jira REST.

## 5. Third-party CLI and local MCP wrappers

Two concrete examples are [ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli) and [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian). They provide useful command/tool interfaces; their documented token-based setups still require Jira credentials. A local MCP wrapper is different from Atlassian's hosted MCP service.

We would inherit another dependency and its configuration, credential handling, API coverage and upgrade behavior. Where a wrapper offers OAuth, evaluate that actual flow rather than assuming the word MCP solves distribution policy. These are useful for personal skills but currently offer no clear advantage over our existing REST adapter for the plugin.

## 6. Forge companion

Forge can host an Atlassian-side integration without us running a conventional server. It still requires a deployed app, installation and permission design, plus a secure way for Paseo to call it. Forge web triggers do not automatically authenticate incoming callers; they also do not provide an interactive user context for `asUser` calls. [Web-trigger runtime](https://developer.atlassian.com/platform/forge/runtime-reference/web-trigger/), [Web-trigger module](https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/).

A companion must not turn app-level Jira permissions into unrestricted access for anyone possessing a URL. Pairing, authorization, revocation and tenant isolation become our responsibility. This is a larger product architecture, not the first experiment for a local dashboard.

## Skills and Claude: what changes, and what does not

A skill tells an agent how to use tools. The underlying transport is still REST, MCP or a CLI, and authentication belongs to that transport. A working Claude skill may therefore demonstrate a useful connector without supplying a reusable login for Paseo.

Recommended separation:

- Dashboard requests go directly through a deterministic host-side adapter.
- Start work creates/reuses the workspace and agent using existing logic.
- The optional `/entry-skill ISSUE-123` prompt remains user-configured and may use whatever Jira tools the user prefers.

Routing refreshes through a language model would add latency, variable outputs and provider coupling. Those costs are avoidable; an MCP client can invoke named tools directly. Browser automation or copying a logged-in browser's cookies is also not proposed as a production connector.

## Security, cost and operational requirements

No option can guarantee that credentials never exist in memory. OAuth reduces manual token handling but still uses bearer credentials. Keep the existing honest guarantees in [Credential security](CREDENTIAL_SECURITY.md): no prompts/logging/browser exposure, bounded lifetime, protected storage and restricted destinations.

For an OAuth adapter, use OS-protected storage where available, isolate accounts/sites in caches, clear them on logout, redact errors, and handle revoked sessions visibly. For CLI adapters, never put secrets in command arguments or inspect another application's authentication store. For signed attachment URLs, treat the URL itself as sensitive.

Do not assume every MCP/CLI call is free or every call is billed. Atlassian distinguishes enriched Teamwork Graph operations, which may consume Rovo credits, from other operations. Recheck the chosen commands and current terms before shipping. [Rovo licensing](https://www.atlassian.com/licensing/rovo).

Our implementation should cache successful slowly changing board metadata, deduplicate concurrent reads, pause unnecessary polling, respect rate-limit responses and avoid blind retries of writes. Illustratively, three calls every minute already produce 180 calls per hour per active client; this is arithmetic, not a measured provider limit. Benchmark latency and quotas for the chosen adapter later.

Public-product availability is not blanket approval of our precise embedding/distribution model. The existing [policy review](ATLASSIAN_AUTH_POLICY.md) remains open; OAuth candidates improve the architecture but do not retroactively approve the token-based release.

## Proposed next work and decision gates

1. Define one backend contract matching today's UI needs. Keep UI and workspace lifecycle independent of transport.
2. Build synthetic fixtures and contract tests for MCP v2 and TWG candidate adapters. Include multiple statuses per column, pagination, rich descriptions, restricted comments, edited timestamps, binary uploads and denied transitions requiring fields.
3. Inspect publicly available schemas/help and pin versions. Mark any missing capability explicitly; do not quietly fall back to a user API token or remove functionality.
4. Compare installation, secure OAuth storage, remote/mobile flows, errors, latency and cost. Prefer MCP if parity and standalone authentication are established; prefer TWG if its supported commands give a more reliable complete contract.
5. Obtain any necessary Atlassian clarification about public distribution/embedding. Resolve the REST public-client question only if direct REST remains a candidate.
6. Any future live authorization or tenant verification requires separate authorization. Mock tests establish our adapter behavior, not actual tenant compatibility. No live write tests are required by this plan.

**Decision today:** investigate MCP v2 and TWG OAuth adapters; do not migrate, publish, or recreate tokens yet.

## Research boundary

This report uses public documentation and local project documentation. No real token or authentication store was read, no Jira tenant connection was made, and no CLI login or agent skill was executed. The repository remains private. Application code, package version and current authentication are unchanged.
