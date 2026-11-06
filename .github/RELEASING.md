# Publishing Jira Sprint Workspace

Run the package checks and mock integration tests before opening the release PR. Pack the candidate using Node 24 and npm 11.5.1 or newer with `npm pack --ignore-scripts`. Keep the tarball and its SHA-256 outside the checkout. Install the extracted package on an isolated Paseo host and verify activation, reload and the Jira Workspace screen.

After merge, wait for every Checks job on the exact main commit. Verify that the retained tarball matches the tagged files. Create the annotated tag (for example, `v1.0.0`) at that commit and publish a GitHub Release with the tested tarball and `SHA256SUMS`. Include install and update commands, the full commit and both CI runs in the notes. GitHub provides the two source archives.

Run the manual `publish.yml` workflow on main with the stable version and `dry-run`. For the initial release, authenticate to npm in the terminal and publish the exact tested tarball with scripts disabled and public access. Run the workflow in `verify` mode and verify a fresh npm install in an isolated Paseo host. If npm has accepted publication, retry verification only.

For subsequent releases, configure the package’s npm trusted publisher for GitHub owner `mbranicky`, repository `jira-dashboard`, workflow `publish.yml` and environment `npm`, with direct publishing enabled. Restrict the GitHub environment to main. Run the workflow in `publish` mode after a successful dry run. Verification checks registry integrity, the distribution tag and the downloaded bytes. A Paseo directory submission is separate.
