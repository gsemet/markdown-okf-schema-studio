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
assigned to the Webview. Filesystem-backed frontmatter link inspection and PlantUML rendering run
afterward against the same render stage and update the existing page only when that stage is still
current. Disposing a stage cancels its deferred PlantUML process, and a newer enrichment generation
discards late results from an older assignment.

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
- explicit refresh produces a newer request and renders the current dirty buffer;
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
