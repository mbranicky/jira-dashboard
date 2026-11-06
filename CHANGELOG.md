# Changelog

## 1.0.0

First release under the display name **Jira Sprint Workspace**. The Paseo installation ID and npm package name are both `paseo-jira-sprint-workspace`. Existing development installations used `jira-dashboard`. See the [upgrade instructions](docs/GETTING_STARTED.md#updating-from-the-development-id).

- Connect to Jira Cloud through REST, Teamwork Graph CLI OAuth, or Atlassian MCP OAuth. Test board access before saving, and opt in to Jira changes when using either OAuth connection.
- Browse assigned issues by sprint, search by key or title, and return to the same search and mobile column after visiting a workspace.
- Create or reuse issue workspaces and agents with project-specific settings and an optional entry skill. Open matching manually created workspaces from the board.
- Read rich issue details in a modal, side panel or workspace tab. Post Markdown comments and linked replies, preview or download attachments, and upload files on supported clients. If comment delivery is uncertain, refresh the comments beside the retained draft before deciding whether to retry.
- Drag cards to request Jira workflow transitions. Review required fields and optionally start work after a successful move.

The verified Paseo host is macOS on Apple silicon. Linux has automated test coverage on Ubuntu. Windows and Intel Mac hosts are unverified. MCP attachment preview and download were verified on the Mac host. MCP uploads have been tested only with simulated responses. See [known limitations](docs/KNOWN_LIMITATIONS.md) for upload recovery and host credential storage.
