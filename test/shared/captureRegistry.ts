/**
 * The registry of real-window captures: every screenshot the real VS Code suites write, with its
 * stable id, group and the sentence it locks. Tracked in git (like `e2eGroups.ts`) because
 * `.agents/changes/` is ignored. The shared evidence writer (`test/integration/evidence.ts`) rejects
 * ids that are not listed here and, at the end of a complete suite, fails when a registered capture
 * of that suite was not taken. The README and gallery scripts read the `readme`/`curated` flags.
 *
 * Ids are `<group>/rNN-<slug>`; `NN` is permanent once assigned (new captures take the next free
 * number of their group). Files: `<run folder>/<group>/rNN-<slug>.png` plus `.md` and `.json` notes.
 */
import { isGroupId, type GroupId } from "./e2eGroups";

/** The real-window suites that write captures. Each has a run folder prefix. */
export type CaptureSuite = "real-input" | "checkbox" | "frontmatter" | "scroll" | "reload" | "untrusted";

export const SUITES: readonly CaptureSuite[] = ["real-input", "checkbox", "frontmatter", "scroll", "reload", "untrusted"];

/** Run folder prefix per suite, below `out/reports/e2e/screenshots/`. Part of the LATEST contract. */
export const RUN_FOLDER_PREFIX: Readonly<Record<CaptureSuite, string>> = {
  "real-input": "real-input-",
  checkbox: "checkbox-e2e-",
  frontmatter: "frontmatter-e2e-",
  scroll: "scroll-e2e-",
  reload: "reload-e2e-",
  untrusted: "untrusted-e2e-",
};

/**
 * `preview`: crop to the webview frame; `window`: the whole VS Code window; `element`: crop to a region
 * the capture call names (the changed excerpt), falling back to `preview` and then `window`.
 */
export type CaptureClip = "preview" | "window" | "element";

export interface ReadmeSource {
  /** File below `images/readme/`. */
  readonly file: string;
  /** Pixel box [x0, y0, x1, y1] on the window screenshot; copied from the former script, never tuned. */
  readonly crop: readonly [number, number, number, number];
  readonly width: number;
}

export interface CaptureEntry {
  readonly id: string;
  readonly group: GroupId;
  readonly suite: CaptureSuite;
  /** Name the capture had before the registry (file stem, or checkpoint name for `scroll`). */
  readonly legacy: string;
  /** One sentence, present tense, observable: raw material for the requirements. */
  readonly locks: string;
  /** `false`: the assertion and the note stay, no PNG is written and none is expected. */
  readonly capture?: false;
  readonly clip: CaptureClip;
  /** Sources of `images/readme/*.png`. */
  readonly readme?: readonly ReadmeSource[];
  /** File name of the curated `images/<file>` copy. */
  readonly curated?: string;
}

export const CAPTURES: readonly CaptureEntry[] = [
  { id: "gfm/r01-task-reading-unchecked", group: "gfm", suite: "checkbox", legacy: "01-reading-unchecked", locks: "A task list item in reading mode shows an unchecked box, no bullet, aligned with its text.", clip: "window" },
  { id: "gfm/r02-task-reading-checked", group: "gfm", suite: "checkbox", legacy: "02-reading-checked", locks: "Clicking a task box in reading mode checks it in the preview and writes `- [x]` to the source.", clip: "window" },
  { id: "gfm/r03-task-edit-unchecked", group: "gfm", suite: "checkbox", legacy: "03-edit-mode-unchecked", locks: "In edit mode a table-cell checkbox shows unchecked while the pencil is pressed.", clip: "window" },
  { id: "gfm/r04-task-edit-checked", group: "gfm", suite: "checkbox", legacy: "04-edit-mode-checked", locks: "In edit mode a checkbox click toggles the table cell in the source and opens no cell editor.", clip: "window" },
  { id: "frontmatter-editing/r01-value-minimal-patch", group: "frontmatter-editing", suite: "real-input", legacy: "08-frontmatter-value-minimal-patch", locks: "Editing one frontmatter value changes only that line of the YAML block.", clip: "window" },
  { id: "frontmatter-editing/r02-rename-minimal-patch", group: "frontmatter-editing", suite: "real-input", legacy: "09-frontmatter-rename-minimal-patch", locks: "Renaming a frontmatter key changes only that key line.", clip: "window" },
  { id: "frontmatter-editing/r03-remove-minimal-patch", group: "frontmatter-editing", suite: "real-input", legacy: "10-frontmatter-remove-minimal-patch", locks: "Removing a frontmatter field deletes only its line and keeps the others byte for byte.", clip: "window" },
  { id: "frontmatter-editing/r04-title-enter-saves", group: "frontmatter-editing", suite: "real-input", legacy: "11-frontmatter-title-enter", locks: "Enter in the frontmatter title field saves the title into the source.", clip: "window" },
  { id: "frontmatter-editing/r05-title-multiline", group: "frontmatter-editing", suite: "real-input", legacy: "12-frontmatter-title-multiline", locks: "A multi-line title is saved as valid YAML and the title field stays readable.", clip: "window" },
  { id: "frontmatter-editing/r06-boolean-one-click", group: "frontmatter-editing", suite: "real-input", legacy: "26-boolean-one-click", locks: "A boolean frontmatter value flips with a single click.", clip: "window" },
  { id: "frontmatter-editing/r07-list-click-edits", group: "frontmatter-editing", suite: "real-input", legacy: "27-list-click-edits", locks: "Clicking a list item in the properties table opens it for editing.", clip: "window" },
  { id: "frontmatter-editing/r08-list-enter-adds", group: "frontmatter-editing", suite: "real-input", legacy: "28-list-enter-adds", locks: "Enter in a list item editor adds a new item after it.", clip: "window" },
  { id: "frontmatter-editing/r09-list-link-warning", group: "frontmatter-editing", suite: "real-input", legacy: "29-list-link-warning", locks: "A list item that is not a valid link shows its warning in the table.", clip: "window" },
  { id: "frontmatter-editing/r10-row-actions-layout", group: "frontmatter-editing", suite: "real-input", legacy: "30-frontmatter-actions-value", locks: "The row action buttons of a frontmatter value sit inside the row without overlap.", clip: "window" },
  { id: "frontmatter-editing/r11-add-field-picker-layout", group: "frontmatter-editing", suite: "real-input", legacy: "31-frontmatter-actions-picker", locks: "The add-field picker opens under the table with its suggestions readable.", clip: "window" },
  { id: "frontmatter-editing/r12-required-remove-disabled", group: "frontmatter-editing", suite: "real-input", legacy: "32-required-remove-disabled", locks: "The remove button of a required field is disabled.", clip: "window" },
  { id: "frontmatter-editing/r13-custom-key-added", group: "frontmatter-editing", suite: "real-input", legacy: "33-custom-key-added", locks: "A custom key typed in the add-field picker is added to the table and the source.", clip: "window" },
  { id: "frontmatter-editing/r14-link-diagnostic-tooltip", group: "frontmatter-editing", suite: "real-input", legacy: "34-link-diagnostic-tooltip", locks: "A link diagnostic shows its message in an accessible tooltip.", clip: "window" },
  { id: "frontmatter-editing/r15-add-field-position", group: "frontmatter-editing", suite: "real-input", legacy: "t41-add-field-position", locks: "A new field is inserted at the position the picker was opened from.", clip: "window" },
  { id: "frontmatter-editing/r16-custom-key-plain", group: "frontmatter-editing", suite: "real-input", legacy: "t41-custom-key-plain", locks: "A custom key with no schema entry is written as a plain scalar.", clip: "window" },
  { id: "frontmatter-editing/r17-escape-on-picker", group: "frontmatter-editing", suite: "real-input", legacy: "t41-escape-on-picker", locks: "The add-field picker is open with a typed key just before Escape closes it.", clip: "window" },
  { id: "frontmatter-schema/r01-description-collapsed-after-refresh-dark-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-collapsed-after-refresh-narrow", locks: "The collapsed Description state survives a refresh in a narrow dark pane.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r02-description-collapsed-after-refresh-dark-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-collapsed-after-refresh", locks: "The collapsed Description state survives a refresh in a wide dark pane.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r03-description-collapsed-dark-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-collapsed-narrow", locks: "Collapsing Description in a narrow dark pane leaves Name and Value readable.", clip: "preview" },
  { id: "frontmatter-schema/r04-description-collapsed-dark-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-collapsed", locks: "Collapsing Description in a wide dark pane leaves Name and Value readable.", clip: "preview" },
  { id: "frontmatter-schema/r05-description-expanded-again-dark-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-expanded-again-narrow", locks: "Expanding Description again in a narrow dark pane brings the descriptions back without duplicate rows.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r06-description-expanded-again-dark-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-expanded-again", locks: "Expanding Description again in a wide dark pane brings the descriptions back without duplicate rows.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r07-description-expanded-dark-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-expanded-narrow", locks: "Expanded Description in a narrow dark pane shows every field description inside the frame.", clip: "preview" },
  { id: "frontmatter-schema/r08-description-expanded-dark-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-dark-expanded", locks: "Expanded Description in a wide dark pane shows every field description and the full header.", clip: "preview" },
  { id: "frontmatter-schema/r09-description-collapsed-after-refresh-white-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-collapsed-after-refresh-narrow", locks: "The collapsed Description state survives a refresh in a narrow white pane.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r10-description-collapsed-after-refresh-white-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-collapsed-after-refresh", locks: "The collapsed Description state survives a refresh in a wide white pane.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r11-description-collapsed-white-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-collapsed-narrow", locks: "Collapsing Description in a narrow white pane leaves Name and Value readable.", clip: "preview" },
  { id: "frontmatter-schema/r12-description-collapsed-white-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-collapsed", locks: "Collapsing Description in a wide white pane leaves Name and Value readable.", clip: "preview" },
  { id: "frontmatter-schema/r13-description-expanded-again-white-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-expanded-again-narrow", locks: "Expanding Description again in a narrow white pane brings the descriptions back without duplicate rows.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r14-description-expanded-again-white-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-expanded-again", locks: "Expanding Description again in a wide white pane brings the descriptions back without duplicate rows.", capture: false, clip: "preview" },
  { id: "frontmatter-schema/r15-description-expanded-white-narrow", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-expanded-narrow", locks: "Expanded Description in a narrow white pane shows every field description inside the frame.", clip: "preview" },
  { id: "frontmatter-schema/r16-description-expanded-white-wide", group: "frontmatter-schema", suite: "frontmatter", legacy: "description-white-expanded", locks: "Expanded Description in a wide white pane shows every field description and the full header.", clip: "preview" },
  { id: "frontmatter-schema/r17-links-hover-dark", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-dark-hover", locks: "Hovering a link on a dark preview shows its description tooltip inside the viewport.", clip: "preview" },
  { id: "frontmatter-schema/r18-links-long-ellipsis-dark", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-dark-long-ellipsis", locks: "A long link target is cut with an ellipsis on a dark preview.", clip: "preview" },
  { id: "frontmatter-schema/r19-links-original-dark", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-dark-original", locks: "Links on a dark preview show the original target title, excerpt and line badges.", clip: "preview" },
  { id: "frontmatter-schema/r20-links-saved-target-dark", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-dark-saved-target", locks: "After the target is saved, the dark preview shows the updated title and excerpt.", clip: "element" },
  { id: "frontmatter-schema/r21-links-marker-removed", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-marker-removed", locks: "A link whose marker was removed stays valid and shows no line badge.", clip: "preview" },
  { id: "frontmatter-schema/r22-links-hover-white", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-white-hover", locks: "Hovering a link on a white preview shows its description tooltip inside the viewport.", clip: "preview" },
  { id: "frontmatter-schema/r23-links-long-ellipsis-white", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-white-long-ellipsis", locks: "A long link target is cut with an ellipsis on a white preview.", clip: "preview" },
  { id: "frontmatter-schema/r24-links-original-white", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-white-original", locks: "Links on a white preview show the original target title, excerpt and line badges.", clip: "preview" },
  { id: "frontmatter-schema/r25-links-saved-target-white", group: "frontmatter-schema", suite: "frontmatter", legacy: "links-white-saved-target", locks: "After the target is saved, the white preview shows the updated title and excerpt.", clip: "element" },
  { id: "frontmatter-schema/r26-marker-navigation-destination", group: "frontmatter-schema", suite: "frontmatter", legacy: "marker-navigation-destination", locks: "Clicking an implementation link opens the source file at the marker line.", clip: "window" },
  { id: "theme-zoom/r01-host-dark-mode-cream", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-dark-cream", locks: "A dark VS Code theme with the preview forced to cream keeps the toolbar readable.", clip: "window" },
  { id: "theme-zoom/r02-host-dark-mode-current", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-dark-current", locks: "A dark VS Code theme with the preview following the host keeps the toolbar readable.", clip: "window" },
  { id: "theme-zoom/r03-host-dark-mode-dark", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-dark-dark", locks: "A dark VS Code theme with the preview forced to dark keeps the toolbar readable.", capture: false, clip: "window" },
  { id: "theme-zoom/r04-host-dark-mode-white", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-dark-white", locks: "A dark VS Code theme with the preview forced to white keeps the toolbar readable.", clip: "window" },
  { id: "theme-zoom/r05-host-light-mode-cream", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-light-cream", locks: "A light VS Code theme with the preview forced to cream keeps the toolbar readable.", clip: "window" },
  { id: "theme-zoom/r06-host-light-mode-current", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-light-current", locks: "A light VS Code theme with the preview following the host keeps the toolbar readable.", clip: "window" },
  { id: "theme-zoom/r07-host-light-mode-dark", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-light-dark", locks: "A light VS Code theme with the preview forced to dark keeps the toolbar readable.", clip: "window" },
  { id: "theme-zoom/r08-host-light-mode-white", group: "theme-zoom", suite: "real-input", legacy: "38-toolbar-light-white", locks: "A light VS Code theme with the preview forced to white keeps the toolbar readable.", clip: "window" },
  { id: "toolbar-navigation/r01-title-bar-button", group: "toolbar-navigation", suite: "real-input", legacy: "36-title-bar-button", locks: "The Open Preview to the Side button sits in the editor title bar of a Markdown file.", clip: "window", readme: [{ file: "open-preview-to-side.png", crop: [40, 35, 1390, 430], width: 760 }] },
  { id: "toolbar-navigation/r02-anchor-disabled-open-with", group: "toolbar-navigation", suite: "real-input", legacy: "38-anchor-disabled", locks: "The anchor (sync) button is disabled in the Open With editor.", clip: "window" },
  { id: "toolbar-navigation/r03-anchor-enabled-with-editor", group: "toolbar-navigation", suite: "real-input", legacy: "38-anchor-enabled", locks: "The anchor (sync) button is enabled when a source editor is beside the preview.", clip: "window" },
  { id: "toolbar-navigation/r04-quick-open-beside-preview", group: "toolbar-navigation", suite: "real-input", legacy: "39-quick-open-beside-preview", locks: "Quick Open lists the Studio command and the preview opens beside the editor.", clip: "window", readme: [{ file: "preview-beside-editor.png", crop: [45, 35, 1395, 420], width: 760 }] },
  { id: "block-editing/r01-paragraph-blur-commit", group: "block-editing", suite: "real-input", legacy: "01-paragraph-blur-commit", locks: "Leaving a paragraph editor commits the edit to the document buffer.", clip: "window", curated: "01-paragraph-blur-commit.png" },
  { id: "block-editing/r02-mod-enter-commit", group: "block-editing", suite: "real-input", legacy: "02-ctrl-enter-commit", locks: "Mod+Enter commits a block edit and closes the editor.", clip: "window" },
  { id: "block-editing/r03-arrow-down-into-table", group: "block-editing", suite: "real-input", legacy: "03-arrow-navigation", locks: "ArrowDown at the end of a block moves the editor into the next table.", clip: "window" },
  { id: "block-editing/r04-arrow-up-into-image", group: "block-editing", suite: "real-input", legacy: "07-image-editing", locks: "ArrowUp at the start of a block moves the editor into the image above.", clip: "window" },
  { id: "block-editing/r05-escape-cancels-block", group: "block-editing", suite: "real-input", legacy: "13-escape-cancels-block", locks: "Escape closes a block editor and keeps the original text.", capture: false, clip: "window" },
  { id: "block-editing/r06-typing-one-undo-step", group: "block-editing", suite: "real-input", legacy: "15-typing-undo-grouping", locks: "Typing in a block is one undo step and the undo restores the text.", capture: false, clip: "window" },
  { id: "block-editing/r07-undo-stays-in-editor-open-with", group: "block-editing", suite: "real-input", legacy: "16-undo-stays-open-with", locks: "Undo in the Open With editor keeps the block editor open.", capture: false, clip: "window" },
  { id: "block-editing/r08-undo-stays-in-editor", group: "block-editing", suite: "real-input", legacy: "16-undo-stays-side", locks: "Undo in the side preview keeps the block editor open.", clip: "window" },
  { id: "block-editing/r09-enter-continues-list", group: "block-editing", suite: "real-input", legacy: "17-enter-continues-list", locks: "Enter at the end of a list item starts the next item.", clip: "window" },
  { id: "block-editing/r10-tab-indents", group: "block-editing", suite: "real-input", legacy: "18-tab-indents", locks: "Tab in a list item indents it one level.", clip: "window" },
  { id: "block-editing/r11-caret-at-click", group: "block-editing", suite: "real-input", legacy: "20-caret-at-click", locks: "The caret lands where the block was clicked.", clip: "window" },
  { id: "block-editing/r12-edit-hover", group: "block-editing", suite: "real-input", legacy: "21-edit-hover", locks: "Hovering a block in edit mode outlines the block that would be edited.", clip: "window", curated: "21-edit-hover.png" },
  { id: "block-editing/r13-editor-frame-and-buttons", group: "block-editing", suite: "real-input", legacy: "22-editor-frame-and-buttons", locks: "An open block editor shows its frame, palette and action buttons.", clip: "window", readme: [{ file: "inline-editing.png", crop: [700, 40, 1390, 470], width: 720 }] },
  { id: "block-editing/r14-edit-mode-no-reflow", group: "block-editing", suite: "real-input", legacy: "23-edit-mode-no-reflow", locks: "Turning edit mode on does not move the text.", clip: "window" },
  { id: "block-editing/r15-start-writing-open", group: "block-editing", suite: "real-input", legacy: "24-start-writing-open", locks: "The Start writing prompt opens an editor on an empty document.", clip: "window" },
  { id: "block-editing/r16-insert-point-adds-block", group: "block-editing", suite: "real-input", legacy: "25-block-inserted", locks: "An insert point adds a new block at its position.", clip: "window" },
  { id: "block-editing/r17-insert-after-final-figure", group: "block-editing", suite: "real-input", legacy: "25b-insert-after-figure-with-newline", locks: "Inserting after the final figure adds the block after it with a line break.", clip: "window" },
  { id: "block-editing/r18-insert-after-final-figure-no-eol", group: "block-editing", suite: "real-input", legacy: "25b-insert-after-figure-without-newline", locks: "Inserting after a final figure with no end-of-file newline still adds a separate block.", capture: false, clip: "window" },
  { id: "block-editing/r19-save-keeps-list-in-place", group: "block-editing", suite: "real-input", legacy: "32-save-keeps-list-in-place", locks: "Saving a list edit keeps the list where it was in the page.", clip: "window" },
  { id: "block-editing/r20-shift-click-selects-blocks", group: "block-editing", suite: "real-input", legacy: "block-selection-01-shift-click", locks: "Shift-click selects a range of blocks.", clip: "window" },
  { id: "block-editing/r21-alt-down-moves-block", group: "block-editing", suite: "real-input", legacy: "move-keys-01-alt-down", locks: "Alt+Down moves the selected block one step down.", clip: "window" },
  { id: "block-editing/r22-move-chord-keeps-editor", group: "block-editing", suite: "real-input", legacy: "move-keys-02-chord", locks: "The move chord keeps the block editor open and the caret in place.", clip: "window" },
  { id: "block-editing/r23-alt-arrows-move-selection", group: "block-editing", suite: "real-input", legacy: "move-selection-01-alt-arrows", locks: "Alt+Arrow moves a multi-block selection.", clip: "window" },
  { id: "block-editing/r24-flush-before-tab-switch", group: "block-editing", suite: "real-input", legacy: "40-flush-before-tab-switch", locks: "An edit typed just before an editor tab switch is flushed to the source and shown in the preview.", clip: "window" },
  { id: "palette-slash/r01-slash-no-command", group: "palette-slash", suite: "real-input", legacy: "p11-slash-no-command", locks: "A slash with no matching command shows the empty state.", clip: "window" },
  { id: "palette-slash/r02-slash-open", group: "palette-slash", suite: "real-input", legacy: "p11-slash-open", locks: "Typing a slash opens the command menu.", clip: "window" },
  { id: "palette-slash/r03-shortcuts-bold-todo", group: "palette-slash", suite: "real-input", legacy: "t20-shortcuts", locks: "Bold and TODO shortcuts wrap the selection in the editor.", clip: "window" },
  { id: "palette-slash/r04-palette-bold-heading", group: "palette-slash", suite: "real-input", legacy: "t21-palette", locks: "The palette applies bold and heading, with its language list open.", clip: "window" },
  { id: "palette-slash/r05-link-panel", group: "palette-slash", suite: "real-input", legacy: "t22-link-panel", locks: "The link button opens the link panel with its fields.", clip: "window" },
  { id: "palette-slash/r06-alert-dropdown", group: "palette-slash", suite: "real-input", legacy: "t25-alert-dropdown", locks: "The alert dropdown lists the alert kinds.", clip: "window" },
  { id: "palette-slash/r07-figure-editor-form", group: "palette-slash", suite: "real-input", legacy: "t32-figure-editor", locks: "The figure editor shows its form fields.", clip: "window" },
  { id: "palette-slash/r08-link-panel-prefilled", group: "palette-slash", suite: "real-input", legacy: "cr035-link-panel-prefilled", locks: "The link panel opens pre-filled with the text and the URL when the caret is inside an existing link.", clip: "window" },
  { id: "palette-slash/r09-image-paste-inserted", group: "palette-slash", suite: "real-input", legacy: "t2-image-paste", locks: "A PNG pasted into a block editor is saved next to the document and committed as a paragraph of its own that shows the image.", clip: "window" },
  { id: "table-editing/r01-cell-enter-saves", group: "table-editing", suite: "real-input", legacy: "04-table-cell-enter", locks: "Enter in a table cell saves the cell.", clip: "window" },
  { id: "table-editing/r02-padded-table-minimal-diff", group: "table-editing", suite: "real-input", legacy: "06-table-padded-edit", locks: "Editing a padded table changes only the edited cell in the source.", clip: "window" },
  { id: "table-editing/r03-compact-table-minimal-diff", group: "table-editing", suite: "real-input", legacy: "07-table-compact-edit", locks: "Editing a compact table changes only the edited cell in the source.", capture: false, clip: "window" },
  { id: "table-editing/r04-escape-cancels-cell", group: "table-editing", suite: "real-input", legacy: "14-escape-cancels-table-cell", locks: "Escape closes a cell editor and keeps the original cell.", capture: false, clip: "window" },
  { id: "table-editing/r05-tab-adds-row", group: "table-editing", suite: "real-input", legacy: "24-table-tab", locks: "Tab in the last cell adds a row.", clip: "window" },
  { id: "table-editing/r06-cell-bar-in-flow", group: "table-editing", suite: "real-input", legacy: "25-table-toolbar", locks: "The cell toolbar sits in the page flow and does not cover the table.", clip: "window" },
  { id: "table-editing/r07-save-keeps-table-in-place", group: "table-editing", suite: "real-input", legacy: "33-save-keeps-table-in-place", locks: "Saving a table edit keeps the table where it was in the page.", clip: "window" },
  { id: "table-editing/r08-cell-bold-shortcut", group: "table-editing", suite: "real-input", legacy: "t35-table-cell-bold", locks: "The bold shortcut in a cell wraps the selection in the cell.", clip: "window" },
  { id: "review-annotations/r01-comment-block-opens-editor", group: "review-annotations", suite: "real-input", legacy: "comment-block-edit", locks: "A block holding a comment opens its editor with the comment text intact.", clip: "window" },
  { id: "review-annotations/r02-review-thread-popover", group: "review-annotations", suite: "real-input", legacy: "comments-01-popover", locks: "A review thread chip opens its popover in edit mode.", clip: "window" },
  { id: "review-annotations/r03-incoming-change-bars", group: "review-annotations", suite: "real-input", legacy: "t2-incoming-changes", locks: "Blocks whose source lines differ from Git HEAD carry a green change bar.", clip: "window" },
  { id: "review-annotations/r04-thread-created", group: "review-annotations", suite: "real-input", legacy: "t2-thread-created", locks: "Selecting text and saving the Comment box writes a thread to the sidecar and highlights the quote.", clip: "window" },
  { id: "review-annotations/r05-thread-reply", group: "review-annotations", suite: "real-input", legacy: "t2-thread-reply", locks: "A reply sent from the thread popover is saved and listed after the first comment.", clip: "window" },
  { id: "review-annotations/r06-thread-resolved", group: "review-annotations", suite: "real-input", legacy: "t2-thread-resolved", locks: "Resolve marks the thread resolved in the popover and in the sidecar.", clip: "window" },
  { id: "review-annotations/r07-side-by-side-diff", group: "review-annotations", suite: "real-input", legacy: "cr147-side-by-side-diff", locks: "The Side-by-side button turns the blocks changed since the last commit into cards with the block at HEAD on the left and the current block on the right.", clip: "window" },
  { id: "lifecycle-sync/r01-open-with-editor", group: "lifecycle-sync", suite: "real-input", legacy: "05-open-with-editor", locks: "Open With opens the Studio editor with the rendered document.", clip: "window", readme: [{ file: "open-with-editor.png", crop: [250, 55, 1400, 470], width: 760 }] },
  { id: "lifecycle-sync/r02-preview-keeps-markdown", group: "lifecycle-sync", suite: "real-input", legacy: "19-preview-keeps-markdown", locks: "The preview keeps the Markdown source editor open beside it.", clip: "window" },
  { id: "lifecycle-sync/r03-focus-change-keeps-scroll", group: "lifecycle-sync", suite: "real-input", legacy: "26-focus-change-still", locks: "Changing focus between editors keeps the preview scroll.", clip: "window" },
  { id: "lifecycle-sync/r04-hidden-preview-catches-up", group: "lifecycle-sync", suite: "real-input", legacy: "27-hidden-preview-catches-up", locks: "A hidden preview shows the latest text when it is revealed.", clip: "window" },
  { id: "lifecycle-sync/r05-linked-file-patched-in-place", group: "lifecycle-sync", suite: "real-input", legacy: "30-properties-in-place", locks: "A change to a linked file patches the properties in place.", clip: "window" },
  { id: "lifecycle-sync/r06-content-patched-in-place", group: "lifecycle-sync", suite: "real-input", legacy: "34-content-patched", locks: "A source edit patches the changed block in place.", clip: "window" },
  { id: "lifecycle-sync/r07-status-page-missing-source", group: "lifecycle-sync", suite: "real-input", legacy: "35-status-two-lines", locks: "A preview whose source is missing shows the two-line status page.", clip: "window" },
  { id: "lifecycle-sync/r08-edit-mode-remembered", group: "lifecycle-sync", suite: "real-input", legacy: "38-edit-mode-remembered", locks: "Edit mode is restored when a preview is reopened.", clip: "window", readme: [{ file: "myst-admonitions.png", crop: [790, 70, 1388, 470], width: 720 }, { file: "myst-diagrams-and-figure.png", crop: [790, 460, 1315, 860], width: 720 }], curated: "38-edit-mode-remembered.png" },
  { id: "lifecycle-sync/r09-pending-overlay", group: "lifecycle-sync", suite: "real-input", legacy: "43-pending-overlay", locks: "A slow render shows the pending overlay over the old page.", clip: "window" },
  { id: "lifecycle-sync/r10-scroll-solo-bottom", group: "lifecycle-sync", suite: "scroll", legacy: "solo-bottom", locks: "A solo preview scrolled to the end shows the final sentinel.", clip: "window" },
  { id: "lifecycle-sync/r11-scroll-return-top", group: "lifecycle-sync", suite: "scroll", legacy: "return-top", locks: "Scrolling back to the top clears the sticky headings and shows the first editor.", clip: "window" },
  { id: "lifecycle-sync/r12-scroll-paired-bottom", group: "lifecycle-sync", suite: "scroll", legacy: "paired-aligned-bottom", locks: "A paired preview and source scroll to the end together.", clip: "window" },
  { id: "lifecycle-sync/r13-scroll-preview-independent", group: "lifecycle-sync", suite: "scroll", legacy: "preview-independent-bottom", locks: "With sync off the preview scrolls while the source stays at the top.", clip: "window" },
  { id: "lifecycle-sync/r14-scroll-source-independent", group: "lifecycle-sync", suite: "scroll", legacy: "source-independent-bottom", locks: "With sync off the source scrolls while the preview stays at the top.", clip: "window" },
  { id: "lifecycle-sync/r15-scroll-keyboard-return", group: "lifecycle-sync", suite: "scroll", legacy: "keyboard-return", locks: "Keyboard navigation between blocks returns to the first block editor.", clip: "window" },
  { id: "lifecycle-sync/r16-before-window-reload", group: "lifecycle-sync", suite: "reload", legacy: "01-before-window-reload", locks: "Collapsed Description and zoom 130 % are set before the window reload.", clip: "window" },
  { id: "lifecycle-sync/r17-after-window-reload", group: "lifecycle-sync", suite: "reload", legacy: "02-after-window-reload", locks: "Collapsed Description and zoom 130 % survive Developer: Reload Window.", clip: "window" },
  { id: "lifecycle-sync/r18-after-close-reopen", group: "lifecycle-sync", suite: "reload", legacy: "03-after-close-reopen", locks: "A closed and reopened preview keeps the collapsed Description state.", clip: "window" },
  { id: "trust-security/r01-untrusted-read-only", group: "trust-security", suite: "untrusted", legacy: "untrusted-read-only", locks: "In Restricted Mode the side preview is read-only: the Edit button is greyed with its reason and no edit affordance works.", clip: "window" },
];

const ID_PATTERN = /^([a-z0-9-]+)\/r(\d{2,})-([a-z0-9]+(?:-[a-z0-9]+)*)$/u;

export interface ParsedCaptureId {
  readonly group: string;
  readonly number: number;
  readonly slug: string;
}

export function parseCaptureId(id: string): ParsedCaptureId | undefined {
  const match = ID_PATTERN.exec(id);
  if (match === null) return undefined;
  return { group: match[1]!, number: Number(match[2]), slug: match[3]! };
}

/** Problems of a registry: malformed or duplicated ids, unknown groups, number gaps, empty locks. */
export function validateRegistry(entries: readonly CaptureEntry[] = CAPTURES): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const legacy = new Set<string>();
  const numbers = new Map<string, number[]>();
  for (const entry of entries) {
    const parsed = parseCaptureId(entry.id);
    if (parsed === undefined) {
      problems.push(`${entry.id}: not <group>/rNN-<slug>`);
      continue;
    }
    if (parsed.group !== entry.group) problems.push(`${entry.id}: id group differs from group ${entry.group}`);
    if (!isGroupId(entry.group)) problems.push(`${entry.id}: unknown group ${entry.group}`);
    if (ids.has(entry.id)) problems.push(`${entry.id}: duplicate id`);
    ids.add(entry.id);
    const legacyKey = `${entry.suite}/${entry.legacy}`;
    if (legacy.has(legacyKey)) problems.push(`${entry.id}: duplicate legacy name ${legacyKey}`);
    legacy.add(legacyKey);
    if (entry.locks.trim() === "") problems.push(`${entry.id}: empty locks`);
    if (entry.readme !== undefined && entry.capture === false) problems.push(`${entry.id}: a README source must write a PNG`);
    if (entry.curated !== undefined && entry.capture === false) problems.push(`${entry.id}: a curated image must write a PNG`);
    const list = numbers.get(entry.group) ?? [];
    list.push(parsed.number);
    numbers.set(entry.group, list);
  }
  for (const [group, list] of numbers) {
    const sorted = [...list].sort((a, b) => a - b);
    sorted.forEach((value, index) => {
      if (value !== index + 1) problems.push(`${group}: numbers are not 1..${sorted.length} without a gap (found r${String(value).padStart(2, "0")})`);
    });
  }
  return problems;
}

export function captureById(id: string, entries: readonly CaptureEntry[] = CAPTURES): CaptureEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

/** The entry of a pre-registry name, for helpers that still build the former file stem. */
export function captureByLegacy(
  suite: CaptureSuite,
  legacy: string,
  entries: readonly CaptureEntry[] = CAPTURES,
): CaptureEntry | undefined {
  return entries.find((entry) => entry.suite === suite && entry.legacy === legacy);
}

export function capturesOfSuite(suite: CaptureSuite, entries: readonly CaptureEntry[] = CAPTURES): CaptureEntry[] {
  return entries.filter((entry) => entry.suite === suite);
}

/** Path of a capture file relative to its run folder: `<group>/rNN-<slug>.<extension>`. */
export function captureFile(id: string, extension: "png" | "md" | "json"): string {
  return `${id}.${extension}`;
}

/**
 * Registered captures of `suite` that were expected but not taken. Assertion-only entries
 * (`capture: false`) are never expected; they are recorded when taken but not required.
 */
export function missingCaptures(
  suite: CaptureSuite,
  taken: Iterable<string>,
  entries: readonly CaptureEntry[] = CAPTURES,
): string[] {
  const done = new Set(taken);
  return capturesOfSuite(suite, entries)
    .filter((entry) => entry.capture !== false && !done.has(entry.id))
    .map((entry) => entry.id);
}

/** Ids of `taken` that no entry registers. */
export function unknownCaptures(taken: Iterable<string>, entries: readonly CaptureEntry[] = CAPTURES): string[] {
  const known = new Set(entries.map((entry) => entry.id));
  return [...taken].filter((id) => !known.has(id));
}

/** Plain JSON for the Python scripts (README images) and the gallery. */
export function capturesJson(entries: readonly CaptureEntry[] = CAPTURES): readonly CaptureEntry[] {
  return entries;
}
