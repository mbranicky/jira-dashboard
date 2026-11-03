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

Final baseline: 78 automated tests passed, type checking passed, and 86 Git candidate files passed the audit. A synthetic credential canary was detected without disclosing its value, then removed. The final 55-file package dry run had no private artifacts.

Run `npm run audit:secrets` before staging and again before committing. Inspect `git diff --cached` and `git diff --cached --name-only` when a real repository/index exists. Ignore rules do not protect files force-added to Git; the audit includes those tracked files. Do not paste matching credentials into issue reports or CI output.

This heuristic scan is not an entropy scanner and does not scan historical commits, ignored private data, or arbitrary encoded credentials. No project Git history exists to inspect yet. Add a maintained secret scanner in CI before the public release. If any real credential has ever been committed or shared, revoke/rotate it; ignoring or deleting it from a later commit is insufficient.

No evidence of a credential in the current source candidates was found. No credential rotation was performed. Public license selection and repository creation remain separate tasks.
