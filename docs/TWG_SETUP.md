# Teamwork Graph CLI OAuth setup

TWG is an optional connection for Jira Dashboard. Existing installations keep REST
until **Teamwork Graph CLI** is enabled. This connection supports dashboard
and issue reads, comments, attachment viewing/downloads and local Start work.
Jira changes are disabled by default. Enable **Allow Jira changes**
in Settings to use workflow moves, comment posting/replies and attachment uploads.

## Set up on the Paseo host

1. Install TWG on the machine running the Paseo daemon, following the
   [official installation guide](https://developer.atlassian.com/platform/teamwork-graph/twg-cli/getting-started/installation/).
   **1.4.2 is the verified baseline** for this integration; later versions must
   retain its command/output contracts. Older versions without `--profile` are
   rejected. The plugin does not install, update or bundle TWG.
2. In a terminal on that host, sign in using a named profile and your Jira site:

   ```sh
   twg login --profile jira-dashboard --site your-company.atlassian.net
   ```

   Complete browser consent with the intended work account. The terminal belongs
   on the host even when you use Paseo from a phone or another computer.
3. Open **Jira Dashboard → Settings**, enter the full board URL and enable
   **Teamwork Graph CLI**.
4. Set **TWG executable on host** to `twg`, or preferably its absolute path if the
   daemon's PATH differs from your terminal. Set **TWG profile** to the exact name
   used at login, such as `jira-dashboard`.
5. Select **Test connection** to verify authentication, board access, sprints,
   assigned sprint issues and independent search. Fix any failed step, then
   **Save connection**. Settings stay open; use **Back to board** to return.
6. Enable **Allow Jira changes** and save if you want workflow moves, comments,
   linked replies and uploads. Write permissions are not exercised by the test.

No `jira.env` file or API token is required for TWG mode. A previously saved REST
file path remains available when you switch back to REST, but TWG never uses it
as a fallback. One Jira Cloud site is supported per host.

## What is available

| Feature | Teamwork Graph |
| --- | --- |
| Board columns, assigned issues, active/future sprints | Available |
| Saved sprint choice | Available per board; Auto selects only a single active sprint |
| Descriptions and Jira fields | Dashboard modal/panel and workspace Jira tab |
| Comments | Read, with author and creation/edit timestamps |
| Attachments | List, preview and download; 25 MiB transfer limit |
| Play / Open workspace | Available under the existing eligibility and mapping rules |
| Status transitions and drag-and-drop | Available with Jira changes enabled; ambiguous status names require Jira |
| Add comment / linked reply | Available with Jira changes enabled; visibility must be preservable |
| Upload attachment | Available with Jira changes enabled; Jira enforces its server limit at upload |

Play creates or reuses a local workspace and agent. When configured, it sends
`/entry-skill ISSUE-KEY`. The plugin does not transition Jira through Play.
The user-provided skill controls its own actions and can independently change
Jira. Configure no entry skill to open an agent without dispatching one.

## Recovery and privacy

- **Expired sign-in or wrong account:** in the host terminal run
  `twg login --force --profile jira-dashboard --site your-company.atlassian.net`,
  complete consent, then retry the connection test or refresh.
- **CLI not found/profile unsupported:** check the executable's absolute path
  and installed version. Updating a different installation will not change the
  binary used by Paseo.
- **Permission denied:** verify the selected account, site access and any
  organizational policy. It is not displayed as a missing issue.
- **No Jira issue found:** an explicit lookup 404 can mean the issue is absent or
  unavailable to the profile. The workspace tab offers no manual key entry.
- **Rate limit/timeout:** wait and retry. The plugin does not automatically log
  in or retry mutations.
- **Several active sprints:** choose one explicitly; the plugin does not infer
  a team from account membership.

OAuth and credential storage belong to TWG. The plugin does not open TWG credential
files or extract tokens for REST calls. TWG runs as the Paseo host user and can
access that user's CLI credentials. Authorized clients connected to that host
share its configured Jira access. CLI output is bounded and errors use fixed,
sanitized guidance; credentials are not passed to agents.

This private integration does not establish public-distribution or
CLI embedding permission. See [implementation and review notes](TWG_IMPLEMENTATION.md)
and the [authentication policy review](ATLASSIAN_AUTH_POLICY.md).

## Write-mode limitations

TWG does not expose the server's attachment settings in the inspected command
surface. The UI explicitly shows the 25 MiB plugin cap; Jira may reject files under
a smaller server limit or when attachments are disabled. Transition discovery
returns destination names without IDs: duplicate names on the board are refused
rather than guessed. Internal comments and replies with only visibility identifiers
(no transferable role/group name) must be handled in Jira.

Uncertain write results are never retried automatically. Refresh and check Jira
before submitting again. Disabling Jira changes hides write controls and blocks
new submissions on the server; it cannot undo a request already sent to Jira.

## Connection diagnostics

**Test connection** runs fresh read-only checks of the entered values without
saving them: board URL, CLI profile support, authenticated user, board columns,
active/future sprints, assigned sprint issues and independent JQL issue search.
Sprint and issue reads validate all pages. With no available sprint, sprint issue
access is marked skipped; independent search still runs with a one-issue limit.
Failures identify the step and retain completed checks in the same status table
used by REST. No API token file is read and no Jira write is performed. Leaving
Settings cancels an outstanding check. A successful test does not establish write
permissions for comments, attachments or transitions.
