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
into `images/`. It only overwrites those selected filenames and `images/gallery.json`; unrelated
manual images and future video assets remain untouched. `just site` builds the E2E evidence, gallery,
and static Pages tree. The published `out/site/gallery.html` includes every screenshot recursively
from `out/reports/e2e/screenshots/`, not just the three README selections. Each caption shows the
sidecar summary. Selecting an image opens the full sidecar on the left and the image on the right;
on narrow screens the sidecar appears above the image. Historical captures remain visible with
their original metadata and are not certified as part of the latest passing campaign.

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
