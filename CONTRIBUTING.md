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

### Dependency overrides

The `overrides` field in `package.json` forces two parsers of the MyST packages onto current
releases. The MyST packages still declare release lines that no longer get fixes:

- `markdown-it` `^14.3.1`: `myst-parser`, `myst-to-html`, `markdown-it-myst`,
  `markdown-it-dollarmath` and `markdown-it-amsmath` ask for `^13` (or `^12 || ^13`).
  Markdown-It 13 has had no release since 13.0.2 (2023), so parser fixes only reach the 14 line.
  Markdown-It 14 also brings `linkify-it` 5, so `linkify-it` needs no override of its own.
- `csv-parse` `^7.0.3`: `myst-directives` asks for `^5.5.5`, a line without releases since
  5.6.0 (2024). It parses the CSV of the `csv-table` directive.

Nothing writes into `node_modules`: there is no `postinstall` script. `myst-parser` and
`myst-to-html` are pinned to exact versions, and three source patches (the import-path correction
for `myst-to-html` and `markdown-it-dollarmath` with Markdown-It 14, and the single line split of
`markdown-it-myst`) are applied in memory by `scripts/myst-patches.mjs`. The esbuild bundle uses it
as a plugin; Node-run code (unit, contract and security tests, `visual:render`, `site`) loads it
with `node --import ./scripts/register-myst-patches.mjs`. A package version or file content that
differs from the reviewed one fails the build or the run with a message asking for a review.

Revisit the overrides when you update a MyST package, during `just update`, or when an advisory
names one of these parsers. Run `npm ls markdown-it csv-parse`: remove an override once every
package that pulls the parser asks for the forced line itself. Check that the parser is still on a
patched release, and remove the matching patch of `scripts/myst-patches.mjs` when Markdown-It 14
support arrives in the MyST packages.

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
| `src/core/` | Host-neutral logic: protocol (`core/protocol/`), rendering, sanitizing, source mapping, edit operations, comments, frontmatter, the registries of settings (`core/configuration/`), palette actions (`core/palette/`) and MyST directives (`core/directives/`), page assets built in Node (`core/preview/`) | `core` and npm packages; no `vscode`, no DOM-only package, no Node built-in |
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
  each with its reason and its removal plan: Node built-ins still used by some core files
  (synchronous file access and the PlantUML process before the ports cover them, and pure `path`
  arithmetic) and three node-services modules the session layer still imports directly. The list
  only shrinks. Never add an exception to make a new import pass: move the code, or put the access
  behind a port, as the frontmatter schema discovery does with the `SchemaFiles` port
  (`src/core/frontmatter/schemaFiles.ts`, implemented in `src/node-services/schemaFiles.ts` and
  handed over as `HostServices.schemaFiles`).
- `just check-limits` holds the file-size ratchet: at most 800 lines per file in `src/` and 1 500
  in `test/`. The files that were larger are listed in `scripts/file-size-baseline.json` and may
  only shrink; when one shrinks, lower its entry with `node scripts/check-file-sizes.mjs --update`
  (the check says so). The same target fails on any `@ts-nocheck` or `@ts-ignore` in `src/`.
- `just check-exports` fails when a runtime export (function, class, constant) of `src/` is
  mentioned by no other module of `src/`, `test/` or `scripts/`: make it private or delete it.
  Exported types are not checked. The check matches names, so it can miss a dead export that
  shares its name with a live one, but it never reports a live one. A deliberate exception goes in
  `scripts/unused-exports-allowlist.json` with its reason; an entry that is no longer needed fails
  the check.
- `just check-markers` checks the companion marker files (`*.markers.ts`): each names an existing
  host file (`// Companion of: <path>`) and marks only existing requirements.
- `just check-settings` fails when the `contributes.configuration` of `package.json` differs from
  what the settings registry generates (see "Add a setting").

### Inside the core

- The renderer (`src/core/render/mystRenderer.ts`) is an ordered list of named passes:
  `TREE_PASSES` on the parsed MyST tree, then `HTML_PASSES` on the produced HTML. Each pass lives
  in a module of its theme (`mystBlockTransforms.ts`, `mystInlineTransforms.ts`,
  `mystContextTags.ts`, `mystTables.ts`, `mystNormalize.ts`, ...). The order is part of the
  output: add a pass at the place it must run. `normalizeNode` dispatches on the node kind through
  the `NODE_RULES` table of `mystNormalize.ts`.
- The frontmatter is split by job in `src/core/frontmatter/`: `frontmatterParse.ts` (find and
  parse the block), `frontmatterValidate.ts` (schema fields), `frontmatterSerialize.ts` (the text
  patches of the properties editor) and `okfFrontmatter.ts` (schema discovery and the analysis,
  which reads schema files only through the `SchemaFiles` port).
- The page stylesheet is built in TypeScript: `src/core/preview/previewStyles.ts` concatenates the
  per-feature modules of `src/core/preview/styles/` in cascade order. The modules stay TypeScript
  strings, not `.css` files, because the unit, visual and integration suites import the stylesheet
  from the compiled `out/` tree, where a `.css` import would not resolve.

### Extension points

Four registries hold what used to be spread over many files. Each keeps the pure data in `core`
and the code that needs the page or a host in its own layer.

**Add a palette action** (a button of the edition palette, an entry of the `/` menu):

1. Add its descriptor to `PALETTE_ACTIONS` in `src/core/palette/paletteActions.ts`, at the place
   it should show: label, icon, group, modes (`strict` shows in every mode, `gfm` in GFM and MyST,
   `myst` in MyST only), scopes, and the optional shortcut, popover, panel, host list or dialog and
   `/` menu data (`slash`: aliases, variants, `menuOnly`).
2. A new icon goes in `PALETTE_ICONS` (`src/core/palette/paletteIcons.ts`); the descriptor's
   `icon` must name one.
3. Add its handler to `handlers` in `createEditActions` (`src/page/modules/editActions.ts`):
   `apply` returns the text edit; `available`, `explain`, `current`, `validateColor` and computed
   `options` are optional; the edit functions live in the subject modules next to it
   (`inlineEditActions.ts`, `blockEditActions.ts`, `linkEditActions.ts`, `tableEditActions.ts`,
   `colourEditActions.ts`). TypeScript refuses a descriptor without a handler and the reverse.
4. The palette and the `/` menu pick the action up from the registry; nothing else to wire. Test
   the edit in `test/page/modules/editActions.test.ts`.

**Add a MyST directive plug-in** (a directive that needs more than what the MyST writer does):

1. Create `src/core/directives/<name>.ts` exporting a `MystDirectiveDescriptor`
   (`src/core/directives/directive.ts`): the directive `names`, the `render` pass on the parsed
   `mystDirective` node (helpers in `src/core/render/mystNode.ts`), the sanitizer `attributes`
   rules of the HTML attributes the pass writes (`data-*` attributes only: the registry refuses
   any other name), the `style` rules of its output and the
   `paletteActions` that insert it (ids of `PALETTE_ACTIONS`).
2. Register it in `MYST_DIRECTIVES` (`src/core/directives/registry.ts`). The renderer runs the pass
   for every directive of those names and the sanitizer applies the attribute rules.
3. Place its stylesheet with `${directiveStyle("<id>")}` in
   `src/core/preview/styles/contentBlockStyles.ts`, where the rules belong in the cascade.
4. Test the plug-in in `test/core/directives/` and its rendering in `test/core/render/`
   (`mystFeatures.test.ts`, or `mystPaletteRendering.test.ts` for what the palette inserts).

**Add a setting**:

1. Add it to its section table in `src/core/configuration/settingsRegistry.ts`
   (`PREVIEW_SETTINGS`, `EDITING_SETTINGS`, …; a new section also needs an entry in
   `SETTING_CATEGORIES`): the `package.json` schema fields in the order they are written (`type`,
   `enum`, `enumDescriptions`, `default`, `minimum`, `maximum`, `step`, `markdownDescription`,
   `order`), and `normalize`, which turns the stored value into the value the core uses. A setting
   the page needs at startup is a `startupSetting` (the content patch then compares it) and one it
   also follows while open a `liveSetting`; both give the page's `read` of the boot context entry.
   A `liveSetting` still needs its own update message: add it to `src/core/protocol/hostToPage.ts`,
   post it from the session when the setting changes (as `postShowComments` does for
   `preview.showComments`) and handle it in `src/page/features/hostHandlers.ts`.
2. Run `just generate-settings`: it writes the `contributes.configuration` of `package.json`, which
   is never edited by hand (`just check-settings` fails otherwise).
3. Read it on the host with `readSettings` (or the section module, `previewConfiguration.ts`, …),
   which also types it. Boot settings (the `startupSetting` and `liveSetting` entries of
   `PREVIEW_SETTINGS`) reach the page at startup without more code: the host writes
   `previewBootSettings(configuration)` and the page reads `readPreviewBootSettings(context)`.

**Add a message** (between the page and the host; both sides use the typed router of
`src/core/protocol/router.ts`, one handler per type):

1. Page to host: add its interface to the `PageToHostMessage` union and its payload validator to
   `PAGE_TO_HOST_VALIDATORS` in `src/core/protocol/pageToHost.ts`. The envelope (document id,
   revision, request) is checked before the validator runs. The table is typed by the union, so a
   type without a validator does not compile.
2. Host to page: add its interface to the `HostToPageMessage` union and its rule to the table in
   `createHostMessageFilter` (`src/core/protocol/hostToPage.ts`): the addressing (`render`,
   `document` or `own-id`) and, when the page must refuse some payloads, a validator. The filter
   only matches the message to the page and checks its payload; it cannot tell whether the host
   had a reason to send it.
3. Give a page-to-host message its gate in `PAGE_MESSAGE_GATES` (`src/session/pageMessages.ts`),
   the rule that drops a stale message before its handler runs, and its handler with
   `router.on(type, …)` in the `register` method of the session feature controller that owns it
   (`src/session/features/`). The page posts it through its `PageHost`.
4. Register the handler of a host-to-page message with `hostMessages.on(type, …)` in the page
   feature that owns it, or in `src/page/features/hostHandlers.ts` for the runtime's own features.
   The host sends it with `preview.postToPage(…)`.
5. Test the validator or the filter rule in `test/core/protocol/` (`pageToHost.test.ts`,
   `hostToPage.test.ts`). `test/session/previewManager.test.ts` checks that every page-to-host
   type has exactly one handler and pins their count: raise it by one. `tsc` refuses a page-to-host
   type without a gate or a validator, and a host-to-page type without a filter rule. Run
   `npx tsc -p .` and `npm run test:unit`.

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
`just ci-static` (justfile format, `check`, `audit`, `sphinx-check`), `just ci-visual`,
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

`just site` and `just ci-gallery` first write the requirements report (`just requirements-report`),
and the published `out/site/requirements.html` ("Requirements" in the site navigation) is built
from it: the chain from use case to test as a diagram, one real requirement as an example, and the
counts of active requirements (per scope, marker coverage, exemptions, known issues; retired ones
apart). Without the report the site still builds and the page says it was not generated. The page
follows the reader's light or dark colour scheme, like the rest of the site.

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

To refresh only these headless pictures (no real-window run, no `REAL-INPUT-LATEST.md` needed), run
`npm run visual:render`, `uv run --group docs python test/visual/capture.py`, then
`uv run --group docs python scripts/generate-readme-images.py --visual-only`; the real-window
pictures in `images/readme/` stay untouched. `--visual-only` also narrows `--check <dir>` to the
visual-sourced images. The campaign runs with reduced motion, so these captures are settled frames.
A README crop that starts at the top of the page must reach the viewport's right edge, or it cuts
the floating toolbar (`test/site/scenarioInvariants.test.ts` checks it).

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
