# Credential handling and security audit

Historical REST-focused review and hardening, 3 November 2026. Scope at that checkpoint: plugin backend, settings/RPC contracts, requests, metadata caches, workspace state and agent startup. The current MCP/TWG authentication boundaries are documented in [MCP implementation](MCP_IMPLEMENTATION.md) and [TWG implementation](TWG_IMPLEMENTATION.md); this older audit does not certify those additions. Historical prototype scripts are not shipped and are not covered by the runtime guarantees below.

## Security boundary

The plugin author receives no credentials through a service operated by this project. The user owns the secret file on the Paseo host. Runtime credentials are used for authentication with Atlassian, not returned through settings/RPC, included in agent prompts, logged, or written to an additional credential file by the plugin. Settings store the file path, not its contents. Authorized remote clients share the host account's Jira access.

The token, parsed file text and Basic authorization header necessarily exist in process memory. JavaScript strings, HTTP-library buffers, garbage collection, swap, crash dumps and a compromised host are outside a secure-erasure guarantee. Buffer wiping reduces avoidable copies; it cannot make authentication memory-free. This is source review and regression-test evidence, not a guarantee against arbitrary process-memory access or every future bug. The host and its trusted plugins must be trusted.

## Findings and changes

| Area | Result |
| --- | --- |
| Secret-file access | Replaced separate path stat/read operations with open, descriptor stat and bounded read from the same descriptor. Reject symbolic links at the final path component, nonregular files and files over 64 KiB. On Unix, require ownership by the running host user and no group/other permission bits. Close the descriptor and wipe the read buffer in `finally`. Parent directories must also be trusted. |
| Windows | POSIX owner/mode checks are not Windows ACL validation. Restrict the file with Windows ACLs; this audit does not certify Windows file-access controls. |
| Credential lifetime | Comment, attachment and workflow sessions retain configuration, not a token or prebuilt authorization header. Load credentials for each authenticated request; replacement/removal takes effect on the next request. Board/workspace readers use a credential provider. Explicit connection diagnostics may retain credentials for that one short diagnostic operation. No long-lived credential cache is introduced. |
| Authorization | Build Basic headers only for the fixed HTTPS `api.atlassian.com` gateway. Tenant discovery on the validated Jira site has no authentication header. Existing endpoint allowlists and `redirect: error` prevent following attachment/auth redirects to another origin. Temporary byte buffers used to build Basic headers are wiped; resulting strings cannot be reliably erased. |
| Caching | Cache keys contain SHA-256 digests rather than raw authorization values. Normalize object, tuple and `Headers` forms so credentials cannot accidentally share cache entries. No JSON serialization of credential-bearing headers is needed. Removed an unused status-observation cache and its credential-derived keys entirely. Cached metadata is Jira response data, not an extra credential store. Cache hits do not prove a token has not been revoked; explicit connection diagnostics bypass caches. |
| Errors | Reads/comments/attachments use bounded generic transport messages. Workflow validator messages remain useful but redact the current raw token, email and Basic value before truncation. Workflow transport and JSON parse errors are replaced with safe messages. Redaction is not an arbitrary-data-loss-prevention engine; it cannot recognize every transformed secret or secrets independently included in issue content. |
| Persistence and agents | Reviewed RPC settings, workspace records, upload/preview buffers and startup flow. No deliberate token write, token-bearing prompt or credential logging path found. Attachment bytes, comment bodies and Jira content are distinct from authentication credentials and may legitimately be stored or displayed. |

The credential implementation lives in `server/credentials.ts`; transport call sites remain in `server/jira.ts`, `server/comments.ts` and `server/attachments.ts`. Approved destination construction is part of those call sites; the generic metadata cache itself is not an outbound-network firewall.

## Verification

Synthetic temporary files and injected transports cover valid file loading, unsafe permissions, symlinks, oversized/missing fields, no extra files, retained-session token rotation/removal, unauthenticated tenant discovery, gateway-only authentication, redirect rejection, comment/attachment writes, reflected workflow-error redaction (including truncation boundaries), malformed workflow responses, and cache isolation across header representations.

All 89 Node tests and both type checks passed after the hardening. The suite's local preview server runs on loopback; Jira transports in these tests are mocked. No actual token file was read, no Jira Cloud request made and no agent launched for this audit. The existing secret-audit script deliberately reads `.local/jira.env` for exact-secret matching, so it was **not run** under this task's no-secret-read constraint. UI tests were not rerun for these backend-only changes.

## Operator guidance

Use a dedicated scoped token with the minimum permissions required, keep its file outside version control, restrict it to the host user, and replace/revoke it when needed. Do not use a symlink for the file. Secure the host account, parent directories, backups and crash-dump access. Never supply the token in a prompt or support report.

This hardening does not resolve Atlassian's distribution policy. See [the authentication policy review](ATLASSIAN_AUTH_POLICY.md). Repository visibility remains private pending the separate release decision.
