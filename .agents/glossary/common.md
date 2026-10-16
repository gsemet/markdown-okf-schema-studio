# Glossary

Shared vocabulary for the Studio's UI parts and code concepts, so people and agents use the same
words. Add new terms here, alphabetical, one line each; keep code names in backticks. Terms marked
"(planned)" do not exist in the code yet; drop the marker when one is built.

- **Anchor button**: toolbar toggle that ties preview scrolling to the editor (`data-sphinx-preview-anchor`).
- **Block editor**: raw Markdown text box that replaces a mapped block in edit mode (`.sphinx-preview-block-editor`, `openBlockEditor` in `src/webview/scrollSync.ts`).
- **Block selection (planned)**: selecting whole blocks in the preview, for example to comment on them.
- **Chip (planned)**: small inline badge rendered for a value in the preview.
- **Comment thread (planned)**: a conversation attached to a block or range of a document.
- **Content patch**: in-place replacement of the content container `#sphinx-myst-preview-content` instead of a full page reload (`src/preview/contentPatch.ts`).
- **Copy button**: floating button over a hovered code block that copies its raw code (`data-sphinx-preview-code-copy`, `src/webview/codeCopy.ts`).
- **Edit lock**: host-side record that an inline edit is open, deferring work that would replace the page (`src/state/editLock.ts`).
- **Edit mode**: toolbar toggle that makes preview blocks editable (`data-sphinx-preview-edit-toggle`).
- **Edition palette (planned)**: palette of the actions available while editing.
- **First-element gap**: fixed 40 px space above the first rendered element; `--sphinx-preview-first-clearance` (`src/webview/firstClearance.ts`) adds room only under the toolbar.
- **Included block**: rendered block that comes from an `{include}`; maps to the directive lines and carries `data-sphinx-preview-included`.
- **Incoming-change mark (planned)**: visual mark on content changed by another source while the preview is open.
- **Insert point**: "+" bar after each top-level block that opens an insertion editor (`.sphinx-preview-insert-point`).
- **Insertion editor**: block editor opened from an insert point or from "Start writing".
- **Mapped block**: rendered element carrying its source location (`[data-sphinx-source-file][data-sphinx-source-line]`).
- **Margin mode (planned)**: layout mode that uses the page margins for side content.
- **Message registry**: map from a webview-to-host message type to its validator and host handler (`src/preview/previewMessages.ts`).
- **Open-With editor**: the custom editor offered through "Open With" (`markdown-okf-schema-studio.editor`).
- **Palette mode (planned)**: the set of states of the edition palette.
- **Preview panel**: the webview panel that shows the rendered preview.
- **Properties table**: rendered frontmatter table at the top of a document (`[data-okf-properties]`).
- **Reading offset**: strip at the top of the viewport reserved for the sticky heading band (`refreshReadingOffset`, `docs/scroll-anchoring.md`).
- **Runtime**: the page script injected into the preview, built by `createScrollSyncScript` (`src/webview/scrollSync.ts`).
- **Runtime context**: the settings and ids the host passes to the runtime (`PreviewRuntimeContext`).
- **Scroll anchor**: the block and offset that keep the reading position stable across re-renders (`docs/scroll-anchoring.md`).
- **Shell**: the part of the preview page outside the content container; unchanged between renders of one document.
- **Shell key**: string identifying the shell, compared to decide whether a content patch is possible (`shellKey` in `src/preview/contentPatch.ts`).
- **Side channel**: host-to-page message carrying data that is not rendered HTML, for example `previewPropertiesTable`.
- **Sidecar file (planned)**: companion file stored next to a document, for example for comments.
- **Sticky heading band**: fixed band at the top of the preview showing the current heading path (`docs/scroll-anchoring.md`).
- **Table bar**: menu shown on a table in edit mode (`.sphinx-preview-table-menu`).
- **Table-cell editor**: block editor opened on one table cell ("Markdown table cell editor").
- **Theme mode**: preview colour scheme, one of `current`, `dark`, `white`, `cream` (`PreviewThemeMode` in `src/state/previewTheme.ts`).
- **TOC column (planned)**: side column showing the table of contents.
- **Toolbar**: the controls bar at the top of the preview (`[data-sphinx-preview-toolbar]`).
- **Toolbar row**: `data-sphinx-preview-toolbar-row` `main` (Refresh/Anchor/Edit/Theme) or `view`.
- **Top-level block**: mapped block that is a direct child of the content container (`topLevelMappedBlocks` in `src/webview/scrollSync.ts`).
- **View preference**: per-workspace preview setting changed from toolbar row 2 (zoom, width mode, TOC, incoming changes), `src/state/previewViewPreferences.ts`.
