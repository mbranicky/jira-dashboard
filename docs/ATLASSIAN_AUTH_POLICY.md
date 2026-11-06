# Atlassian authentication policy review

Reviewed 6 November 2026. Paseo registry submission is awaiting Atlassian’s written response on local REST token use and shared-host access for REST and Teamwork Graph CLI. Both questions are tracked in [ECOHELP-182681](https://ecosystem.atlassian.net/servicedesk/customer/portal/34/ECOHELP-182681).

## Conclusion

Do not treat the current local API-token design as approved for a publicly distributed Jira integration. Atlassian documents tokens for personal scripts, but its integration guidance rejects collecting user tokens and recommends a distributable OAuth app. No explicit exception for a free, open-source, user-hosted Paseo plugin was found in the sources below.

This is a release-risk assessment, not a legal determination or a statement from Atlassian about this particular plugin. The source repository is now public. Registry submission remains pending written clarification or an authentication design that follows the documented integration model.

## What the official sources establish

| Source | Finding and limits |
| --- | --- |
| [Basic authentication guidance](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/) | Recommends basic authentication for simple scripts/manual calls. Warns that apps collecting API tokens or requiring individual customer-created OAuth apps do not comply with its cloud-app security requirements and acceptable-use policy. Recommends a single distributable 3LO app. |
| [Teamwork Graph CLI FAQ](https://developer.atlassian.com/cloud/twg-cli/faq/) | Atlassian documents tools invoking the CLI, interactive OAuth login, and delegated OAuth for applications that manage credentials. The FAQ describes access in terms of the authenticated user. It does not address multiple people acting through one Paseo host profile. |
| [Account API-token guide](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/) | Documents user-created tokens for scripts, including scopes and expiration. Availability of scoped tokens demonstrates technical support, not blanket permission for third-party distribution. |
| [Third-party integration guidance, 6 June 2025](https://www.atlassian.com/blog/developers/building-secure-and-scalable-integrations-our-guidance-for-third-party-apps) | Describes token sharing/storage by third-party services as problematic, in part because API traffic cannot be attributed reliably. Recommends Forge or distributable 3LO. States that the standards apply regardless of public availability or Marketplace suitability; its migration deadline was 31 December 2025. Thus a Paseo-only listing is not an established exemption. |
| [Cloud-app security requirements](https://developer.atlassian.com/platform/marketplace/security-requirements/) | Prohibits covered apps from collecting/storing Atlassian account credentials, including API tokens. Its app categories do not explicitly classify a standalone Paseo plugin. Local file permissions and scopes do not themselves create a policy exception. |
| [Acceptable Use Policy](https://www.atlassian.com/legal/acceptable-use-policy) | The developer guidance links to this policy. Do not present the guidance's API-token warning as a verbatim clause of the AUP or infer a local-plugin exemption from the AUP's general wording. |

## How our implementation differs, and what remains uncertain

The user creates and owns `jira.env` on their Paseo host. `server/credentials.ts` reads the file and constructs authentication headers for Jira REST requests; comments and attachments use the same host-side credentials. The plugin author operates no credential broker or hosted token database. Remote Paseo clients can use the host's configured Jira connection, so “local” means the user's host, not necessarily the viewing device.

These are meaningful security differences from sending tokens to a vendor-operated service. However, the distributed plugin still reads a user token and acts through it. The reviewed policies do not define whether that constitutes prohibited collection in this exact deployment. Treating a file-path input as an exemption would be our interpretation, not confirmed permission. MIT licensing, free distribution, scoped tokens and no vendor backend do not settle that question.

For TWG, the user installs Atlassian’s CLI and signs in on the host. The plugin invokes that executable with the selected profile. TWG manages its credentials. The Paseo package contains no TWG binary. Ordinary CLI invocation by a tool is documented in the [TWG FAQ](https://developer.atlassian.com/cloud/twg-cli/faq/).

Both adapters act as the host’s configured Atlassian account. The account owner accessing their own host from a second device and a different person connecting to that host are distinct cases. In the latter case, Jira evaluates reads and attributes writes to the configured account. Paseo client access alone does not establish that person’s Jira permissions.

## Before registry submission

All three connection methods remain in scope for 1.0.0. Record Atlassian’s written answer here with its date, scope and conditions. If each person needs their own identity, address that requirement before submission. If local REST token use is disallowed, confirm a supported alternative for a user-hosted public client. The [documented Jira OAuth flow](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) uses a client secret. An open-source plugin cannot keep a bundled shared secret confidential.

## Submitted support request

Submitted to Atlassian Developer Support on 6 November 2026. Awaiting a response to both questions. [ECOHELP-182681](https://ecosystem.atlassian.net/servicedesk/customer/portal/34/ECOHELP-182681).

**Subject:** Jira Cloud authentication for a user-hosted Paseo plugin: local REST tokens and shared host access

Hello Atlassian Developer Support,

I maintain Jira Sprint Workspace, a free, open-source plugin for Paseo. Before submitting version 1.0.0 to the Paseo registry, I’d like to confirm two aspects of our Jira Cloud integration. The plugin runs on the user’s own host. The publisher operates no backend and receives no credentials.

1. **Local REST token.** The user creates a scoped Jira API token and stores it in a private file on their host. The plugin accepts the file path, reads the token locally, and sends it directly to Atlassian to authenticate REST requests. Under your guidance on third-party apps collecting API tokens, may we distribute this design through the Paseo registry? If a different design is required, which supported flow can a user-hosted public client use without distributing a shared client secret or requiring each customer to register an OAuth app?
2. **Access from connected clients.** In REST mode the host uses the configured token. In Teamwork Graph CLI mode the user separately installs Atlassian’s CLI and signs in with OAuth. Our plugin invokes their named CLI profile without bundling the binary or extracting tokens. For each mode, may the account owner read Jira and initiate writes from both their laptop and phone through that host? If a different person connects to the same host, must they authenticate with their own Atlassian account before viewing Jira data or initiating writes? Today those actions use the host account’s permissions and identity.

Please point us to the applicable guidance and any conditions we need to meet for registry distribution. The [public repository](https://github.com/mbranicky/jira-dashboard) includes the source and setup guides.

Thank you.

## Verification boundary

Only public Atlassian documentation and local source were inspected. No Jira tenant API calls, credential reads, token replacement or test writes were performed for this review. Authentication code is unchanged. Documentation formatting is checked separately; application test results cannot establish policy approval.

## Alternative connectivity research

The [3 November connectivity report](JIRA_CONNECTIVITY_OPTIONS.md) compares official MCP v2, TWG CLI, ACLI, direct OAuth, third-party wrappers and Forge. MCP v2 and TWG OAuth were candidates at that research checkpoint and are now implemented with documented compatibility limits; neither documentation nor user-observed functionality establishes distribution approval. The existing release gate remains open.
