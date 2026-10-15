# Contributing

## Setup

Install `just`, `fnm`, and `uv`, then set up the development environment:

```bash
just dev
```

This installs Node.js 24 from `.nvmrc`, installs the locked JavaScript dependencies with
`fnm exec -- npm ci`, synchronizes the Python environment including the `docs` group, and
downloads Playwright's Chromium runtime for visual tests. `just install` remains a compatible
entry point for the same setup. Run `just dev` again after dependency changes or `just mr-proper`.

Dependencies are downloaded from the official npm registry (`registry.npmjs.org`) and PyPI
(`pypi.org`). Node.js releases are installed through `fnm` from the official Node.js distribution.
Linux hosts may also need Playwright system libraries; install those using your system's
package manager or run `uv run --group docs playwright install-deps chromium` with the required
permissions. Integration tests download their isolated VS Code test runtime on first use.
The full visual campaign also requires `plantuml` and Graphviz on `PATH` for its successful
diagram cases. GitHub Actions installs both from Ubuntu packages; on macOS use
`brew install plantuml graphviz`.

## Dependency Updates

Run `just update` to upgrade JavaScript dependencies, regenerate the npm lockfile against the
public registry, upgrade the Python environment and lockfile, and refresh Playwright Chromium.
The Node.js runtime stays on the version selected by `.nvmrc`; its type declarations stay on
Node 24, and the VS Code API declaration floor stays aligned with `engines.vscode`.
Python declarations retain floors compatible with Python 3.10 while the lockfile selects newer
releases for newer interpreters. Run `just preflight` after updating.
CI uses `STUDIO_NPM` to run the Node.js version selected by `actions/setup-node` without `fnm`.

Security overrides keep the MyST dependency tree on patched parser releases.
The install script applies two import-path corrections for MyST's current packages so they
work with Markdown-It 14. Revisit these corrections when updating `myst-to-html` or
`markdown-it-dollarmath`; installation fails if their versions or expected imports change.

## Cleanup

`just clean` removes compiled output, reports, the generated Pages site, VSIX packages,
generated README gallery captures, and Python test caches. Dependencies, `.env`, manual images,
and source fixtures are preserved. Campaign screenshots are generated under
`out/reports/e2e/screenshots/`; the obsolete `test/visual/screenshots/` directory is not tracked.

`just mr-proper` also removes `.env`, `node_modules/`, `.venv/`, the downloaded VS Code test
runtime, and local tool caches. It returns the local build environment to an uninstalled checkout.

## Checks

Run the package-local checks before opening a pull request:

```bash
just check
just sphinx-check
just e2e
just site
just preflight
just package
```

The full integration and screenshot campaigns require a local VS Code installation and the
Playwright browser runtime. They can be run with `just integration`, `just visual`, and `just e2e`.
Generated reports are stored under `out/reports/`; the README-derived Pages tree is stored under
`out/site/`. `just preflight` runs every stage and returns a failure if any stage fails.

The focused site and gallery commands are:

```bash
just gallery
just site
```

`just gallery` runs the complete E2E campaign and copies the three selected real-input captures
into `images/`. It also runs `scripts/generate-readme-images.py`, which uses Pillow to derive the
compact install, feature, and theme images under `images/readme/` from passing visual and real VS
Code captures. It only overwrites those selected and derived filenames plus `images/gallery.json`;
unrelated manual images and future video assets remain untouched. `just site` builds the E2E
evidence, gallery, and static Pages tree. The published `out/site/gallery.html` includes every
screenshot recursively from `out/reports/e2e/screenshots/`, not just the README selections. Each
caption shows the sidecar summary. Selecting an image opens the full sidecar on the left and the
image on the right; on narrow screens the sidecar appears above the image. Historical captures
remain visible with their original metadata and are not certified as part of the latest passing
campaign.

The shared logo source is [images/logo.svg](images/logo.svg).
After editing it, run `fnm exec -- npm run logo:generate` to regenerate the PNG used by the README
and VS Code Marketplace, and the Sphinx favicon. Chromium must be installed through `just dev`.
The generated site uses the SVG directly for its header and favicon.

The static-site URL tests cover rendered Markdown documents, the repository's `out/reports/` path,
copied assets with query and fragment suffixes, and absolute URLs. The site publisher maps local
report artifacts into the published `reports/` tree without relativizing external URLs.

The E2E review index is only passed when the visual and integration artifacts share the current
campaign UUID, start time, and command. A failed `review:begin` stops `test:e2e`; stale visual
manifests cannot certify a later run.

## Scope

Keep the extension standalone. Runtime code and tests must not resolve files from a parent
repository. The Sphinx configuration under `sphinx/` is intentionally limited to the MyST
features needed by Studio preview contracts.

## Screenshot Review

Run `fnm exec -- npm run test:e2e` from the extension directory for the complete campaign. The
command checks static captures, all integration hosts, scroll synchronization, frontmatter
interactions, actual Developer: Reload Window restoration, and close/reopen persistence.

The ordered entry point is `out/reports/e2e/REVIEW.md`. Each new image has an adjacent JSON sidecar
with `summary` (expected visible content), `info` (capture identity and environment), and applicable
actions, captured state, checks, and limitations. Markdown review notes may also be generated.
The gallery embeds complete sidecars, so image inspection also works when opened locally without
a server. Legacy Markdown and TXT sidecars remain readable. Static captures use a mock host;
real-window captures use isolated development
profiles. Intentional schema errors and unresolved diagrams are labeled fixture states, not
product failures. Manifests record revision, worktree state, campaign identity, assertions, and
final suite outcomes. Historical runs are excluded from the current review index.

For focused campaigns, use `fnm exec -- npm run test:scroll`, `fnm exec -- npm run test:reload`, or
`fnm exec -- npm run test:visual`.

Static screenshot capture uses four worker threads by default, each with its own Playwright
instance and browser. Reports retain scenario order, and failures still fail the campaign.
For serial debugging after rendering fixtures, run
`uv run --no-sync --group docs python test/visual/capture.py --workers 1`.
Real VS Code integration scenarios remain serial. The Pages workflow builds `out/site/` through
`just preflight`; `just site` also runs the E2E campaign before generating the gallery and site.

## Build And Install Locally

Build an ignored VSIX without publishing it:

```bash
just package
```

The artifact is written to:

```text
out/reports/package/markdown-okf-schema-studio.vsix
```

Packaging uses `vsce` to rewrite relative README links only inside the VSIX. Image URLs target
`https://media.githubusercontent.com/media/gsemet/markdown-okf-schema-studio/v<VERSION>/`, and document
links target the same tag on GitHub. The source README keeps its relative paths for GitHub.
Commit the README images before creating the matching release tag: Marketplace loads them
anonymously from GitHub, not from the images bundled inside the VSIX. Local packages whose tag
has not been pushed can therefore show broken images in the extension details page.
Screenshots use Git LFS: the media endpoint serves image bytes rather than raw LFS pointer files.
Push the LFS objects along with the tag. Publishing a new version containing the images is required
to repair an already published release.

Install or update the default VS Code profile with:

```bash
just install-vsix
```

Install into a named profile with:

```bash
just install-vsix "My Profile"
```

The install recipe reports the VSIX path and the VS Code **Install from VSIX...** action when the
`code` CLI is unavailable. After installation or an update, reload the current VS Code window
manually.

## How to Release

Releases start with a committed version change, not a manually created tag.
The extension version lives in `package.json`; `package-lock.json` must match it.
The Python project's version is tooling metadata and is not the extension release version.

1. Fetch release tags and commit the changes to include in the release:

	```bash
	git fetch origin --tags
	```

2. Calculate the next version with Python Commitizen:

	```bash
	just bump-version
	```

	`feat:` commits produce a minor bump. A `!` before the colon or a
	`BREAKING CHANGE:` footer produces a major bump, including before version 1.0.
	Fixes, documentation, maintenance, other changes, and an empty release range produce
	a patch bump. Classification uses committed history since the baseline release tag;
	uncommitted feature changes do not count. The baseline is the newer of the current
	manifest version and the latest reachable stable release tag.

	To choose a version instead:

	```bash
	just version 1.2.3
	```

	Both commands update the npm manifest and lockfile and create a signed-off commit
	with subject `chore: version X.Y.Z`, using `git commit -s`. Neither creates a local tag.
	Only these two files are committed; unrelated staged work stays staged.
	Commit or stash existing edits to either npm version file before running the command.
	Explicit versions must be stable `X.Y.Z`, newer than the baseline, and not already tagged.

3. Validate the version commit, then push it and merge it into `main`:

	```bash
	just preflight
	git show --stat HEAD
	```

	Keep release images and their Git LFS
	objects committed and pushed, since Marketplace image URLs use the release tag.

4. After successful main-branch CI, the tagging job checks whether the pushed version
	changed and whether `vX.Y.Z` exists remotely. It verifies matching lockfile versions
	and an increasing version, then tags the exact tested commit. Ordinary pushes and
	existing tags are left unchanged. It never commits files back to `main`.

5. CI calls **Release VSIX** explicitly with that tag. A tag pushed by `GITHUB_TOKEN`
	does not trigger another push workflow, so this call is required. The release job
	verifies the tag, manifest, and default-branch ancestry, generates user-facing notes
	from the previous reachable release's Git diff through `gh copilot`, packages the
	extension, publishes to Marketplace, and attaches the VSIX and notes to a GitHub release.
	A first release uses all history. Note generation must succeed before publication.

### GitHub Configuration

Create a GitHub environment named `release`, allowing releases from the default branch
and `v*` tags. Configure these secrets in that environment or at repository level:

- `VSCE_PAT`: a Marketplace publisher token authorized for `GaetanSemet`.
- `COPILOT_GITHUB_TOKEN`: a GitHub token with Copilot access for `gh copilot`.
  The workflow's normal `GITHUB_TOKEN` is used for tags and GitHub releases, not Copilot.

The runner must provide `gh` with Copilot CLI support for `gh copilot --`.
GitHub-hosted Ubuntu runners supply `gh`; authentication uses the Copilot secret above.
Repository rules must permit the CI token to create version tags. Environment approval
rules, when configured, pause publication after tagging. All committed dependency settings
and GitHub jobs use public PyPI and npm registries; corporate proxy and CA settings belong
only in the developer's local environment, never in workflow files or lockfile URLs.

### Recovery and Release Notes

If tagging succeeded but publication failed, rerun the failed release job or dispatch
**Release VSIX** with the existing `vX.Y.Z` tag. Do not move the tag or bump again just
to retry. Marketplace publication skips an already published version, allowing a retry
to finish the GitHub release. Manual pushes of valid `vX.Y.Z` tags also run this workflow.

To generate notes without publishing the extension, dispatch **Generate release notes
(manual)** from the default branch with an existing tag reachable from that branch.
It uploads the validated Markdown and creates a draft GitHub release, refusing to overwrite
an existing release. A later **Release VSIX** run publishes that draft with the VSIX.

Local generation uses the same diff-grounded generator:

```bash
just release-notes v0.1.0 v0.1.1
uv run python scripts/release_notes.py --validate release-notes.md
```

Set `COPILOT_GITHUB_TOKEN` locally before generation. `release-notes.md` contains only
validated final-answer Markdown, not Copilot progress or tool output. The generator retries
invalid output up to three times and fails closed rather than substituting invented notes.
