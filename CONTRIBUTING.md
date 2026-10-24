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
diagram cases. In GitHub Actions only the visual job installs them, with Playwright's system
libraries, through `just dev-ci visual`, from cached Ubuntu package archives; on macOS use
`brew install plantuml graphviz`.

## Dependency Updates

Run `just update` to upgrade JavaScript dependencies, regenerate the npm lockfile against the
public registry, upgrade the Python environment and lockfile, and refresh Playwright Chromium.
The Node.js runtime stays on the version selected by `.nvmrc`; its type declarations stay on
Node 24, and the VS Code API declaration floor stays aligned with `engines.vscode`.
The Python tools (docs, visual captures, release scripts) require Python 3.11 or later, the floor
of Pillow 13; the lockfile selects newer releases for newer interpreters.
Run `just preflight` after updating.
CI uses `STUDIO_NPM` to run the Node.js version selected by `actions/setup-node` without `fnm`.

Security overrides keep the MyST dependency tree on patched parser releases.
The install script applies two import-path corrections for MyST's current packages so they
work with Markdown-It 14. Revisit these corrections when updating `myst-to-html` or
`markdown-it-dollarmath`; installation fails if their versions or expected imports change.

## Cleanup

`just clean` removes compiled output, reports, the generated Pages site, VSIX packages,
generated README gallery captures, and Python test caches. Dependencies, `.env`, manual images,
and source fixtures are preserved. Campaign screenshots are generated under
`out/reports/e2e/screenshots/` (static-page scenarios in `visual/<group>/`, named
`vNN-<slug>-<theme>-<width>.png`, step captures `…--<step>.png`); the obsolete `test/visual/screenshots/` directory is not tracked.

`just mr-proper` also removes `.env`, `node_modules/`, `.venv/`, the downloaded VS Code test
runtime, and local tool caches. It returns the local build environment to an uninstalled checkout.

## Architecture

`src/` is split into layers, one folder each. The dependencies point down the list: a layer may
import the layers below it, never one above it.

| Folder | What it holds | May import |
| --- | --- | --- |
| `src/core/` | Host-neutral logic: protocol (`core/protocol/`), rendering, sanitizing, source mapping, edit operations, comments, frontmatter, settings normalization, page assets built in Node (`core/preview/`) | `core` and npm packages; no `vscode`, no DOM-only package, no Node built-in |
| `src/host-api/` | The port interfaces every host implements (documents, files, settings, watchers, processes...) | `core` types |
| `src/page/` | The preview page, bundled for the browser: runtime, typed features, page modules (`page/modules/`) | `core`, npm packages |
| `src/node-services/` | Node implementations of ports and Node-only services (file system, processes, Sphinx build, watchers) | `core`, `host-api`, Node, npm packages |
| `src/session/` | The host-neutral controllers: `PreviewManager`, `PreviewSession`, feature controllers, page HTML | `core`, `host-api`, `node:path` |
| `src/host-memory/` | An in-memory host for tests and future headless hosts | `core`, `host-api` |
| `src/host-vscode/` | The VS Code host (with `src/extension.ts`): activation, port adapters, test hooks | everything except `page` and other hosts; the only code that imports `vscode` |

Tests mirror this tree under `test/` (`test/core/render/` tests `src/core/render/`).
`test/security/`, `test/integration/` and `test/visual/` are suites that span the layers.

`just check` enforces the layout:

- `just check-boundaries` runs dependency-cruiser with the rules of `.dependency-cruiser.cjs` over
  a transpiled copy of `src/` (type-only imports count). The few known exceptions are listed there,
  each with its reason: Node built-ins still used by some core files (synchronous file access and
  the PlantUML process, before the ports cover them) and three node-services modules the session
  layer still imports directly. Never add an exception to make a new import pass: move the code,
  or put the access behind a port.
- `just check-limits` holds the file-size ratchet: at most 800 lines per file in `src/` and 1 500
  in `test/`. The files that were larger are listed in `scripts/file-size-baseline.json` and may
  only shrink; when one shrinks, lower its entry with `node scripts/check-file-sizes.mjs --update`
  (the check says so). The same target fails on any `@ts-nocheck` or `@ts-ignore` in `src/`
  outside `src/page/runtime.ts`.

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

On macOS the real VS Code window tests use `/Applications/Visual Studio Code.app` when it exists
(CI downloads the current stable build); set `STUDIO_VSCODE_EXECUTABLE` to the `Contents/MacOS/Code`
binary of another build to run them there. They need an unlocked session: each test window must
become the active window once, or VS Code sees no focused editor and undo, cursor commands and
typed keys reach nothing. macOS keeps a newly launched app in the background while you work in
another app, so each test window (the trusted, untrusted and scroll-sync suites and the reload
campaign) is first brought to the front, and the run waits until VS Code reports the window
focused; on a locked screen it fails at once with the window state instead of timing out later.
Losing the focus afterwards, for example by switching to another app, does not affect the run.
Bringing a window to the front goes through System Events, so the first run asks once per app
(each VS Code build, and the terminal or editor that runs `npm`) to allow it under System Settings >
Privacy & Security > Automation; allow it, or the run fails with a message that names the
permission.

CI runs the same stages as parallel jobs, each calling one target after `just dev-ci`:
`just ci-static` (justfile format, `check`, `sphinx-check`), `just ci-visual`,
`just ci-integration`, then `just ci-report` (merges the visual and integration outputs into the
review index and `out/reports/e2e/e2e-manifest.json`; it fails when a stage manifest is missing or
failed) and `just ci-gallery` (gallery and site from the existing outputs, no E2E re-run).
On push and pull request, CI runs only the simulated tests, which make up the required `checks` job:
`ci-static`, `ci-visual` (Playwright/Chromium against a mock host) and `just ci-report visual`, which
reports the real VS Code stage as skipped. The real VS Code window jobs (`ci-integration` and the
`stress` repetitions) are heavy and manual: start them with
`gh workflow run ci.yml --ref <branch> -f heavy=true` (add `-f gallery=true` for the gallery and site
artifact), or with "Run workflow" in the Actions tab. Run them, or `npm run test:integration`
locally, before merging a change to the extension host, the webview or the real-window tests.
`just preflight` calls these targets in sequence. Each stage records its own start time and they share
a run id, so `just ci-visual`, `just ci-integration` and `just ci-report` also work one by one; `just
clean` starts a fresh campaign. `just dev-ci` is for CI machines only: `npm ci` replaces
`node_modules`.

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

### Preview performance probe

The probe measures the live preview on a large generated chapter (about 99 KB, 80 sections,
80 links, 8 Mermaid diagrams, see `test/probe/largeChapter.ts`). Run it before and after a change to the
webview runtime, the content patch or the edit lock, and compare the JSON reports.

```bash
npm run probe
```

It runs without a VS Code window: it builds the real preview page, opens it in headless Chromium
with a stub host and writes `out/reports/probe/preview-probe.json`. It reports the page size, the
script time of each scroll frame (normal CPU and four times slower), the page loads, the Mermaid
redraws and the content blocks rebuilt while ten characters are typed as content patches, and
whether an open inline editor survives a theme change and the Mermaid redraw. The first page is
loaded as VS Code's webview loader shows it (every link without a title gets its address as
title). With `--check` (the npm script passes it), it exits with an error when a scroll frame's
95th percentile goes over 4 ms, a page reloads while typing, typing redraws a diagram or rebuilds
another block than the typed one, or the open editor is lost.

The real-window probe measures the same in VS Code: `webview.html` assignments while typing in the
text editor, scroll frames of the webview, and an open editor through a save, a colour theme change
and the Mermaid redraw. It writes `out/reports/probe/window-probe.json` and asserts only what it
needs to run:

```bash
STUDIO_REAL_INPUT_SCENARIO=probe npm run test:integration -- --trusted-only
```

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

### Product-owner gallery and report pruning

`npm run review:gallery` writes `out/reports/e2e/GALLERY.md` and one page per feature group in
`out/reports/e2e/gallery/`. The pages come from the scenario metadata (`test/visual/scenarios.ts`,
`test/shared/e2eGroups.ts`) and the last visual run manifest: for each group, every captured
scenario (thumbnail, `locks` statement, step images, README marks) and a table of the
assertion-only scenarios with what they verify. Open them in VS Code's Markdown preview. The gallery
says **STALE** when the last visual run was partial, is from another revision, or lacks scenarios or
images; run the full `npm run test:visual` first for a fresh one. `npm run review:finish` (the last
`test:e2e` stage) refreshes it and links it as item 0 of `REVIEW.md`. It is unrelated to
`gallery:generate`, which curates the tracked README images.

The README images cropped from static captures are declared by the `readme` metadata of their
scenarios (`README_BY_ID` in `test/visual/scenarioIds.ts`: file, crop box, width);
`scripts/generate-readme-images.py` reads it from the render manifest. Do not change a README
scenario's viewport, fixture, theme, scroll or crop unless the image is meant to change.

### Real-window captures: registry and parallel runs

Every screenshot taken in a real VS Code window has a stable id `<group>/rNN-<slug>` registered in
`test/shared/captureRegistry.ts` (group, suite, one `locks` sentence, `clip`, README and curated
flags). All six suites (real-input, checkbox, frontmatter, scroll, reload, untrusted) write
through the same
`RealWindowEvidence` writer (`test/integration/evidence.ts`): it rejects an unregistered id, writes
`<run folder>/<group>/rNN-<slug>.png` with its `.md` note and `.json` sidecar, lists the capture in
the `captures` array of the run `manifest.json`, and fails a complete suite when a registered
capture of it was not taken. A new capture takes the next free number of its group. Entries with
`capture: false` keep their assertion and note but write no picture. `clip: "preview"` crops to the
webview frame (falling back to the whole window), `clip: "element"` to the changed excerpt, and
`clip: "window"` keeps the whole VS Code window, which the README crops need.

The LATEST pointer files, `INDEX.md` and the run folder prefixes (`real-input-`, `checkbox-e2e-`,
`frontmatter-e2e-`, `scroll-e2e-`, `reload-e2e-`, and `untrusted-e2e-` with `UNTRUSTED-LATEST.md`)
are unchanged; the per-group folders live inside the run folder. Every window with captures gets a
loopback CDP port (`STUDIO_CDP_PORT`): the trusted and scroll launches, and the Restricted Mode
window, which `run-tests` spawns directly (`--untrusted-only` runs it alone).

A new real-window scenario goes into the stress plan (`STRESS_SCENARIOS_BY_HOST` in
`test/shared/stressPlan.ts`, by the window that runs it) and must pass the `stress` CI job before it
stays in the integration job (CI rule 12). `just ci-stress` runs the trusted window, then the
Restricted Mode window. `npm run review:gallery` lists the registered captures of the latest runs per group,
and `scripts/generate-readme-images.py --check <dir>` compares the README images, real-window ones
included, with a baseline directory.

Several real-window runs can be active at once on one checkout. Each `run-tests` process has an
instance id (`STUDIO_E2E_INSTANCE`, generated when unset) and gives every VS Code launch its own
user-data directory, extensions directory, CDP port and evidence folders; the manifests carry
`instanceId`. The LATEST pointers and `integration-manifest.json` are shared files, so the last run
to finish wins them; use the run folder named in the console for a specific run.

Run folders of the real-window suites pile up under `out/reports/e2e/screenshots/`.
`npm run review:finish` keeps the latest 5 per kind (`STUDIO_E2E_KEEP_RUNS` changes it). Run
`npm run review:prune -- --dry-run` to list what would go, `npm run review:prune -- --keep 3` to
prune by hand. The pruner only touches run folders inside `out/reports`, never the folders the
LATEST pointers name, and never a folder that holds a git-tracked file.

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
