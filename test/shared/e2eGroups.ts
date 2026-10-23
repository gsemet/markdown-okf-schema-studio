/**
 * The e2e feature groups of the P9 campaign (the future okfreq scopes), tracked in git because
 * `.agents/changes/` is ignored. Imported by `test/visual/scenarios.ts` and `renderFixtures.ts`
 * (which hands the list to `capture.py` through the render manifest).
 *
 * Group ids are frozen after P9: scenarios, captures and requirements refer to them.
 */

export interface E2eGroup {
  /** Stable identifier, used in scenario ids (`<group>/vNN-...`) and folder names. */
  readonly id: string;
  readonly title: string;
  /** What the requirements of this group will cover. */
  readonly scope: string;
  /** Source directories and files the group maps to. */
  readonly srcAnchors: string;
}

/** Declaration order is the display order everywhere (index, gallery, manifests). */
export const GROUPS = [
  { id: "rendering-core", title: "Rendering core", scope: "CommonMark blocks, inline code, long documents, CJK/RTL text, missing images (admonition colours and layouts belong to `myst`)", srcAnchors: "src/render, src/security/html-sanitizer, src/preview/previewStyles" },
  { id: "code-blocks", title: "Code blocks", scope: "Fenced code, syntax highlighting, diff fences, unknown grammar, copy button", srcAnchors: "src/render, src/webview (copy)" },
  { id: "gfm", title: "GitHub Flavored Markdown", scope: "Autolinks, task lists and toggles, strikethrough, alerts, footnotes, raw HTML, colour spans", srcAnchors: "src/render, src/mapping (checkbox)" },
  { id: "myst", title: "MyST syntax", scope: "Directives, roles, admonitions, context tags, math, figures and labels, citations, conf.py checks, label rename", srcAnchors: "src/render, src/mapping/labelRename, src/myst*" },
  { id: "diagrams", title: "Diagrams", scope: "Mermaid (themes, fallback, errors) and PlantUML (success, unconfigured, executable not found)", srcAnchors: "src/render/plantUmlRenderer, mermaid bundle" },
  { id: "frontmatter-schema", title: "Frontmatter and OKF schema", scope: "Properties table, schema validation and errors, generic YAML, x-okf-link details", srcAnchors: "src/frontmatter" },
  { id: "frontmatter-editing", title: "Frontmatter editing", scope: "Editing the properties table: field values, lists, booleans, enum and key suggestions, add/remove/rename, title", srcAnchors: "src/frontmatter, src/webview, src/mapping" },
  { id: "layout-width", title: "Layout and width", scope: "First-element gap, Margin/Auto/Full width, max content width, overflow, narrow and wide panes", srcAnchors: "src/preview/previewStyles, src/webview/scrollSync" },
  { id: "theme-zoom", title: "Theme and zoom", scope: "Host themes, forced white/cream/dark modes, high contrast, zoom 70-200 %", srcAnchors: "src/preview/previewStyles, src/preview/previewToolbar" },
  { id: "toolbar-navigation", title: "Toolbar and navigation", scope: "Toolbar rows and collapse, sticky headings, TOC, Back/Next, anchor, title-bar and Quick Open entries", srcAnchors: "src/preview/previewToolbar, src/webview" },
  { id: "block-editing", title: "Block editing", scope: "Edit mode, block editors, keyboard, undo, insert points, move, selection, clipboard", srcAnchors: "src/webview, src/mapping" },
  { id: "palette-slash", title: "Edition palette and slash menu", scope: "Palette modes, popups, shortcuts, link panel, figure form, slash menu, image pick and paste", srcAnchors: "src/webview/editPalette, src/webview/editActions" },
  { id: "table-editing", title: "Table editing", scope: "Cell editors, cell bar, Tab/Enter navigation, minimal diffs", srcAnchors: "src/webview, src/mapping" },
  { id: "review-annotations", title: "Review annotations", scope: "Comment and TODO chips, review threads, sidecar, orphans, incoming changes", srcAnchors: "src/comments, src/webview/incomingChanges" },
  { id: "lifecycle-sync", title: "Lifecycle and sync", scope: "Open, refresh, reload and restore, Open With, scroll sync, incremental patches, status pages, coexistence", srcAnchors: "src/extension.ts, src/preview, src/webview/scrollSync" },
  { id: "trust-security", title: "Trust and security", scope: "Restricted Mode, read-only and standalone previews, refused messages, CSP, resource policy", srcAnchors: "src/security, src/preview/previewMessages" },
] as const satisfies readonly E2eGroup[];

export type GroupId = (typeof GROUPS)[number]["id"];

export const GROUP_IDS: readonly GroupId[] = GROUPS.map((group) => group.id);

export function isGroupId(value: string): value is GroupId {
  return (GROUP_IDS as readonly string[]).includes(value);
}

/** Position of a group in `GROUPS` (display order). */
export function groupIndex(group: GroupId): number {
  return GROUP_IDS.indexOf(group);
}

/** An integration test file that produces no screenshot, with its group and what it locks. */
export interface IntegrationTestRow {
  readonly file: string;
  readonly group: GroupId;
  readonly locks: string;
}

export const INTEGRATION_TESTS: readonly IntegrationTestRow[] = [
  { file: "test/integration/trusted-suite.ts", group: "trust-security", locks: "Trusted command preview: CSP with nonce, no unsafe-inline, KaTeX stylesheet, dirty buffer rendered, `_build` untouched" },
  { file: "test/integration/untrusted-suite.ts", group: "trust-security", locks: "Restricted Mode: read-only side preview and Open With, no Edit button, palette-mode/image-pick/paste/move/clipboard/comment messages refused" },
  { file: "test/integration/standalone-suite.ts", group: "trust-security", locks: "File outside the workspace: read-only, its folder is the resource root, schema not found, frontmatter save refused" },
  { file: "test/integration/projectFeatures.test.ts", group: "rendering-core", locks: "Webview HTML keeps links, local images/SVG, headings, admonitions, inline/display math (offline KaTeX), code directives" },
  { file: "test/integration/stockCoexistence.test.ts", group: "lifecycle-sync", locks: "Coexists with the built-in Markdown preview; status-page layout scoped by a body marker" },
  { file: "test/integration/previewEditing.test.ts", group: "frontmatter-editing", locks: "Frontmatter saves (values, lists, nullable, afterField), block edit protocol, insertion, edit lock after reload, copy-code message (+ frontmatter-e2e captures)" },
  { file: "test/integration/previewHistory.test.ts", group: "toolbar-navigation", locks: "Back/Next across documents and in-page anchors and (label)= targets; refused while a block editor is open; external links not recorded" },
  { file: "test/integration/paletteMode.test.ts", group: "palette-slash", locks: "Palette mode: setting gives the start, page choice stored per workspace and wins, invalid mode not stored" },
  { file: "test/integration/labelRename.test.ts", group: "myst", locks: "Label rename from the anchor icon: one edit, one undo, stale line refused" },
  { file: "test/integration/blockMove.test.ts", group: "block-editing", locks: "Block move from the insert bar: one swap, one undo; stale/overlapping/frontmatter/include moves refused" },
  { file: "test/integration/blockClipboard.test.ts", group: "block-editing", locks: "Copy/cut/paste blocks as exact Markdown; refusals (stale, frontmatter, include, bounds)" },
  { file: "test/integration/mystPickers.test.ts", group: "palette-slash", locks: "Citation and reference pickers: bounded .bib scan without node_modules, document labels" },
  { file: "test/integration/imagePicker.test.ts", group: "palette-slash", locks: "Image button dialog: relative path, opens in document folder, outside/non-image/stale refused" },
  { file: "test/integration/imagePaste.test.ts", group: "palette-slash", locks: "Pasted image written next to the document with numbered names; type sniffing; refusals write nothing" },
  { file: "test/integration/incomingChanges.test.ts", group: "review-annotations", locks: "Untracked file gets no incoming-change message (only the negative case is tested)" },
  { file: "test/integration/reviewComments.test.ts", group: "review-annotations", locks: "Comment sidecar: invalid file posts nothing, valid threads posted as data, file changes followed, deletion clears" },
  { file: "test/integration/inlineThread.test.ts", group: "review-annotations", locks: "Inline comment thread: reply appends one message above the closing marker with the configured author and keeps CRLF, delete removes the thread and one blank line, stale lines refused, one undo each" },
  { file: "test/integration/commentWrite.test.ts", group: "review-annotations", locks: "Create/reply/resolve/delete threads, queued creates, author name, refusals and untrusted refusal" },
  { file: "test/integration/commentAnchors.test.ts", group: "review-annotations", locks: "Anchors follow edits (multi-cursor), orphaning, no write while typing, dirty sidecar never overwritten" },
  { file: "test/integration/genericMarkdown.test.ts", group: "frontmatter-schema", locks: "Generic (non-OKF) YAML frontmatter rendered and saved in the custom editor" },
  { file: "test/integration/dirtySnapshots.test.ts", group: "lifecycle-sync", locks: "Unsaved buffer snapshots render (no disk read), versions ordered" },
  { file: "test/integration/sourceMapping.test.ts", group: "lifecycle-sync", locks: "Rendered blocks map to source lines (admonition containers included)" },
  { file: "test/integration/lifecycle.test.ts", group: "lifecycle-sync", locks: "Panel title, no re-render without change, menu URI argument, non-Uri ignored, source dir cleanup on dispose" },
  { file: "test/integration/mystDiagnostics.test.ts", group: "myst", locks: "conf.py-driven MyST extension warnings in Problems; unrelated conf.py ignored; cleared on close; none when untrusted" },
  { file: "test/integration/serializer.test.ts", group: "lifecycle-sync", locks: "Panel restore after reload: missing-source page, two restored panels, newest follows" },
  { file: "test/integration/workspaceDisposal.test.ts", group: "lifecycle-sync", locks: "Removing a workspace folder disposes its previews without deleting sources" },
  { file: "test/integration/scroll-sync-suite.ts", group: "lifecycle-sync", locks: "Block move keeps the block under the pointer, block navigation, width-mode persistence, keyboard toggles" },
];

/** Plain JSON for the Python harness and the gallery scripts. */
export function groupsJson(): { groups: readonly E2eGroup[]; integrationTests: readonly IntegrationTestRow[] } {
  return { groups: GROUPS, integrationTests: INTEGRATION_TESTS };
}
