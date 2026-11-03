# Jira Dashboard

See your assigned Jira Cloud sprint issues in the board's own columns. Search cards, follow the active sprint or choose another active/future sprint, and open issues in Jira.

Configure a board URL and private host-side jira.env file containing JIRA_EMAIL and JIRA_API_TOKEN. Credentials remain on the daemon. Authorized clients on that host share the token owner's view. Requires Paseo 0.14 and its CLI on the daemon PATH.

See the [Jira connection setup guide](docs/JIRA_SETUP.md) for the complete token scopes, secret-file setup and token replacement instructions.

Map Jira project keys to existing Paseo projects. Choose an explicit agent provider and workspace isolation; optionally set a model and entry skill. Start work creates or reuses a workspace and agent named with the issue key, adds the In Progress workspace label and opens the agent. Story/User Story issues also get a green Story label; Bug/Problem issues get a red Bug label. A blank skill opens the agent without a prompt. Configured skills receive only the Jira issue key, for example `/init-issue DEMO-1234`. The user supplies the skill and its Jira connectivity. An uncertain skill delivery is not resent automatically.

Automatic Jira updates are independent of the skill: when enabled, Start work asks you to choose an available In Progress transition before local setup. Disable the option to leave Jira unchanged. Jira workflow transitions requiring extra fields may fail. Cards always reflect Jira's confirmed status; there is no drag-and-drop. Direct token entry, creating projects within the plugin, standalone status changes and manual skill retry/rerun controls remain future work.

Workspace associations persist under the daemon home. Project-directory mode shares files with other work in that project; worktree mode creates a separate Git worktree. Removed or archived linked agents require recovery in Paseo. This version uses the Paseo 0.14 lower-level client API for labels and verifies the local daemon identity before connecting.

Read issue comments in the details modal or workspace Jira tab, including native thread nesting when Jira supplies it. Write comments with a Markdown editor and preview. Reply posts a clearly labelled top-level comment linked to the original and retains its visibility restriction; native threaded posting and attachments are not supported yet. Drafts are kept in memory until discarded, posted or the app/plugin reloads. Failed writes are not automatically retried.

Choose **Modal dialog** or **Right side panel** in Dashboard settings → Dashboard appearance. The side panel keeps the board interactive while you browse ticket details; narrow screens use full-screen details. The preference saves automatically per host.
