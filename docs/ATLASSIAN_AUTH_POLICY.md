# Atlassian authentication policy review

Reviewed: 3 November 2026. Status: research complete; public-distribution clearance **not established**.

## Conclusion

Do not treat the current local API-token design as approved for a publicly distributed Jira integration. Atlassian documents tokens for personal scripts, but its integration guidance rejects collecting user tokens and recommends a distributable OAuth app. No explicit exception for a free, open-source, user-hosted Paseo plugin was found in the sources below.

This is a release-risk assessment, not a legal determination or a statement from Atlassian about this particular plugin. Keep the repository private and the registry submission gate open pending written clarification or an authentication design that follows the documented integration model. Private repository visibility alone does not establish compliance.

## What the official sources establish

| Source | Finding and limits |
| --- | --- |
| [Basic authentication guidance](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/) | Recommends basic authentication for simple scripts/manual calls. Warns that apps collecting API tokens or requiring individual customer-created OAuth apps do not comply with its cloud-app security requirements and acceptable-use policy. Recommends a single distributable 3LO app. |
| [Account API-token guide](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/) | Documents user-created tokens for scripts, including scopes and expiration. Availability of scoped tokens demonstrates technical support, not blanket permission for third-party distribution. |
| [Third-party integration guidance, 6 June 2025](https://www.atlassian.com/blog/developers/building-secure-and-scalable-integrations-our-guidance-for-third-party-apps) | Describes token sharing/storage by third-party services as problematic, in part because API traffic cannot be attributed reliably. Recommends Forge or distributable 3LO. States that the standards apply regardless of public availability or Marketplace suitability; its migration deadline was 31 December 2025. Thus a Paseo-only listing is not an established exemption. |
| [Cloud-app security requirements](https://developer.atlassian.com/platform/marketplace/security-requirements/) | Prohibits covered apps from collecting/storing Atlassian account credentials, including API tokens. Its app categories do not explicitly classify a standalone Paseo plugin. Local file permissions and scopes do not themselves create a policy exception. |
| [Acceptable Use Policy](https://www.atlassian.com/legal/acceptable-use-policy) | The developer guidance links to this policy. Do not present the guidance's API-token warning as a verbatim clause of the AUP or infer a local-plugin exemption from the AUP's general wording. |

## How our implementation differs, and what remains uncertain

The user creates and owns `jira.env` on their Paseo host. `server/jira.ts` reads the file and constructs authentication headers for Jira REST requests; comments and attachments use the same host-side credentials. The plugin author operates no credential broker or hosted token database. Remote Paseo clients can use the host's configured Jira connection, so “local” means the user's host, not necessarily the viewing device.

These are meaningful security differences from sending tokens to a vendor-operated service. However, the distributed plugin still reads a user token and acts through it. The reviewed policies do not define whether that constitutes prohibited collection in this exact deployment. Treating a file-path input as an exemption would be our interpretation, not confirmed permission. MIT licensing, free distribution, scoped tokens and no vendor backend do not settle that question.

Personal API usage is documented. That does not establish that every private integration is exempt, nor that this plugin can be distributed as a supported integration on that basis. Publishing source code and promoting an installable Jira integration are also distinct questions; this review does not conclude that merely sharing source is prohibited.

## Routes to close the release gate

1. Obtain written Atlassian clarification specifically covering the architecture above and distribution through GitHub/Paseo. Record the response, date, scope and any conditions here before marking the gate complete.
2. If no exception applies, investigate a single distributable OAuth integration. The [documented 3LO flow](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) uses a client secret for token exchange and refresh. Shipping that shared secret in an open-source desktop plugin is not a secure solution. A fully local public-client flow must be confirmed with Atlassian; this review does not establish its availability. Asking every user to register their own OAuth app is specifically discouraged by the integration guidance.

A hosted service has not been authorized, and authentication has not been changed. MCP is not an established replacement for our complete REST feature set in this review.

## Questions for Atlassian support

Use [Atlassian Developer support](https://developer.atlassian.com/support). No support request has been sent.

- Does a free MIT-licensed plugin, executed entirely on a user's own host, reading their user-created scoped Jira token from a private file and sending it only to Atlassian for authentication, count as collecting credentials under the third-party integration rules?
- May this model be distributed through GitHub and the Paseo registry without a vendor-operated backend? Does sharing the host's Jira view with its authorized remote clients affect the answer?
- If it is permitted, what attribution, documentation, distribution or storage conditions apply?
- If it is not permitted, what supported authentication flow is available for a public native client without a distributable client secret or a developer-operated authentication service?

## Verification boundary

Only public Atlassian documentation and local source were inspected. No Jira tenant API calls, credential reads, token replacement or test writes were performed for this review. Authentication code is unchanged. Documentation formatting is checked separately; application test results cannot establish policy approval.

## Alternative connectivity research

The [3 November connectivity report](JIRA_CONNECTIVITY_OPTIONS.md) compares official MCP v2, TWG CLI, ACLI, direct OAuth, third-party wrappers and Forge. MCP v2 and TWG OAuth are candidates for evaluation; documented capabilities are not verified tenant compatibility or distribution approval. The existing release gate remains open.
