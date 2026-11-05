# Atlassian MCP v2 implementation

Current checkpoint: 2026-11-05, branch `codex/mcp-v2-oauth`. MCP implements board/details/comments/attachment reads, local Start work and opt-in Jira writes. The user verified OAuth and these read paths on the local host. Writes are tested with mocks; a user-created comment exposed a receipt-normalization bug that is now fixed. Name-only transition destinations now resolve through status lookup with mocked regression coverage; upload response contracts remain partly unverified. This is not unrestricted live parity or release certification.

## Connection and credentials

The SDK connects to `https://mcp.atlassian.com/v2/mcp?tools=all`, validates advertised inputs and bounds catalogue pagination to 100 pages. Separate read/write allowlists reject unknown or destructive operations. Structured output or one JSON text result is required; malformed/prose/error envelopes fail closed. No generic tool-call API is exposed to clients.

OAuth uses PKCE, random state, a host loopback callback, ten-minute expiry and replay rejection. Consent is explicit and must complete on the Paseo host. Remote/mobile users receive host-browser guidance; Continue in browser opens the validated URL without printing it. Read/search consent requests `read:me`, `read:account`, `offline_access`, `read:jira:agent-interface` and `search:jira:agent-interface`. The saved write opt-in adds `write:jira:agent-interface` on explicit reconnection; delete/manage scopes are excluded.

Identity verification uses `atlassianUserInfo` and `getAccessibleAtlassianResources`, matching the configured site exactly and pinning account/cloud/site. Observed v2 responses include `data.accountId` without a display name and `data.resources[]` with cloudId/url. Supported legacy profiles remain, but conflicting aliases, duplicate matches, nested errors and changed bindings fail closed. No identity is inferred from email or display names.

Credentials are stored under `paseo-jira-dashboard.mcp-v2`, namespaced by stable host identity and canonical site. Records include registration, tokens and verified binding, never PKCE/state. New grants persist only after verification. Refresh rotation persists synchronously. If a same-grant refresh omits scope, preserve the prior scope; explicit reductions replace it. New consent, changed client/issuer and invalidation break scope continuity.

Dashboard reads restore saved authorization passively after reload. Concurrent restoration is coalesced; failed restoration needs an explicit retry and never opens consent. Cancellation/closing Settings/switching methods retains saved authorization. Reconnect upgrades retain the prior saved grant until replacement verification succeeds. Disconnect deletes the selected local entry, reporting deletion failures; it does not revoke Atlassian consent remotely.

### Native-store helper and installation

`@napi-rs/keyring` 2.1.2 uses Keychain, Windows Credential Manager or Linux Secret Service, without a plaintext fallback. `scripts/prepare-native.mjs` records the installation Node executable and resolved native package location in an ignored installation-local file. The manifest runs preparation after production dependency installation. Moving an installation requires preparation again.

Paseo's signed macOS runtime cannot load the independent native library directly, so a standalone Node helper communicates over private stdin/stdout, with a 15-second timeout and 256 KiB output cap. No tokens in arguments, environment, logs, settings or RPC responses; inherited Node preload options are removed. A standalone Node installation must remain available at the prepared path. Credentials necessarily exist in process memory; zeroization is not guaranteed. Other trusted code running as the same OS user remains outside this boundary.

User sign-in works on the current macOS host. Cross-platform packaging/native-store behavior still requires verification. Historical pre-MCP installation checks do not prove this dependency path.

## Reads and shared local behavior

- Board: `getJiraBoardConfig`, `listJiraBoardSprints`, `getJiraBoardIssueData`; complete bounded pagination and current-account filtering. Full issue/search output is requested where supported. The advertised sprint enum requires `all` then local active/future filtering, which still scans historical pages. Board configuration cache: ten minutes, 32 boards per connection; refresh invalidates it, issues/sprints remain fresh.
- Details: exact-key search with binding checks and common issue normalization. Dashboard scope remains current-user/sprint; workspace lookup is independent. Missing, ambiguous and mismatched results stay distinct.
- Rich text: inert HTML parsing through pinned parse5 into shared native blocks; ADF/wiki subsets supported. No raw HTML execution or remote media fetch. Embedded media uses an issue/comment link placeholder.
- Comments: paginated full HTML reads, common author/date/activity normalization and shared threading. Native parent IDs win; generated linked replies render nested across all transports. See the maintenance rule in [Design](../DESIGN.md#linked-reply-presentation-compatibility).
- Attachments: metadata from the exact issue; `downloadJiraIssueAttachment` returns observed `data.downloadUrl` plus unused `downloadCommand`. Only the URL is fetched. HTTPS Atlassian media host allowlist, no credentials/custom ports/redirects/OAuth forwarding, exact size validation, 25 MiB file cap, 60-second timeout. Memory cache: 120 seconds/50 MiB, currently no in-flight reservation.
- Local Start work: shared eligibility, mapping, branch/worktree reuse, workspace/agent labels and optional entry skill. Play never changes Jira. Manual workspace discovery and its recoverable warning are shared by all transports.

## Settings and read-only connection report

One connection-method dropdown preserves per-method settings. The MCP option is labelled “Atlassian MCP”. Allow Jira changes through MCP lives inside the connection-method card. Saving it does not itself request consent.

Test connection checks unsaved board URL, fresh authentication/site binding, catalogue compatibility, board, sprints, assigned sprint issues and independent issue search. It uses a fresh metadata cache, retains passed stages on failure, skips issue access without sprints, and samples one of multiple active sprints without saving a selection. It reuses/restores authorization without consent; another draft site cannot replace an active connection. No settings save or comment/attachment/transition permission test occurs.

## Writes and response handling

All writes require saved opt-in, granted scope, pinned binding and compatible tool inputs. No mutation is automatically retried. Uncertain delivery retains drafts and requires checking Jira before another attempt; session receipts are not an exactly-once guarantee across reloads.

**Transitions:** `listJiraIssueTransitions` requests screen fields; shared workflow validation selects an exact transition and confirms fresh status after submission. A user attempt on 2026-11-05 revealed `to.name` and `to.statusCategory.key` but no `to.id`. The REST-shaped parser rejected it before submission. User-triggered diagnostics also confirmed site status lookup output `data.statuses[]` containing IDs/names. The adapter uses advertised `listJiraStatuses` with `mode: site` and `nameContains`, requiring one exact name match. It rejects ambiguous/malformed/explicitly incomplete results, preserves screen fields, and resolves afresh before submission. `mode: status` by name is unsuitable because its advertised contract picks one match with a warning. Full destination IDs bypass lookup. The temporary probe was removed; readable errors remain. This fix is mock-tested; no live successful transition is claimed.

**Comments:** `addOrEditJiraIssueComment` accepts Markdown, requests HTML, and preserves parent role/group visibility. Internal JSM replies and unpreservable restrictions require Jira. The UI creates comments, not edits; `commentId` is an edit target, not a parent. Observed creation output is a receipt containing `data.commentId`, body, message and appliedContentFormat. The adapter reads the exact numeric ID through bounded comment pagination to obtain real author/timestamps; full-comment output remains supported. The user observed the saved reply before this fix; the corrected confirmation flow is mock-tested.

**Uploads:** two tool phases (`filePath`, then `fileId`) surround a bounded media HTTP upload. A restricted curl grammar is interpreted as data, never executed; bytes come only from the selected buffered file, never a returned path. Only approved HTTPS `api.media.atlassian.com` upload/file destinations and media-token headers are accepted, with no redirects/OAuth forwarding. Fresh metadata must identify exactly one new attachment matching filename and size. Exact preparation/media output profiles are not verified; see evidence below.

## Verification and follow-up

Automated checks use synthetic HTTP, mocked stores/tool results and desktop/mobile RPC fixtures, without live Jira writes. Coverage includes OAuth exchange/rotation/restart/binding, scope continuity, lifecycle cancellation, read pagination, comment receipt readback, write deduplication, status/attachment confirmation failures, unsafe upload rejection and diagnostic privacy. See [Testing](TESTING.md) and the current [handoff](AGENT_HANDOFF.md) for dated results.

Full automated/local verification passed on 2026-11-05; see [Testing](TESTING.md). Remaining work includes authoritative upload output contracts and native-store packaging on other hosts. Temporary response-shape, OAuth progress and catalogue logs have been removed. Production logging accepts only fixed failure codes, with a runtime allowlist and no payload argument. Client errors remain sanitized; commands, tokens, schema metadata and content are not logged.

### Status/upload response-contract audit (2026-11-05)

The status adapter does not normalize a transition acknowledgement as a REST issue: it verifies a fresh `getJiraIssue` status ID against the chosen target. The upload adapter likewise ignores the successful final acknowledgement's shape and confirms exactly one new matching attachment through fresh issue metadata. Both still require the shared MCP decoder's structured output or single JSON text envelope; prose/empty content and tool errors remain uncertain failures, never retried automatically.

Upload preparation and media transfer have unverified output contracts: preparation expects `data.uploadCommand`, accepts only the restricted curl-data grammar in `server/mcp-upload.ts`, and media upload expects `data.id`. These are synthetic profiles, not live-verified responses. Do not broaden their parser based on guessed alternatives or claim live upload compatibility. A different plan, command grammar or media receipt can still fail; a final confirmation read can also fail after the attachment was saved. Filename/size/new-ID matching rejects multiple candidates but is not exact receipt-ID correlation if a concurrent identical upload occurs.

Mock coverage now includes status receipt variants, wrong/malformed/unreadable status confirmation, explicit rejections, upload completion receipt variants, unsupported preparation/media responses, absent/ambiguous/wrong-size/unreadable attachment confirmation, and JSON/structured versus error/prose MCP envelopes. Every failure checks that mutations are not repeated. The audit changed tests/documentation only; no speculative runtime parser changes and no live writes.

### Documentation and live catalogue verification (2026-11-05)

Read-only catalogue inspection after plugin reload confirmed the current `uploadAttachmentToJiraIssue` description and input schema. No upload tool invocation or media request was performed.

| Contract element | Evidence and result |
| --- | --- |
| Two phases | Confirmed by current tool description: request upload instructions with `filePath`, upload bytes locally, then attach with `fileId`. |
| Input names | Current input schema has `cloudId`, `issueIdOrKey`, `filePath`, `fileId`; only the first two are required, additional properties forbidden. |
| Upload command | The description/input field documentation names `uploadCommand`, but gives no JSON response nesting or exact curl syntax. |
| Output schema | Current tools/list metadata contains no outputSchema (diagnostic records null). |
| `data.uploadCommand` | Not fully verified: command name is confirmed, `data` wrapper remains an adapter assumption. |
| Media response `data.id` | Not verified by the MCP catalogue or accessible official documentation. Description says the local upload obtains a fileId, without defining its JSON location. |
| Upload destination/method/headers/grammar | Exact command format remains unverified; do not relax the restricted parser on speculation. |
| Phase-two output | No documented JSON shape obtained; existing adapter confirms fresh issue attachment metadata instead. |

Sources checked:
- [Atlassian supported tools](https://developer.atlassian.com/cloud/rovo-mcp/guides/supported-tools/), updated November 2, 2026: catalogue/discovery overview, no exact upload response contract found.
- [Atlassian maintainer confirmation of attachment support](https://github.com/atlassian/atlassian-mcp-server/issues/125): confirms feature availability, not output schemas.
- [Atlassian cloud domains](https://support.atlassian.com/organization-administration/docs/ip-addresses-and-domains-for-atlassian-cloud-products/): identifies api.media.atlassian.com for attachment uploads in migration contexts; this does not establish the MCP upload command or media response contract.
- Referenced Media API documentation under developer.atlassian.com/platform/media/media-api/ was inaccessible through the browsing tool; no schema was inferred from it.

The current catalogue description/input schema are stronger evidence for this connection than unrelated REST attachment response examples. Full response compatibility remains unverified without an authoritative output specification or a safely captured genuine user upload response. No speculative parser change was made. The temporary catalogue diagnostics used for this investigation have since been removed. The evidence above is retained; unresolved upload contracts remain unresolved.

### Actual attachment settings for MCP and TWG (2026-11-05)

The current MCP attachment schemas/catalogue and installed TWG 1.4.2 command inventory do not expose a native instance attachment-settings reader. TWG attachment `get` reads one attachment by ID, not the instance settings. Do not invent a metadata tool/CLI command or use write operations to probe limits.

Atlassian explicitly documents `GET /rest/api/3/attachment/meta` as anonymously accessible, with no required permissions, returning `{enabled, uploadLimit}`: [Get Jira attachment settings](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-meta-get).

`server/attachment-settings.ts` therefore supplies a narrow anonymous metadata read for MCP and TWG upload sessions. This is an HTTP supplement, not a native MCP/TWG capability. It sends no OAuth/CLI/REST credentials or cookies, permits only the configured HTTPS *.atlassian.net origin, rejects redirects, and bounds response size/time. It does not change the selected connectivity type or route uploads through REST. MCP still checks write opt-in/scope/tool capability first.

Valid Jira settings are used by the shared UI and upload preflight/recheck. Disabled attachments block upload; the size cap is the smaller of Jira's value and the plugin's 25 MiB ceiling. If anonymous access fails or the response is malformed, existing plugin-only upload capability remains, explicitly marked `limitSource: plugin` with a UI notice that Jira settings could not be read. In this fallback, enabled means the plugin can attempt upload, not that Jira's enabled flag was verified. Jira enforces actual settings/permissions during upload. Native readers should replace this supplement when supported contracts become available.

Validation uses injected mock HTTP only; no live settings endpoint or write was invoked as a test.
