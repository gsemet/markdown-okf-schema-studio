# Preview Lifecycle Integration Evidence

## Decision

**GO after independent inspector rework.** The inspector rejected the coder-authored `GO` because
theme changes did not rebuild, non-Markdown editor switches retained the previous document,
workspace removal was not proven to dispose resources, and several lifecycle paths lacked host
coverage. The focused repairs now integrate the isolated Sphinx/MyST build, security policy,
rendering, source mapping, scroll synchronization, and lifecycle controller into one side preview.
The preview follows the active Markdown editor and never displays another document's output as the
current document.

The queue reaches `ready` when the base MyST HTML and a schema-aware frontmatter table have been
assigned to the Webview. Filesystem-backed frontmatter link inspection and, with
`plantuml.useJar` on, PlantUML rendering through the JAR run afterward against the same render
stage and update the existing page only when that stage is still current. Disposing a stage
cancels its deferred PlantUML process, and a newer enrichment generation discards late results
from an older assignment.

With `plantuml.useJar` off (the default) the host renders no PlantUML: the page loads
`out/bundle/plantumlPreview.js` (the bundled `@plantuml/core` engine) and draws each
`.myst-plantuml-diagram` itself, as it does for Mermaid. It caches the pictures by source and
light/dark variant, so a content patch with unchanged diagrams does not run the engine again, and
draws new diagrams after `studio:content-replaced`. The page's Content Security Policy is the same
as before: the engine is a script from the extension, uses no eval, no worker and no WebAssembly
(Graphviz `viz-global.js` is not bundled), and `connect-src 'none'` stays; its library loader
refuses every request and it fetches nothing. While it builds a picture the engine sets `style` attributes on SVG
nodes of the page; the policy blocks applying them (the webview console reports `style-src-attr`
violations), which is harmless: text is measured with a canvas, the attributes are still
serialized, and the SVG is shown as a data-URI image, outside the page policy. The output is
identical with and without the policy.

Local PlantUML files never reach the page by a URL. `{uml} path.puml` (and `{plantuml} path.puml`
without a body) is read by the host during the MyST render, through the same resource policy,
5 MiB cap and include budget as `{include}`, and becomes the diagram text; the file is a render
dependency, so the dependency watcher renders the document again when it changes, and a missing
file inside the roots is a dependency too. The diagram element carries `data-plantuml-file` and,
for a diagram whose `!include` lines must resolve elsewhere than the document (a `.puml` file or an
included document), `data-plantuml-base`.

The engine asks for `!include` files while it renders (`PLANTUML_FILE_LOADER`, answered later; the
engine renders again once every answer is in). The page renders one diagram at a time, so each
request belongs to the diagram being drawn. The bundle dispatches `studio:plantuml-file-request`;
the page script, which owns the VS Code API, posts the registered `previewPlantUmlInclude`
(`path`, and `from`: the id of the including file or null) with its own edit id and a 10 s timeout,
and hands the `previewPlantUmlIncludeResult` with the same edit id back; any other answer is
dropped. The host answers a page that is one render behind as well (a read does not depend on the
document version), as long as it shows the same document. It resolves `path` next to `from`, or next
to the document, with the resource policy (the workspace, or only the document's folder in
Restricted Mode), and the id it returns is the file's real path. The page refuses an include deeper
than 8 files, beyond 64 files or 1 MiB of text per diagram, and a file that includes one of its
includers (a cycle). A refused include is not cached. The host remembers every file it served (and
a missing one inside the roots); when the watcher reports one of them, it posts
`previewPlantUmlIncludesChanged` and the page forgets the cached pictures that read files and draws
those diagrams again.

## Commands and Results

Commands were run from the standalone repository root with Node 24 selected by `fnm`.

| Command | Result |
| --- | --- |
| `fnm exec -- npm run compile` | Pass |
| `fnm exec -- npm run test:unit` | Pass; 36 tests |
| `fnm exec -- npm run test:integration` | Pass; isolated untrusted host and trusted multi-root VS Code host |
| `fnm exec -- npm run package` | Pass; 81-file VSIX, 131.68 KB |
| `just check-justfile` | Pass |
| `just book-check` | Pass; diagrams, glossary, bibliography, and animation checks |

## Lifecycle Evidence

The trusted extension-host suites verify:

- opening the contributed command creates one side preview for the active Markdown document;
- unsaved edits render from the dirty buffer, while the source file and production `_build/` tree
  remain unchanged;
- switching editors changes the preview identity before the next build completes and rejects old
  document messages and results;
- switching to a non-Markdown editor replaces the old preview with an explicit missing-source
  state, and returning to Markdown rebuilds the active document;
- theme changes post a bounded theme update and queue one fresh render without a refresh loop;
- a failed build for a newly active document shows an explicit error and does not retain the prior
  document's HTML;
- a failed build for the same document retains last-good HTML with a visible stale status and
  recovers after the next valid edit;
- explicit refresh produces a newer request and renders the current dirty buffer, never joining an
  earlier shared render;
- a hidden preview does not render until it is shown, and previews of one document and revision
  share one render (each with its own request id);
- delayed obsolete work is canceled or discarded by request, document, and panel identity checks;
- serializer restoration reopens a real fixture with its document identity, source line, and scroll
  state, while a missing restored source produces an explicit missing-source view;
- restored or active non-Markdown documents are rejected before Sphinx is invoked;
- source mapping, source and preview scrolling, anchor scrolling, and hostile or stale messages are
  identity-bound; and
- dependency changes and renames refresh only tracked inputs;
- panel disposal and removal of the active project folder from a temporary multi-root workspace
  remove the watcher, cancel the queue, dispose the active temporary stage, and leave no active
  preview state.

The focused unit suite covers bounded persisted state parsing, workspace-bounded navigation,
allowed external schemes, invalid anchors, inert host-validated navigation metadata, and runtime
anchor scrolling; 36 unit tests pass. The existing security and build tests cover hostile resources,
CSP, diagnostics, trust checks, process cancellation, dependency tracking, and temporary-root
cleanup. The touched source and integration files report no editor diagnostics.

## Scope Boundary

This gate proves the Task 05 lifecycle integration and its extension-host contract. Native Markdown
preview and native source/version diff editor contributions remain untouched. Broader interaction
and accessibility parity belongs to Task 06; release packaging and repository delivery policy
belong to Task 07.
