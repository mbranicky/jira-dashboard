# Atlassian MCP OAuth setup

MCP is an optional connection for Jira Sprint Workspace. It supports board and issue reads, comments, attachment preview/download and local Start work. Opt-in Jira write adapters are implemented, but name-only transition destinations require an unambiguous status lookup. See [known limitations](KNOWN_LIMITATIONS.md#atlassian-mcp).

## Connect on the Paseo host

1. Open Jira Sprint Workspace → Settings and enter the Jira Cloud board URL.
2. Choose **Atlassian MCP** in Connection method.
3. Use the sign-in action, confirm that you are on the Paseo host, then choose **Continue in browser** and complete Atlassian consent there. A phone or remote computer cannot complete the callback to the host's loopback listener.
4. Check the displayed account/site. Select **Test connection** for the read-only step report, then **Save connection** and **Back to board**.
5. If Jira changes are wanted, enable **Allow Jira changes through MCP**, choose **Reconnect MCP**, complete the additional host-browser consent and save. The switch alone does not grant write access.

Test connection checks unsaved values without saving or writing Jira. It verifies authentication, tool compatibility, board, sprint, assigned issues and independent issue search. It does not verify comment, upload or transition permissions. A different draft site cannot replace an active connection during this test.

## Credentials and recovery

OAuth credentials stay in the host OS credential store through a local Node helper, not ordinary settings or a REST token file. Installation prepares its native dependency paths; keep the installation Node executable available. Saved authorization restores after plugin reload without opening consent. Failed restoration needs an explicit retry in Settings.

Cancelling sign-in or switching connection methods preserves saved authorization. Disconnect explicitly removes the selected local saved entry; revoke Atlassian consent separately if needed. Changing the pinned account/site requires deliberate disconnection and authorization of the intended account. Do not disconnect merely to reload the plugin.

## Daily use and limits

Play creates/reuses local work and never changes Jira. Workflow moves, comments and uploads use explicit actions and require write opt-in plus consent. Linked replies are top-level Jira comments shown nested in the dashboard. Uncertain writes are never retried automatically: refresh and check Jira before trying again.

Attachment transfers are capped at 25 MiB. An anonymous, credential-free Jira metadata read supplies the actual enabled status/limit when available; otherwise the UI identifies the plugin-only fallback. Uploads still use MCP, not REST credentials. Native mobile file picking and other shared limits are documented in [Known limitations](KNOWN_LIMITATIONS.md).

MCP attachment preview and download were verified on macOS on Apple silicon. Uploads are available with Jira changes enabled and have been tested only with simulated responses. If the plugin cannot confirm an upload, refresh the issue’s attachments and check Jira before trying again. If the file is missing, you can upload it directly in Jira. See [Paseo hosts](KNOWN_LIMITATIONS.md#paseo-hosts) for platform coverage. [Implementation notes](MCP_IMPLEMENTATION.md) distinguish observed contracts from synthetic fixtures.
