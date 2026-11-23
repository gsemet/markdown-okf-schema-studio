/** Scroll anchoring and the hidden sticky headings. */
const PAGE_BASE_CSS = `
/* The runtime owns scroll anchoring; browser scroll anchoring would fight it. */
html,
body {
  overflow-anchor: none;
}

[data-sphinx-preview-sticky-headings][hidden] {
  display: none;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
/** The text cursor over what a click opens for editing. */
const LINK_CLICK_CURSOR_CSS = `/* A plain click on a link edits its block too (CR 217): the link shows the text cursor of the block.
   The page marks only those links (linkEditing.ts); every other link keeps its pointer. */
html[data-sphinx-preview-edit-mode="on"] [data-sphinx-source-file][data-sphinx-source-line],
html[data-sphinx-preview-edit-mode="on"] a[data-sphinx-preview-link-edits="true"] {
  cursor: text;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-260
/** A linked card's overlay lets the part under the pointer decide what opens. */
const CARD_PART_OPENS_CSS = `/* Edit mode: the stretched overlay of a linked card no longer catches the pointer, so the part of
   the card under it (title, header, body, footer) decides what opens (CR 217). */
html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content .myst-grid-card-link::after {
  pointer-events: none;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-017
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
/**
 * The dashed hover outline of what a click would edit, and the hidden block under an editor. An
 * edited item of an ordered list is collapsed, not removed from the layout: an element with
 * `display: none` leaves the list's numbering (Chromium numbers the items itself and ignores a
 * `counter-increment: list-item` on the editor), so the next items would lose one; collapsed and
 * invisible, it still counts, and the next items keep their source numbers.
 */
const EDIT_HOVER_OUTLINE_CSS = `[data-sphinx-preview-editing="true"] {
  display: none !important;
}

ol > li[data-sphinx-preview-editing="true"] {
  display: list-item !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  margin-block: 0 !important;
  padding-block: 0 !important;
  border-block-width: 0 !important;
  overflow: hidden !important;
}

html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-edit-hover="true"] {
  outline: 1px dashed var(--studio-focusBorder, Highlight);
  outline-offset: 3px;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-140
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-254
/** The ring of the keyboard block selection and its screen-reader status. */
const BLOCK_SELECTION_RING_CSS = `html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-block-selected="true"] {
  outline: 2px solid var(--studio-focusBorder, Highlight);
  outline-offset: 3px;
}

/* The table cell the keyboard selected: the same ring, drawn inside the cell so neighbours keep theirs. */
html[data-sphinx-preview-edit-mode="on"] [data-sphinx-preview-cell-focus="true"] {
  outline: 2px solid var(--studio-focusBorder, Highlight);
  outline-offset: -2px;
}

/* Whichever moved last owns the block actions: after a pointer move the selection ring goes away. */
html[data-sphinx-preview-edit-mode="on"][data-sphinx-preview-actions-owner="pointer"] [data-sphinx-preview-block-selected="true"] {
  outline: none;
}

.sphinx-preview-selection-status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-087
/** The insert point and its plus button after every body. */
const INSERT_POINT_CSS = `.sphinx-preview-insert-point {
  position: relative;
  height: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

html:not([data-sphinx-preview-edit-mode="on"]) .sphinx-preview-insert-point {
  display: none;
}

/* Files dragged from the Explorer: a line across the page where the links will land. */
.sphinx-preview-insert-point--drop::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -2px;
  height: 4px;
  border-radius: 2px;
  background: var(--studio-focusBorder, Highlight);
  pointer-events: none;
}

.sphinx-preview-insert-point--drop button {
  opacity: 1;
}

.sphinx-preview-insert-point button {
  position: absolute;
  left: -1.6em;
  top: -0.8em;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 1.4em;
  height: 1.4em;
  padding: 0;
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 50%;
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
  font: inherit;
  font-size: 0.9em;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
}

[data-sphinx-source-line]:hover + .sphinx-preview-insert-point button,
.sphinx-preview-insert-point button:hover,
.sphinx-preview-insert-point button:focus-visible {
  opacity: 1;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-109
/** The up and down move buttons of an insert point. */
const MOVE_BUTTONS_CSS = `/* The block actions follow what moved last: while the keyboard selection owns them, the hovered
   block does not show them and the bar of the selection does. */
html[data-sphinx-preview-actions-owner="keyboard"] [data-sphinx-source-line]:hover
  + .sphinx-preview-insert-point:not([data-sphinx-actions-shown="true"]) button:not(:hover):not(:focus-visible) {
  opacity: 0;
}

html[data-sphinx-preview-actions-owner="keyboard"] .sphinx-preview-insert-point[data-sphinx-actions-shown="true"] button {
  opacity: 1;
}

html[data-sphinx-preview-actions-owner="keyboard"] .sphinx-preview-insert-point[data-sphinx-actions-shown="true"] button.sphinx-preview-move:disabled {
  opacity: 0.5;
}

/* The move buttons sit right of the "+", touching it so the pointer never loses the bar. */
.sphinx-preview-insert-point button.sphinx-preview-move--up {
  left: -0.2em;
}

.sphinx-preview-insert-point button.sphinx-preview-move--down {
  left: 1.2em;
}

.sphinx-preview-insert-point button.sphinx-preview-move:disabled {
  cursor: default;
  background: var(--studio-button-secondaryBackground, GrayText);
  color: var(--studio-button-secondaryForeground, Canvas);
}

[data-sphinx-source-line]:hover + .sphinx-preview-insert-point button.sphinx-preview-move:disabled,
.sphinx-preview-insert-point button.sphinx-preview-move:disabled:hover {
  opacity: 0.5;
}

html[data-sphinx-preview-block-editing="true"] .sphinx-preview-insert-point .sphinx-preview-move {
  display: none;
}

.sphinx-preview-move-status {
  position: absolute;
  left: 4.2em;
  top: -0.9em;
  z-index: 2;
  max-width: 24em;
  padding: 2px 8px;
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 3px;
  background: var(--studio-editorWidget-background, Canvas);
  color: var(--studio-editorWidget-foreground, CanvasText);
  font-size: 0.85em;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-265
/**
 * The Delete block button of an insert point (`createDeleteBlockButton`), right of the down arrow
 * and touching it. The move status sits right of it (`left` above), so the two never overlap.
 */
const DELETE_BLOCK_BUTTON_CSS = `/* The delete button: the down arrow ends at 2.6em (1.2em + its 1.4em width). */
.sphinx-preview-insert-point button.sphinx-preview-delete {
  left: 2.6em;
}

html[data-sphinx-preview-block-editing="true"] .sphinx-preview-insert-point .sphinx-preview-delete {
  display: none;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-269
/**
 * The blank-line block of edit mode (`features/blankLines.ts`), one per shown blank line: a dashed bar with its label
 * and the Delete block button at its left edge. Hidden while its editor is open; the host's list never shows.
 */
const BLANK_LINES_BLOCK_CSS = `[data-okf-blank-runs] {
  display: none;
}

html:not([data-sphinx-preview-edit-mode="on"]) .sphinx-preview-blank-lines {
  display: none;
}

.sphinx-preview-blank-lines {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 1.8em;
  margin: 0.3em 0;
  padding: 0 0.6em 0 2.2em;
  border: 1px dashed var(--studio-descriptionForeground, GrayText);
  border-radius: 4px;
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.85em;
  cursor: pointer;
}

.sphinx-preview-blank-lines::before {
  content: attr(data-okf-blank-label);
}

/* Blocks of one range stack with no gap. */
.sphinx-preview-blank-lines + .sphinx-preview-blank-lines {
  margin-top: 0;
  border-top-width: 0;
}
.sphinx-preview-blank-lines:has(+ .sphinx-preview-blank-lines) {
  margin-bottom: 0;
}

.sphinx-preview-blank-lines:hover,
.sphinx-preview-blank-lines:focus-visible {
  border-style: solid;
}

.sphinx-preview-blank-lines[data-sphinx-preview-editing="true"] {
  display: none;
}

.sphinx-preview-blank-lines button.sphinx-preview-delete {
  position: absolute;
  left: 0.3em;
  top: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 1.4em;
  height: 1.4em;
  margin-top: -0.7em;
  padding: 0;
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 50%;
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
}

.sphinx-preview-blank-lines:hover button.sphinx-preview-delete,
.sphinx-preview-blank-lines:focus-visible button.sphinx-preview-delete,
.sphinx-preview-blank-lines[data-sphinx-preview-block-selected="true"] button.sphinx-preview-delete,
.sphinx-preview-blank-lines button.sphinx-preview-delete:focus-visible {
  opacity: 1;
}

html[data-sphinx-preview-block-editing="true"] .sphinx-preview-blank-lines .sphinx-preview-delete {
  display: none;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-087
/** The insert point of an empty document. */
const START_POINT_CSS = `.sphinx-preview-insert-point--start {
  height: auto;
  margin: 0 0 1em;
}

.sphinx-preview-insert-point--start button {
  position: static;
  display: inline-flex;
  width: auto;
  height: auto;
  padding: 4px 12px;
  border-radius: 3px;
  font-size: 1em;
  opacity: 1;
}

#sphinx-myst-preview-content .sphinx-preview-insert-point--start [data-sphinx-preview-start-hint] {
  margin-block-start: 10px;
  line-height: 1.4;
}

/* The keyboard selection of an empty document: the ring of a selected block. */
html[data-sphinx-preview-edit-mode="on"] .sphinx-preview-insert-point--start button[data-sphinx-preview-start-selected="true"] {
  outline: 2px solid var(--studio-focusBorder, Highlight);
  outline-offset: 3px;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-033
/** The block editor with its status line, Done and Cancel. */
const BLOCK_EDITOR_CSS = `.sphinx-preview-block-editor {
  position: relative;
  z-index: 1;
  margin: 0;
  border: 1px solid var(--studio-focusBorder, Highlight);
  border-radius: 4px;
  padding: 6px 8px;
  background: var(--studio-editor-background, Canvas);
  color: inherit;
}

.sphinx-preview-table-cell-editor textarea,
.sphinx-preview-block-editor textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 1.5em;
  max-height: none;
  resize: none;
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: calc(var(--studio-editor-font-size, 0.95em) - 1px);
  tab-size: 4;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
}

.sphinx-preview-block-editor [data-sphinx-preview-edit-status]:empty {
  display: none;
}

.sphinx-preview-block-editor-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  margin-block-start: 8px;
}

.sphinx-preview-block-editor-buttons {
  display: flex;
  flex: none;
  gap: 6px;
  margin-inline-start: auto;
}

/* The id selector beats the "#sphinx-myst-preview-content p" rule, whose bottom margin pushed the text up. */
#sphinx-myst-preview-content .sphinx-preview-block-editor .sphinx-preview-block-editor-actions [data-sphinx-preview-edit-status] {
  flex: 1 1 14em;
  align-self: center;
  min-width: 0;
  margin: 0;
  font-size: 0.75em;
  line-height: 1.4;
}

.sphinx-preview-block-editor-buttons button {
  min-width: 64px;
  padding: 4px 10px;
  border: 1px solid var(--sphinx-preview-border);
  border-radius: 3px;
  background: var(--studio-button-secondaryBackground, ButtonFace);
  color: var(--studio-button-secondaryForeground, ButtonText);
  cursor: pointer;
}

.sphinx-preview-block-editor-buttons button:first-child {
  border-color: transparent;
  background: var(--studio-button-background, Highlight);
  color: var(--studio-button-foreground, HighlightText);
}

.sphinx-preview-block-editor [data-sphinx-preview-edit-status],
#sphinx-myst-preview-content .sphinx-preview-insert-point--start [data-sphinx-preview-start-hint] {
  margin: 6px 0 0;
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.75em;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-TABLE-006
/** The table cell text box. */
const CELL_EDITOR_CSS = `[data-sphinx-preview-table-cell-selected="true"] {
  position: relative;
  z-index: 2;
}

/* In edit mode every table cell keeps a usable width (an empty new column stays clickable) and the
   cell being edited is wide enough to type in: 300 px, or the room of the table's box when the pane
   is narrower (the runtime writes it on the cell, see modules/cellEditorRoom.ts), never under 8em.
   Without the property the edited cell keeps 300 px. The rendered (read) view is unchanged. */
html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content table :where(th, td) {
  min-width: 8em;
}

html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content table :where(th, td)[data-sphinx-preview-table-cell-selected="true"] {
  min-width: max(8em, min(300px, var(--sphinx-preview-cell-editor-room, 300px)));
}

/* The rendered cell content keeps its width (so columns do not move) but no height: the editor
   below is in the flow and the cell grows with the field and its buttons. */
[data-sphinx-table-cell-content="true"] {
  display: block;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}

/* contain: inline-size keeps the editor out of the column width calculation. */
.sphinx-preview-table-cell-editor {
  position: relative;
  z-index: 3;
  display: block;
  contain: inline-size;
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--studio-editor-foreground, CanvasText);
}

/* Font family, size and line-height come from the block editor rule above. */
.sphinx-preview-table-cell-editor textarea {
  height: auto;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--studio-editor-foreground, CanvasText);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
  resize: none;
}

.sphinx-preview-table-cell-editor .sphinx-preview-block-editor-actions {
  justify-content: flex-start;
  margin-block-start: 4px;
  gap: 4px;
}

.sphinx-preview-table-cell-editor [data-sphinx-preview-table-cell-hint] {
  flex: 0 1 auto;
  min-width: 0;
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.85em;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.sphinx-preview-table-cell-editor .sphinx-preview-block-editor-buttons {
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  margin-inline-start: 0;
}

.sphinx-preview-table-cell-editor .sphinx-preview-block-editor-buttons button {
  min-width: 0;
  max-width: 100%;
  padding: 1px 6px;
  overflow: hidden;
  font-size: 0.8em;
  line-height: 1.4;
}

`;

// @implements_req SwRS-MDOKFSTUDIO-TABLE-048
/** The table bar above the table. */
const TABLE_MENU_CSS = `/* CR 168: positioned (no offset, so still in the flow) with a z-index above the row and column handle
   layer (2): a handle that lands on a button, because it was placed before the bar grew or wrapped or
   because the table sits right of the bar, never takes the press. */
.sphinx-preview-table-menu {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin: 0 0 6px;
  padding: 3px;
  width: max-content;
  /* The runtime sets the inset when the bar opens under the floating preview controls at the top of
     the page: the bar then wraps left of them. */
  max-width: calc(100% - var(--sphinx-preview-table-menu-inset, 0px));
  border: 1px solid var(--studio-widget-border, var(--sphinx-preview-border));
  border-radius: 18px;
  background: var(--studio-editorWidget-background, var(--studio-editor-background, Canvas));
  color: var(--studio-icon-foreground, var(--studio-editor-foreground, CanvasText));
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.2);
}

`;

// @implements_req SwRS-MDOKFSTUDIO-TABLE-064
/** The table bar rides down with a tall table. */
const TABLE_MENU_STUCK_CSS = `/* CR 034: while its table scrolls, the runtime translates the bar down to just under the sticky band
   or the preview controls (never past the table's bottom); nothing is laid out again, so the text
   stays where it is. The menu is not translated otherwise. */
.sphinx-preview-table-menu[data-sphinx-table-menu-stuck="true"] {
  position: relative;
  z-index: 3;
  transform: translateY(var(--sphinx-preview-table-menu-shift, 0px));
}

`;

// @implements_req SwRS-MDOKFSTUDIO-TABLE-048
/** The buttons of the table bar. */
const TABLE_MENU_BUTTONS_CSS = `.sphinx-preview-table-menu button {
  display: inline-flex;
  align-items: center;
  width: auto;
  height: 30px;
  min-height: 30px;
  gap: 4px;
  padding: 0 8px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

.sphinx-preview-table-menu button:hover {
  background: var(--studio-toolbar-hoverBackground, rgba(128, 128, 128, 0.25));
}

.sphinx-preview-table-menu button:focus-visible {
  outline: 1px solid var(--studio-focusBorder, Highlight);
  outline-offset: -2px;
}

.sphinx-preview-table-menu button > svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

/* One rule per group: before the first button of the column group and before the table group, never
   between two buttons of the same group (Col + and Col −). */
.sphinx-preview-table-menu :is([data-sphinx-table-group="row"] + [data-sphinx-table-group="column"],
  [data-sphinx-table-group="column"] + [data-sphinx-table-group="table"]) {
  position: relative;
  margin-inline-start: 4px;
}

.sphinx-preview-table-menu :is([data-sphinx-table-group="row"] + [data-sphinx-table-group="column"],
  [data-sphinx-table-group="column"] + [data-sphinx-table-group="table"])::before {
  position: absolute;
  inset-block: 6px;
  inset-inline-start: -4px;
  width: 1px;
  background: var(--sphinx-preview-border);
  content: "";
}

/* The id selector beats the paragraph margin, which would push the text above the buttons' centre. */
#sphinx-myst-preview-content .sphinx-preview-table-menu [data-sphinx-preview-edit-status] {
  align-self: center;
  margin: 0 4px;
  line-height: 1.2;
  color: var(--studio-descriptionForeground, GrayText);
  font-size: 0.85em;
}

.sphinx-preview-table-menu [data-sphinx-preview-edit-status]:empty {
  display: none;
}

.sphinx-preview-table-menu button:disabled {
  cursor: default;
  opacity: 0.55;
}

`;

/** Row and column handles of a table. */
const TABLE_HANDLES_CSS = `/* Row handles of a pipe table or a list-table (the column handles follow below): the mark of the list editor sits just left of the
   table, outside it and centred on its row. A table scrolls sideways (overflow), so the handles live
   in a layer of their own at the page origin; the runtime sets each handle's left and top. A table
   with no room on its left is pushed right by the width of a handle. */
[data-okf-row-handle-layer] {
  position: absolute;
  inset: 0 auto auto 0;
  width: 0;
  height: 0;
  z-index: 2;
}

[data-okf-row-handle-layer] .okf-table-row-handle {
  position: absolute;
  margin: 0;
  transform: translate(-100%, -50%);
}

/* The dots of the mark hang down and right from their centre: lift them so they centre on the row. */
[data-okf-row-handle-layer] .okf-table-row-handle::before {
  transform: translate(-2.5px, -5px);
}

/* Column handles: the same mark, turned, just above the table and centred on its column. The runtime
   sets each handle's left (the middle of the header cell) and top (the top of the table). */
[data-okf-row-handle-layer] .okf-table-col-handle {
  position: absolute;
  width: 1.5em;
  height: 1em;
  margin: 0;
  transform: translate(-50%, -100%);
}

/* Two rows of three dots hang down and right from their centre: lift them to centre on the handle. */
[data-okf-row-handle-layer] .okf-table-col-handle::before {
  box-shadow: 5px 0 currentColor, 10px 0 currentColor, 0 5px currentColor, 5px 5px currentColor,
    10px 5px currentColor;
  transform: translate(-5px, -2.5px);
}

/* The bar of a cell editor sits right above its table: leave the handles room between them. */
html[data-sphinx-preview-edit-mode="on"] .sphinx-preview-table-menu:has(+ [data-okf-col-handles], + * [data-okf-col-handles]) {
  margin-bottom: 22px;
}

#sphinx-myst-preview-content table[data-okf-row-shift="true"] {
  width: max-content !important;
  max-width: calc(100% - 2.2em) !important;
  margin-inline-start: 2.2em !important;
  margin-inline-end: 0 !important;
}

/* Whole words: a narrow column breaks at spaces, the table scrolls sideways instead. */
#sphinx-myst-preview-content table[data-okf-row-handles="true"] :where(th, td) {
  overflow-wrap: normal;
  word-break: normal;
}

#sphinx-myst-preview-content tr[data-okf-row-dragging="true"] {
  opacity: 0.45;
}

#sphinx-myst-preview-content tr[data-okf-row-drop="before"] > :is(td, th) {
  box-shadow: inset 0 2px 0 var(--studio-focusBorder, Highlight);
}

#sphinx-myst-preview-content tr[data-okf-row-drop="after"] > :is(td, th) {
  box-shadow: inset 0 -2px 0 var(--studio-focusBorder, Highlight);
}

#sphinx-myst-preview-content :is(td, th)[data-okf-col-dragging="true"] {
  opacity: 0.45;
}

#sphinx-myst-preview-content :is(td, th)[data-okf-col-drop="before"] {
  box-shadow: inset 2px 0 0 var(--studio-focusBorder, Highlight);
}

#sphinx-myst-preview-content :is(td, th)[data-okf-col-drop="after"] {
  box-shadow: inset -2px 0 0 var(--studio-focusBorder, Highlight);
}
`;

/** Handles of list items. */
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-262
const LIST_ITEM_HANDLES_CSS = `/* The handles of list items: the mark of the list editor just left of the list, or of the outermost
   alert, quote or admonition around it, on the item's first line. They live in a layer of their own
   at the page origin; the runtime sets each handle's left and top. A list or container with no room
   on its left is pushed right by the width of a handle (no max-content width: a list or a container
   keeps its block width). */
html[data-sphinx-preview-edit-mode="on"] [data-okf-list-handle-layer] {
  position: absolute;
  inset: 0 auto auto 0;
  width: 0;
  height: 0;
  z-index: 2;
}

html[data-sphinx-preview-edit-mode="on"] [data-okf-list-handle-layer] .okf-list-item-handle {
  position: absolute;
  margin: 0;
  transform: translate(-100%, -50%);
}

/* The dots of the mark hang down and right from their centre: lift them so they centre on the line. */
html[data-sphinx-preview-edit-mode="on"] [data-okf-list-handle-layer] .okf-list-item-handle::before {
  transform: translate(-2.5px, -5px);
}

html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content [data-okf-list-shift="true"] {
  max-width: calc(100% - 2.2em);
  margin-inline-start: 2.2em;
}

html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content li[data-okf-list-item-dragging="true"] {
  opacity: 0.45;
}

html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content li[data-okf-list-item-drop="before"] {
  box-shadow: inset 0 2px 0 var(--studio-focusBorder, Highlight);
}

html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content li[data-okf-list-item-drop="after"] {
  box-shadow: inset 0 -2px 0 var(--studio-focusBorder, Highlight);
}
`;

/**
 * Edit mode: scroll anchoring, editable blocks, insert points and move buttons, the block and table
 * cell editors and the table menu.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const EDIT_MODE_CSS = [
  PAGE_BASE_CSS,
  LINK_CLICK_CURSOR_CSS,
  CARD_PART_OPENS_CSS,
  EDIT_HOVER_OUTLINE_CSS,
  BLOCK_SELECTION_RING_CSS,
  INSERT_POINT_CSS,
  MOVE_BUTTONS_CSS,
  DELETE_BLOCK_BUTTON_CSS,
  BLANK_LINES_BLOCK_CSS,
  START_POINT_CSS,
  BLOCK_EDITOR_CSS,
  CELL_EDITOR_CSS,
  TABLE_MENU_CSS,
  TABLE_MENU_STUCK_CSS,
  TABLE_MENU_BUTTONS_CSS,
  TABLE_HANDLES_CSS,
  LIST_ITEM_HANDLES_CSS,
].join("");
