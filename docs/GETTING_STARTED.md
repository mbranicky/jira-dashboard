# Getting started

Jira Dashboard is a trusted local Paseo plugin. Its backend reads the configured credential file and calls Jira Cloud as the token owner. Install it only on a host you trust. This initial repository is private; no npm or registry release is available yet.

## Install from a checkout

Use Paseo 0.14.0 or newer, Node 24, npm, and Git on the daemon machine. Compatibility is currently tested against the 0.14.0 plugin SDK. Google Chrome is needed only for browser tests.

```sh
git clone https://github.com/mbranicky/jira-dashboard.git
cd jira-dashboard
npm ci
npm run typecheck
paseo plugin install "$PWD"
```

Private repository access requires your own GitHub authentication. Enable trusted plugins in Paseo Settings → Plugins if needed. Backend plugins are unsandboxed and can access host files, credentials, processes and the network. Confirm the plugin is running with `paseo plugin ls`. Open **Jira Dashboard** in the sidebar for the same host.

## Connect Jira

1. Follow [Jira setup](JIRA_SETUP.md) to create a scoped **Jira** token and a private `jira.env` file. Use the complete scope list for all features. No password or hosted authentication service is needed.
2. In dashboard Settings, enter the board URL and absolute secret-file path on the daemon machine. On Unix the file must be owner-only (`chmod 600`).
3. Choose a refresh interval of at least 30 seconds. **Test connection** checks the entered values without saving them. It verifies authentication, board configuration, sprint access, assigned sprint issues (when a sprint exists), and independent issue search. It deliberately bypasses metadata caches. It does not test comment, attachment or transition permissions or perform writes.
4. Fix any failed step, then **Save connection**. The dashboard follows the active sprint and shows issues assigned to the token owner; future sprints can be selected manually.

## Map a project and start work

1. Create the target project in Paseo first, pointing to the intended repository/directory.
2. In dashboard Settings, add a mapping. Give it a name, Jira project key and target Paseo project. A board may contain issues from multiple projects; map each project you want to work on.
3. Select an agent provider and workspace isolation. Available models and modes depend on the provider. Optional model/mode values use provider defaults; isolation and provider are explicit because Paseo 0.14 does not expose all project defaults to plugins.
4. For Git worktrees, the plugin reuses an existing issue branch/worktree. Multiple matches open a choice dialog. A new issue branch starts from the branch currently checked out in the project. It never generates random branch suffixes.
5. Optionally enter an entry skill name, such as `init-issue`. The first prompt is `/init-issue DEMO-123`. Install/configure that skill yourself for the selected agent. Leaving it blank creates/opens the agent without sending a skill prompt.
6. Optionally choose **Start work on move to column**. Dropping an issue into that column starts/reuses work only after Jira accepts the transition. Play starts work without changing Jira status.
7. Save mappings. Select a suitable not-yet-started issue and click Play. This creates/reuses the issue-named workspace and agent; existing active workspaces get an Open workspace action. The workspace gets In Progress plus Story (green) or Bug (red) for the supported issue types.

Workspace creation and agent prompts are real actions. Review the selected project and skill before the first Play. Jira moves, comments and uploads are sent only through their corresponding explicit actions. Workflow forms and branch choices appear in dialogs, never inside issue cards.

## Details and daily use

Choose modal or right-side details in Settings. The desktop dashboard panel can be resized/collapsed; mobile uses full-screen details. A workspace's **Jira** tab detects the relevant issue from the workspace/agent label or an explicit plugin-created association. No issue-key entry is needed in that tab.

Descriptions, attachments and comments collapse independently. Replies are new top-level Jira comments linked to the original; native threaded reply creation is not supported. Markdown comment input is converted to Jira rich text. See [limitations](KNOWN_LIMITATIONS.md) and [connection troubleshooting](JIRA_SETUP.md).

## Update a local checkout

After pulling reviewed changes, run `npm ci` and `npm run typecheck`, then `paseo plugin reload jira-dashboard`. Do not restart the daemon to reload a plugin. See [Testing](TESTING.md) for developer checks and the [first-version checklist](../.claude/plans/first-version-checklist.md) for remaining release gates.
