# Pre-Git secret and private-data audit

Reviewed 2026-11-03, before this project has Git history. This is a point-in-time review, not a guarantee that all possible credentials can be detected.

## Findings and fixes

- `.local/` and `node_modules/` were already ignored. Local Jira credentials have file mode 0600; the containing `.local` directory has mode 0700. Credential values were not printed or copied into reports.
- Added ignore patterns for environment files, private-key containers, logs, package archives, operating-system files, coverage, and generated test reports. Explicit `.env.example` templates remain eligible for source control and still need review.
- Removed the company-specific fallback URL from the REST prototype. Its board URL is now an explicit argument.
- Replaced tenant/issue examples in public documentation and test fixtures with generic example values. Replaced detailed live-validation history with a short historical summary. Original notes were retained under ignored `.local/pre-git-audit/`.
- Added `npm run audit:secrets`. It enumerates Git candidates using Git's ignore rules and checks tracked files too, even if they subsequently become ignored. Before initialization it uses a disposable Git directory outside the project; it does not initialize this checkout.
- The audit checks common credential signatures, long literal credentials, private-key headers, private artifacts, symlinks requiring review, and exact matches to the current local Jira token and its Basic-auth encoding when available. Reports contain paths/categories only, never matching values.
- Runtime authentication uses headers. Reviewed REST request code does not log token/header values. This review is not a complete security review of all runtime behavior.
- `npm pack --dry-run --json` listed 55 publishable files and no environment files, `.local`, images, logs, archives, or dependency directories. No package was published or archive created.

## Verification and limits

Earlier pre-initialization baseline: 78 automated tests passed, type checking passed, and 86 Git candidate files passed the audit. A synthetic credential canary was detected without disclosing its value, then removed. The final 55-file package dry run had no private artifacts.

Run `npm run audit:secrets` before staging and again before committing. Inspect `git diff --cached` and `git diff --cached --name-only` when a real repository/index exists. Ignore rules do not protect files force-added to Git; the audit includes those tracked files. Do not paste matching credentials into issue reports or CI output.

This heuristic scan is not an entropy scanner and does not scan historical commits, ignored private data, or arbitrary encoded credentials. The pre-initialization audit had no project history to inspect. A maintained Gitleaks scan has now been added to CI; see the release-readiness review below. If any real credential has ever been committed or shared, revoke/rotate it; ignoring or deleting it from a later commit is insufficient.

No evidence of a credential in the current source candidates was found. No credential rotation was performed. MIT and the private `mbranicky/jira-dashboard` repository were subsequently selected by the owner.

Initial commit checkpoint: all 107 staged source/documentation/test files passed the repeated scan; no environment files, screenshots or logs were staged. The updated package check passed for 62 files. Both type checks, 83 Node tests and 16 browser tests passed. The credential file and private audit backups remain ignored.


## Release-readiness review, 2026-11-03

Gitleaks 8.30.1 was downloaded from its official GitHub release and verified against the release SHA-256. It scanned all four reachable commits using `--log-opts=--all`, plus an isolated copy of current tracked/untracked Git candidates: no findings. Ignored local credentials, caches and test artifacts were excluded from that copy. Scanner output is fully redacted; no report containing credential values is published.

Run `npm run audit:history` with Gitleaks 8.30.1 on PATH, or set `GITLEAKS_BINARY` to that executable. This complements the existing custom private-artifact audit. CI checks out full history and installs the checksum-pinned scanner before running the same script. Remote CI for this change has not yet run. Repeat after final staging; these results do not cover future commits.

The fresh dependency audit reports no production vulnerabilities. The full development dependency tree has 12 moderate findings, no high/critical findings, rooted in minimatch glob-pattern denial of service through React Native tooling. This code is excluded by production `npm ci --omit=dev`. npm's proposed automatic fix changes the host-aligned React Native version to 0.88.1, so no forced upgrade was applied. Do not expose development tooling to untrusted glob inputs. Reassess this development-only risk when updating the host baseline.
