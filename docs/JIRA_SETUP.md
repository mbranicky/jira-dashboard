# Jira connection setup and API token scopes

This is the official connection guide for Jira Dashboard. It covers credentials, required API scopes and token replacement for the supported Jira Cloud REST connection. No hosted authentication service, Atlassian password or MCP connection is required.

## Configure the connection

1. Create a scoped Jira API token using the checklist below.
2. Create a private `jira.env` file on the machine running your Paseo daemon. You may choose its location; keep it outside the project repository, for example `~/.config/paseo/jira-dashboard/jira.env`.
3. Add the token owner's email and token to that file:

   ```dotenv
   JIRA_EMAIL=your.work.email@example.com
   JIRA_API_TOKEN=your-scoped-api-token
   ```

4. On macOS/Linux, restrict the file to its owner with `chmod 600 /absolute/path/to/jira.env`. On Windows, restrict access through file permissions. Never commit this file or share its contents.
5. Open Jira Dashboard connection settings. Enter your full Jira Cloud board URL and the **absolute path** to the secret file. Expand `~` to your actual home directory; the plugin requires an absolute path. For remote Paseo hosts, this is a path on the daemon machine, not your phone or desktop client.
6. Use **Test connection** to check the entered values without saving or writing to Jira, then save and refresh the dashboard. The workspace Jira issue tab uses the same connection.

A board URL looks like `https://your-company.atlassian.net/jira/software/c/projects/PROJECT/boards/123`. The plugin supports one Jira Cloud site. The board determines columns and sprints; only issues assigned to the token owner appear on the dashboard. Workspace issue lookup can read other issues visible to that account. Authorized Paseo clients connected to the host share that account's Jira view.

Use the twelve-scope read-only set for the current dashboard and workspace details. Add the eight status-update scopes for drag-and-drop Jira transitions. The full 27-scope list covers implemented comments and linked replies, and attachment viewing/uploading.

## Complete token scope checklist

Create a **new API token with scopes**, selecting **Jira** (not Atlassian MCP or MCP V2), at [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).

Existing token scopes cannot be edited. To change scopes, create a replacement token with the complete applicable list below, replace `JIRA_API_TOKEN` in your configured `jira.env` file, verify the connection, then revoke the superseded token. Keep `JIRA_EMAIL` set to the token owner's email. Do not paste tokens into chat. Keep the file owner-only (`chmod 600`), owned by the Paseo host user, and use a regular file rather than a symlink. The plugin reads credentials on each request; use Refresh after replacement.

### Complete list for supported capabilities (27 scopes)

For full functionality, select all scopes in this single deduplicated list. It covers the current dashboard, workspace details and board status transitions, plus comment reading/posting and attachment viewing/uploading, including upload-limit discovery.

```text
read:application-role:jira
read:attachment:jira
read:audit-log:jira
read:avatar:jira
read:board-scope.admin:jira-software
read:comment.property:jira
read:comment:jira
read:field-configuration:jira
read:group:jira
read:instance-configuration:jira
read:issue-details:jira
read:issue-meta:jira
read:issue-security-level:jira
read:issue.changelog:jira
read:issue.transition:jira
read:issue.vote:jira
read:issue:jira
read:jql:jira
read:project-role:jira
read:project:jira
read:sprint:jira-software
read:status:jira
read:user:jira
write:attachment:jira
write:comment:jira
write:issue.property:jira
write:issue:jira
```

Comments, linked replies, attachment viewing and uploading are implemented. Scope verification is against the official API contract, not a successful live call with the replacement token. No delete scopes are requested. The following sections explain the breakdown; they do not add scopes beyond these 27.

### Required for dashboard and workspace issue details (12 scopes)

```text
read:application-role:jira
read:audit-log:jira
read:avatar:jira
read:board-scope.admin:jira-software
read:field-configuration:jira
read:group:jira
read:issue-details:jira
read:issue-meta:jira
read:jql:jira
read:project:jira
read:sprint:jira-software
read:user:jira
```

These cover the assigned-sprint board, dashboard details modal and independent workspace issue panel. These reads do not need write scopes. Play creates or reuses a workspace and agent without changing Jira status. Comment posting and attachment uploads require their own write scopes below.

### Also required for board Jira status transitions (8 additional scopes)

Add **all eight** below to the twelve above for board drag-and-drop transitions (20 scopes total):

```text
read:issue:jira
read:issue-security-level:jira
read:issue.changelog:jira
read:issue.transition:jira
read:issue.vote:jira
read:status:jira
write:issue:jira
write:issue.property:jira
```

The extra read scopes cover the existing issue-status lookup and available transitions. The two write scopes cover the transition endpoint. Moving a card to a different column requests a Jira transition. The mapping's **Start work on move to column** option controls whether a successful move also starts work in Paseo; Play itself never changes Jira. No delete scope is needed. Jira account permissions and workflow rules still apply.

### Comments and attachments (7 additional scopes)

Add these seven to the twenty current-feature scopes above:

```text
read:attachment:jira
read:comment:jira
read:comment.property:jira
read:instance-configuration:jira
read:project-role:jira
write:attachment:jira
write:comment:jira
```

This corrects the earlier five-scope suggestion: comment endpoints also require `read:project-role:jira`; reading attachment enabled/size-limit settings requires `read:instance-configuration:jira`. The latter is for upload preflight, not the upload POST itself. Other comment/attachment dependencies (user, avatar, group, project and application-role reads) are already included in the current-feature list.

Read comments through the paginated per-issue GET endpoint. Do not use the bulk `POST /rest/api/3/comment/list` endpoint, whose documented granular scope list includes `delete:comment.property:jira`; that endpoint is unnecessary for this feature. Adding a normal comment does not require `write:comment.property:jira`.

Posting new comments and linked replies uses the verified Add comment endpoint. A linked reply is a top-level comment with a link to the original, clearly labelled in the editor; it is not a native threaded reply. Existing native threads are read through the dedicated comments endpoint, retaining `parentId` when present. The currently published Add comment schema does not document a parent-comment field. Linked replies preserve the original comment's visibility restriction; internal service-management comments must be replied to in Jira. [Atlassian's parent-ID tracking issue](https://jira.atlassian.com/browse/JRACLOUD-99839) documents the difference between search and dedicated comment reads.

Jira project permissions still apply: Browse projects, Add comments, and Create attachments as applicable, plus issue security and restricted-comment visibility. Attachment settings may disable uploads or impose size limits. Uploads use multipart form data with a `file` field and `X-Atlassian-Token: no-check`; credentials remain on the host. No comment posting or attachment upload was performed for this documentation verification.

### Endpoint coverage and sources

Verified against Atlassian's reference and full OpenAPI scope declarations on 3 November 2026. Scope lists are endpoint-level requirements even when only selected fields are requested. The `admin` in the board configuration scope is part of a read scope. The plugin does not read audit logs or votes; those scopes appear in Atlassian's requirements for the search/issue endpoints.

| Endpoint | Required granular scopes |
| --- | --- |
| GET /rest/api/3/status | read:status:jira |
| GET /rest/api/3/myself | read:application-role:jira, read:group:jira, read:user:jira, read:avatar:jira |
| GET /rest/agile/1.0/board/{boardId}/configuration | read:board-scope.admin:jira-software, read:project:jira |
| GET /rest/agile/1.0/board/{boardId}/sprint | read:sprint:jira-software |
| GET /rest/software/1.0/board/{boardId}/sprint/{sprintId}/issue | read:sprint:jira-software, read:issue-details:jira, read:jql:jira |
| GET /rest/api/3/search/jql | read:issue-details:jira, read:audit-log:jira, read:avatar:jira, read:field-configuration:jira, read:issue-meta:jira |
| GET /rest/api/3/issue/{key}?fields=status | read:issue-meta:jira, read:issue-security-level:jira, read:issue.vote:jira, read:issue.changelog:jira, read:avatar:jira, read:issue:jira, read:status:jira, read:user:jira, read:field-configuration:jira |
| GET /rest/api/3/issue/{key}/transitions | read:issue.transition:jira, read:status:jira, read:field-configuration:jira |
| POST /rest/api/3/issue/{key}/transitions | write:issue:jira, write:issue.property:jira |
| GET /rest/api/3/issue/{issueIdOrKey}/comment | read:comment:jira, read:comment.property:jira, read:group:jira, read:project:jira, read:project-role:jira, read:user:jira, read:avatar:jira |
| POST /rest/api/3/issue/{issueIdOrKey}/comment | read:comment:jira, read:comment.property:jira, read:group:jira, read:project:jira, read:project-role:jira, read:user:jira, write:comment:jira, read:avatar:jira |
| GET /rest/api/3/issue/{issueIdOrKey}/comment/{id} | read:comment:jira, read:comment.property:jira, read:group:jira, read:project:jira, read:project-role:jira, read:user:jira, read:avatar:jira |
| GET /rest/api/3/attachment/{id} | read:attachment:jira, read:user:jira, read:application-role:jira, read:avatar:jira, read:group:jira |
| GET /rest/api/3/attachment/content/{id} | read:attachment:jira |
| GET /rest/api/3/attachment/thumbnail/{id} | read:attachment:jira |
| GET /rest/api/3/attachment/meta | read:instance-configuration:jira |
| POST /rest/api/3/issue/{issueIdOrKey}/attachments | read:user:jira, write:attachment:jira, read:attachment:jira, read:avatar:jira |

Sources: [current user](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-myself/#api-rest-api-3-myself-get), [board and sprint reads](https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/), [enhanced search](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get), [issue and transition operations](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [comments](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/), [attachments](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/), [full platform OpenAPI specification](https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json), [software OpenAPI specification](https://dac-static.atlassian.com/cloud/jira/software/swagger.v3.json).

The plugin discovers the cloud ID from the configured site's public `/_edge/tenant_info` endpoint without sending credentials. Authenticated calls go only to `https://api.atlassian.com/ex/jira/{cloudId}`. Redirects are rejected. The env file is parsed as data and never executed or loaded into the process environment.

## Troubleshooting and verification

- **Scope mismatch:** compare the token's selected scopes with the complete applicable checklist. Token scopes cannot be edited; create a replacement and update the configured file.
- **Credentials rejected:** check the email, token expiry and whether Jira was selected as the token product.
- **Access denied or no visible issue:** token scopes do not override Jira project permissions, issue security or comment visibility.
- **File cannot be read:** check the absolute path on the daemon host and owner-only permissions.
- **Status transition unavailable:** check the issue workflow and the account's Transition issues permission. The move dialog supports editable fields supplied by Jira. Unsupported fields are identified as requiring completion in Jira. Failed moves leave the issue in its original column.

After replacing a token, use Refresh. Validate reads before enabling board status transitions. Scope requirements here are verified against the official endpoint contracts; granting scopes alone does not establish that a particular account can perform every operation.

For developers, the repository's read-only connection harness can be run with Node 22 or newer:

```sh
npm run rest -- /absolute/path/to/jira.env 'https://your-company.atlassian.net/jira/software/c/projects/PROJECT/boards/123'
```

The harness performs GET requests and writes a private local result; it does not test comment posting, attachments or Jira transitions. Historical development results live in `prototype/VALIDATION.md` in the source repository.

### Attachment transfer limits and clients

Both issue details surfaces list attachments with filename, size, author and creation time. Safe raster images can be previewed. Desktop and browser clients can download files and select a single file for explicit upload. Native iOS/Android clients use Open/Upload in Jira because Paseo 0.14 does not expose a native file picker to plugins.

In-app transfers are limited to 25 MiB per file and uploads also respect Jira’s configured limit. Larger files remain accessible in Jira. Credentials stay on the host; files transfer in bounded chunks. Uploads are not automatically retried after uncertain delivery. Refresh and check Jira before selecting the file again. Attachments are added to the issue, not a restricted comment. Deleting attachments and embedding them in comments are not supported.

Read-only verification on 2026-11-01 confirmed attachment listing, upload-limit discovery and downloading an existing attachment for DEMO-7415. Upload behavior is covered by mocked tests; no test file was uploaded to Jira.

Local browser image previews: the attachment external action opens PNG, JPEG, GIF and WebP inline through a temporary server bound only to 127.0.0.1. Random preview URLs expire after five minutes, images remain in memory (25 MiB per file, 50 MiB combined), and plugin shutdown removes them. Jira tokens never enter the browser URL. A nonce probe checks that the selected host is reachable on the client’s loopback; mobile clients, remote hosts and failed local previews fall back to the existing in-app image preview. Non-image external actions continue to open the containing Jira issue. This supersedes the earlier external-action description for images.


### Start work status for board moves
Choose **Start work on move to column** in each project mapping. The selector lists unique configured board columns alphabetically. It reads the cached board configuration only, without requesting a project workflow or status-name catalog. All underlying Jira statuses in the selected column participate in the trigger. Jira still checks each issue's actual transitions. Existing saved individual status selections resolve to their containing column. Refresh columns bypasses the board configuration cache. No new token scopes are needed.

### Metadata caching
Only HTTP 200 responses containing valid JSON are cached in host memory. Workflow status names are cached for one hour; the remaining lifetimes are:
- Site/cloud ID: 24 hours, shared across board, issue, comments and attachments operations.
- Current-user identity: 1 hour.
- Board configuration: 10 minutes.

Caches are bounded, isolated by URL and credentials, coalesce concurrent requests and reset on plugin reload. Credential changes use a different cache key; secrets are never written to disk by this cache. Errors are not cached. Issue content, sprint lists, transitions and all writes remain fresh. The unused status-observation cache has been removed.


### Public distribution review

Research completed on 3 November 2026: **public-distribution clearance is not established**. Atlassian documents API tokens for personal scripts but warns against third-party apps collecting them. No explicit exception was found for our user-hosted, open-source plugin. Reading a user-owned secret file is a security distinction, not confirmed policy permission. See the [authentication policy review](ATLASSIAN_AUTH_POLICY.md) for official sources, implementation boundaries and the precise questions for Atlassian. Keep public distribution and registry submission pending written clarification or a supported authentication design; the current implementation is unchanged.

### Credential security

See the [credential-handling audit](CREDENTIAL_SECURITY.md) for enforced file checks, credential lifetime, destination/redirect restrictions, cache isolation and safe errors. Tokens necessarily exist in host memory while authenticating; the plugin does not promise memory-free handling or secure erasure of JavaScript strings.
