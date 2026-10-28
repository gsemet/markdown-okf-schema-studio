import { DEFAULT_PREVIEW_CONTENT_WIDTH } from "../../configuration/previewConfiguration";

// @implements_req SwRS-MDOKFSTUDIO-CORE-008
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-028
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-143
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-152
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-002
/**
 * Comments: comment and TODO chips, inline threads, incoming-change marks, review comment popovers,
 * the orphaned comments box and the toolbar and setting toggles that hide them.
 *
 * Part of the preview theme stylesheet (`PREVIEW_THEME_CSS`, `../previewStyles.ts`), which joins
 * the parts in cascade order: moving a rule to another part changes the cascade.
 */
export const COMMENT_CSS = `
/* Comment and TODO chips: gray for an HTML comment, green for TODO. The chip never changes the line
   height; the comment text lives in a hidden body that expansion reveals. */
#sphinx-myst-preview-content .okf-chip {
  display: inline-block;
  box-sizing: border-box;
  margin: 0 0.15em;
  padding: 0 0.5em;
  border: 1px solid var(--studio-widget-border, rgba(128, 128, 128, 0.4));
  border-radius: 0.75em;
  background: var(--studio-editorWidget-background, rgba(128, 128, 128, 0.12));
  color: var(--studio-descriptionForeground, #717171);
  font-family: var(--studio-editor-font-family, monospace);
  font-size: 0.78em;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: baseline;
  white-space: nowrap;
  cursor: pointer;
}

#sphinx-myst-preview-content .okf-chip--todo {
  border-color: var(--studio-charts-green, #16825d);
  background: color-mix(in srgb, var(--studio-charts-green, #16825d) 16%, transparent);
  color: var(--studio-charts-green, #16825d);
}

/* Inline thread: a green chip led by a speech bubble; the bubble is a mask, so it takes the chip
   color in every theme. */
#sphinx-myst-preview-content .okf-chip--thread {
  border-color: var(--studio-charts-green, #16825d);
  background: color-mix(in srgb, var(--studio-charts-green, #16825d) 16%, transparent);
  color: var(--studio-charts-green, #16825d);
}

#sphinx-myst-preview-content .okf-chip--thread::before {
  content: "";
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-inline-end: 0.35em;
  vertical-align: -0.15em;
  background-color: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Cpath d='M4 4h16v12H10l-5 4v-4H4z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Cpath d='M4 4h16v12H10l-5 4v-4H4z'/%3E%3C/svg%3E") center / contain no-repeat;
}

#sphinx-myst-preview-content .okf-chip:focus-visible {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
  outline-offset: 1px;
}

#sphinx-myst-preview-content div.okf-comment {
  margin: 0.4em 0;
  line-height: 1.4;
}

#sphinx-myst-preview-content .okf-comment-body[hidden] {
  display: none;
}

/* An opened comment reads like an admonition: accent bar, tinted panel and a title (Comment or
   TODO) taken from the comment kind. The text is a plain text node, so line breaks are kept. */
#sphinx-myst-preview-content .okf-comment > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--studio-descriptionForeground, #717171);
  display: block;
  margin: 0.4em 0;
  padding: 0.6em 1em;
  border: 1px solid var(--sphinx-preview-border);
  border-inline-start: 4px solid var(--sphinx-preview-accent);
  border-radius: 0;
  background: var(--studio-textBlockQuote-background, rgba(128, 128, 128, 0.08));
  background: color-mix(in srgb, var(--sphinx-preview-accent) 14%, var(--studio-editor-background, Canvas));
  color: var(--studio-editor-foreground, CanvasText);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="todo"] > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--studio-charts-green, #16825d);
}

#sphinx-myst-preview-content .okf-comment > .okf-comment-body:not([hidden])::before {
  content: "Comment";
  display: block;
  margin-bottom: 0.3em;
  color: var(--sphinx-preview-accent);
  font-weight: 600;
  white-space: normal;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="todo"] > .okf-comment-body:not([hidden])::before {
  content: "TODO";
}

/* Edit mode titles an opened comment with the literal tag that produced it, in code font
   (<!-- --> or <!-- TODO -->); read mode keeps the words Comment and TODO. */
html[data-sphinx-preview-edit-mode="on"] #sphinx-myst-preview-content .okf-comment > .okf-comment-body[data-okf-tag]:not([hidden])::before {
  content: attr(data-okf-tag);
  font-family: var(--studio-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.9em;
}

/* An open thread: one entry per message, then the reply box and Delete. The message text is a text
   node, so its line breaks are kept; the body itself wraps normally. */
#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body:not([hidden]) {
  --sphinx-preview-accent: var(--studio-charts-green, #16825d);
  white-space: normal;
}

#sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] > .okf-comment-body:not([hidden])::before {
  content: "Thread";
}

#sphinx-myst-preview-content .okf-thread-message + .okf-thread-message {
  margin-top: 0.6em;
  padding-top: 0.5em;
  border-top: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content .okf-thread-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2em 0.8em;
  align-items: baseline;
}

#sphinx-myst-preview-content .okf-thread-author {
  font-weight: 600;
}

#sphinx-myst-preview-content .okf-thread-date {
  color: var(--studio-descriptionForeground, #717171);
  font-size: 0.85em;
}

#sphinx-myst-preview-content .okf-thread-text {
  margin-top: 0.2em;
  white-space: pre-wrap;
}

#sphinx-myst-preview-content .okf-thread-actions {
  margin-top: 0.8em;
  padding-top: 0.6em;
  border-top: 1px solid var(--sphinx-preview-border);
}

#sphinx-myst-preview-content .okf-thread-actions textarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-height: 3.6em;
  padding: 0.4em 0.5em;
  border: 1px solid var(--studio-input-border, var(--sphinx-preview-border));
  border-radius: 3px;
  background: var(--studio-input-background, transparent);
  color: var(--studio-input-foreground, inherit);
  font: inherit;
  resize: vertical;
}

#sphinx-myst-preview-content .okf-thread-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  align-items: center;
  margin-top: 0.5em;
}

#sphinx-myst-preview-content .okf-thread-buttons button {
  padding: 0.25em 0.8em;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 2px;
  background: var(--studio-button-background, #0e639c);
  color: var(--studio-button-foreground, #fff);
  font: inherit;
  cursor: pointer;
}

#sphinx-myst-preview-content .okf-thread-buttons button[data-okf-thread-delete] {
  background: var(--studio-button-secondaryBackground, rgba(128, 128, 128, 0.2));
  color: var(--studio-button-secondaryForeground, inherit);
}

#sphinx-myst-preview-content .okf-thread-buttons button:disabled {
  opacity: 0.5;
  cursor: default;
}

#sphinx-myst-preview-content .okf-thread-buttons button:focus-visible,
#sphinx-myst-preview-content .okf-thread-actions textarea:focus-visible {
  outline: 1px solid var(--studio-focusBorder, #007fd4);
  outline-offset: 1px;
}

#sphinx-myst-preview-content .okf-thread-status {
  color: var(--studio-errorForeground, #f14c4c);
  font-size: 0.9em;
}

/* Incoming-change mark: a green bar for each block changed since the last commit. All bars sit in
   one column at the inline start of the page, whatever the indentation of the block, with square
   ends and the full height of the block. They are drawn in a layer after the content (placed by the
   page script from the block boxes), so no block, neighbour or text edge moves and no ancestor
   clips a bar. */
[data-sphinx-preview-change-layer] {
  position: absolute;
  inset-block-start: 0;
  inset-inline: 0;
  height: 0;
  margin: 0;
  padding: 0;
  pointer-events: none;
  user-select: none;
}

[data-sphinx-preview-change-layer] > span {
  position: absolute;
  inset-inline-start: 8px;
  width: 3px;
  border-radius: 0;
  background: var(--studio-editorGutter-addedBackground, #2ea043);
}

/* Side-by-side diff of changed blocks (CR 147). The Side-by-side button turns each block changed since
   the last commit into a card: the block as it was on the left, as it is on the right, the removed and
   added words marked. The page script puts the cards in front of the blocks and hides those; the
   attribute on <html> switches both off at once, and edit mode never shows them. */
html[data-sphinx-preview-sbs="off"] [data-okf-sbs-card],
html[data-sphinx-preview-edit-mode="on"] [data-okf-sbs-card] {
  display: none;
}

html[data-sphinx-preview-sbs="on"]:not([data-sphinx-preview-edit-mode="on"]) [data-okf-sbs-replaced] {
  display: none;
}

[data-okf-sbs-card] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  margin-block: 0.6em;
  border: 1px solid var(--studio-panel-border, rgba(128, 128, 128, 0.35));
  border-radius: 4px;
  overflow: hidden;
}

[data-okf-sbs-side] {
  position: relative;
  min-width: 0;
  padding: 1.2em 0.8em 0.4em;
  overflow-x: auto;
}

[data-okf-sbs-side]:empty {
  min-height: 2.6em;
}

[data-okf-sbs-side]::before {
  content: attr(data-okf-sbs-label);
  position: absolute;
  inset-block-start: 0.3em;
  inset-inline-start: 0.8em;
  font-size: 0.65em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--studio-descriptionForeground, currentColor);
  opacity: 0.8;
}

[data-okf-sbs-side="base"] {
  background: color-mix(in srgb, var(--studio-errorForeground, #f14c4c) 8%, transparent);
  border-inline-end: 1px solid var(--studio-panel-border, rgba(128, 128, 128, 0.35));
}

[data-okf-sbs-side="current"] {
  background: color-mix(in srgb, var(--studio-editorGutter-addedBackground, #2ea043) 8%, transparent);
}

[data-okf-sbs-side] > :first-child {
  margin-block-start: 0;
}

[data-okf-sbs-side] > :last-child {
  margin-block-end: 0;
}

[data-okf-sbs-word="removed"] {
  background: color-mix(in srgb, var(--studio-errorForeground, #f14c4c) 32%, transparent);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

[data-okf-sbs-word="added"] {
  background: color-mix(in srgb, var(--studio-editorGutter-addedBackground, #2ea043) 32%, transparent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
}

@media (max-width: 560px) {
  [data-okf-sbs-card] {
    grid-template-columns: minmax(0, 1fr);
  }

  [data-okf-sbs-side="base"] {
    border-inline-end: 0;
    border-block-end: 1px solid var(--studio-panel-border, rgba(128, 128, 128, 0.35));
  }
}

/* preview.showIncomingChanges off: the Side-by-side button goes with the Diff button. */
html[data-okf-incoming-changes="false"] [data-sphinx-preview-sbs-toggle] {
  display: none;
}

/* Review comments: a highlighted quote (or a badge on its block) opens a popover with the thread.
   Marks only paint; badges and the popover are out of the flow, so nothing moves. */
#sphinx-myst-preview-content mark[data-okf-comment-thread] {
  background: var(--studio-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
  color: inherit;
  border-radius: 2px;
  cursor: pointer;
}

#sphinx-myst-preview-content mark[data-okf-comment-thread][data-okf-comment-resolved="true"] {
  background: transparent;
  text-decoration: underline dotted;
  text-decoration-color: var(--studio-descriptionForeground, currentColor);
}

#sphinx-myst-preview-content [data-okf-comment-badged] {
  position: relative;
}

#sphinx-myst-preview-content button[data-okf-comment-badge] {
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  padding: 0;
  margin: 0;
  border: 1px solid var(--studio-focusBorder, #007fd4);
  border-radius: 7px 7px 7px 0;
  background: var(--studio-editor-findMatchHighlightBackground, rgba(234, 92, 0, 0.33));
  cursor: pointer;
}

#sphinx-myst-preview-content button[data-okf-comment-badge][data-okf-comment-badge-after] {
  position: static;
  display: block;
  margin-left: auto;
}

#sphinx-myst-preview-content button[data-okf-comment-badge][data-okf-comment-resolved="true"] {
  opacity: 0.4;
}

[data-okf-comment-popover] {
  position: fixed;
  z-index: 50;
  box-sizing: border-box;
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px 10px;
  border: 1px solid var(--studio-editorWidget-border, var(--studio-focusBorder, #454545));
  border-radius: 0;
  background: var(--studio-editorWidget-background, var(--studio-editor-background));
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
  font-size: 0.9em;
}

[data-okf-comment-popover] [data-okf-comment-state] {
  margin-bottom: 6px;
  font-style: italic;
}

[data-okf-comment-popover] [data-okf-comment-entry] + [data-okf-comment-entry] {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
}

[data-okf-comment-popover] [data-okf-comment-head] {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

/* The date is smaller, not faded: fading takes the text under the 4.5:1 contrast. */
[data-okf-comment-popover] [data-okf-comment-head] span {
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.9em;
}

[data-okf-comment-popover] [data-okf-comment-body] {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* Comment button of a text selection, the box that writes a comment, and the reply box (T43). */
button[data-okf-comment-create] {
  position: fixed;
  z-index: 50;
  padding: 2px 10px;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 3px;
  background: var(--studio-button-background);
  color: var(--studio-button-foreground);
  box-shadow: 0 2px 6px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

button[data-okf-comment-create]:hover {
  background: var(--studio-button-hoverBackground, var(--studio-button-background));
}

[data-okf-comment-compose] {
  position: fixed;
  z-index: 51;
  box-sizing: border-box;
  width: min(320px, calc(100vw - 16px));
  padding: 8px 10px;
  border: 1px solid var(--studio-editorWidget-border, var(--studio-focusBorder, #454545));
  border-radius: 0;
  background: var(--studio-editorWidget-background, var(--studio-editor-background));
  color: var(--studio-editorWidget-foreground, var(--studio-editor-foreground));
  box-shadow: 0 2px 8px var(--studio-widget-shadow, rgba(0, 0, 0, 0.36));
  font-size: 0.9em;
}

[data-okf-comment-compose] [data-okf-comment-quote] {
  max-height: 4.5em;
  margin-bottom: 6px;
  overflow: hidden;
  color: var(--studio-descriptionForeground, inherit);
  font-style: italic;
  overflow-wrap: anywhere;
}

[data-okf-comment-compose] textarea,
[data-okf-comment-popover] textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 3.2em;
  resize: vertical;
  padding: 4px 6px;
  border: 1px solid var(--studio-input-border, rgba(128, 128, 128, 0.5));
  background: var(--studio-input-background);
  color: var(--studio-input-foreground);
  font: inherit;
}

[data-okf-comment-compose] textarea::placeholder,
[data-okf-comment-popover] textarea::placeholder,
#sphinx-myst-preview-content .okf-thread-actions textarea::placeholder {
  color: var(--studio-descriptionForeground, inherit);
  opacity: 1;
}

[data-okf-comment-compose] textarea:focus,
[data-okf-comment-popover] textarea:focus {
  outline: 1px solid var(--studio-focusBorder);
  outline-offset: -1px;
}

[data-okf-comment-compose] [data-okf-comment-actions],
[data-okf-comment-popover] [data-okf-comment-reply] {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

[data-okf-comment-popover] [data-okf-comment-reply] {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
}

[data-okf-comment-popover] [data-okf-comment-reply] textarea {
  flex: 1 1 100%;
}

[data-okf-comment-compose] button,
[data-okf-comment-popover] [data-okf-comment-reply] button {
  padding: 2px 10px;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 3px;
  background: var(--studio-button-secondaryBackground, rgba(128, 128, 128, 0.25));
  color: var(--studio-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

[data-okf-comment-compose] button[data-okf-comment-compose-save],
[data-okf-comment-popover] button[data-okf-comment-reply-send] {
  background: var(--studio-button-background);
  color: var(--studio-button-foreground);
}

/* Resolve / Reopen, Delete and its question in the thread popover (T44). */
[data-okf-comment-popover] [data-okf-comment-thread-actions] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
}

[data-okf-comment-popover] [data-okf-comment-thread-actions] button {
  padding: 2px 10px;
  border: 1px solid var(--studio-button-border, transparent);
  border-radius: 3px;
  background: var(--studio-button-secondaryBackground, rgba(128, 128, 128, 0.25));
  color: var(--studio-button-secondaryForeground, inherit);
  font: inherit;
  cursor: pointer;
}

[data-okf-comment-popover] [data-okf-comment-thread-actions] button[disabled] {
  opacity: 0.5;
  cursor: default;
}

[data-okf-comment-popover] [data-okf-comment-thread-actions] button[data-okf-comment-delete-yes] {
  background: var(--studio-button-background);
  color: var(--studio-button-foreground);
}

[data-okf-comment-popover] [data-okf-comment-action-error],
[data-okf-comment-popover] [data-okf-comment-error] {
  flex: 1 1 100%;
  color: var(--studio-errorForeground, #f48771);
  overflow-wrap: anywhere;
}

/* The "Orphaned comments" box (T44) follows the content element, outside the patched HTML. Its top
   margin cancels the content's bottom padding, so it sits in that empty space: the scrollable
   height of the page only grows when the box is taller than the padding, and the end of the
   document, the first-element gap and the insert points of the content are untouched. The box
   passes pointer events through; only its entries take them. */
[data-okf-orphans] {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--sphinx-preview-column-width, ${DEFAULT_PREVIEW_CONTENT_WIDTH}px);
  margin: calc(-1 * min(80vh, max(24px, calc(100vh - var(--sphinx-preview-reading-offset, 0px) - 40px)))) auto 0;
  padding: 0 var(--sphinx-preview-content-gutter) 16px;
  pointer-events: none;
}

[data-okf-orphans] [data-okf-orphans-title] {
  margin-bottom: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
  font-weight: 600;
}

[data-okf-orphans] button[data-okf-comment-orphan] {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin-top: 4px;
  padding: 4px 8px;
  border: 1px solid var(--studio-editorWidget-border, rgba(128, 128, 128, 0.4));
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
}

[data-okf-orphans] [data-okf-orphan-quote] {
  display: block;
  font-style: italic;
  overflow-wrap: anywhere;
}

[data-okf-orphans] [data-okf-orphan-meta] {
  display: block;
  color: var(--studio-descriptionForeground, inherit);
  font-size: 0.9em;
  overflow-wrap: anywhere;
}

/* Toolbar Diff button off: the marks go away at once; the host stops sending ranges. */
html[data-sphinx-preview-incoming="off"] [data-sphinx-preview-change-layer] {
  display: none;
}

/* preview.showIncomingChanges off: the Diff button is not offered. The markup stays the same. */
html[data-okf-incoming-changes="false"] [data-sphinx-preview-diff-toggle] {
  display: none;
}

/* preview.showComments off: the gray comment chips go away at once, without a new render. TODO
   chips stay. */
html[data-okf-show-comments="false"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="comment"] {
  display: none;
}

/* Toolbar Comments button off: same hiding as the setting (gray and thread chips, TODO chips stay),
   kept per workspace. The button itself is not offered when the setting is off. */
html[data-sphinx-preview-comments="off"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="comment"],
html[data-sphinx-preview-comments="off"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] {
  display: none;
}

html[data-okf-show-comments="false"] [data-sphinx-preview-comments-toggle] {
  display: none;
}

/* The thread chips are hidden with the gray ones. */
html[data-okf-show-comments="false"] #sphinx-myst-preview-content .okf-comment[data-okf-comment-kind="thread"] {
  display: none;
}

/* Comments hidden (the Comments button off, or preview.showComments off): every review mark goes.
   A highlight keeps its quoted text as plain text; badges and the Orphaned comments box are not
   shown. The page script lets clicks and keys on them through and takes highlights out of the Tab
   order. */
html[data-sphinx-preview-comments="off"] #sphinx-myst-preview-content mark[data-okf-comment-thread],
html[data-okf-show-comments="false"] #sphinx-myst-preview-content mark[data-okf-comment-thread] {
  background: transparent;
  color: inherit;
  border-radius: 0;
  text-decoration: none;
  cursor: inherit;
}

html[data-sphinx-preview-comments="off"] #sphinx-myst-preview-content button[data-okf-comment-badge],
html[data-okf-show-comments="false"] #sphinx-myst-preview-content button[data-okf-comment-badge],
html[data-sphinx-preview-comments="off"] [data-okf-orphans],
html[data-okf-show-comments="false"] [data-okf-orphans] {
  display: none;
}

#sphinx-myst-preview-content img {
  max-width: 100%;
  height: auto;
}
`;
