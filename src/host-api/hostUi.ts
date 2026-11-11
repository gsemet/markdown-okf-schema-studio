/**
 * The `HostUi` port: what the host shows outside the preview page (notifications, the file
 * picker, the problems view) and its clipboard.
 */

/** Options of the file picker. */
export interface PickFileOptions {
  /** The folder the picker opens in (a file system path). */
  defaultDirectory: string;
  /** Named groups of file extensions without the dot, e.g. `{ Markdown: ["md", "markdown"] }`. */
  filters: Record<string, string[]>;
  /** Label of the button that confirms the pick. */
  openLabel: string;
}

/** A file the user picked. */
export interface PickedFile {
  /** Its file system path. */
  path: string;
  /** False when the pick is not a local file (a virtual or remote resource). */
  local: boolean;
}

/** Options of the save dialog. */
export interface SaveFileOptions {
  /** The file the dialog proposes (a file system path: folder and name). */
  defaultPath: string;
  /** Named groups of file extensions without the dot, e.g. `{ HTML: ["html"] }`. */
  filters: Record<string, string[]>;
  /** Label of the button that confirms the save. */
  saveLabel: string;
}

/** Options of the modal confirmation. */
export interface ConfirmOptions {
  /** The question. */
  message: string;
  /** More text under the question (a list of what is affected). */
  detail?: string;
  /** Label of the button that confirms; the dialog also offers Cancel. */
  confirmLabel: string;
}

/** The host's own user interface. */
export interface HostUi {
  /** Shows an information notification. */
  showInformation(message: string): PromiseLike<unknown>;
  /** Shows a warning notification. */
  showWarning(message: string): PromiseLike<unknown>;
  /** Shows an error notification. */
  showError(message: string): PromiseLike<unknown>;
  /** Lets the user pick one file; undefined when the picker was cancelled. */
  pickFile(options: PickFileOptions): PromiseLike<PickedFile | undefined>;
  /** Lets the user choose where to save a file; the chosen path, or undefined when the dialog was cancelled. */
  pickSaveFile(options: SaveFileOptions): PromiseLike<string | undefined>;
  /** Asks a modal question; true only when the user pressed the confirm button. */
  confirm(options: ConfirmOptions): PromiseLike<boolean>;
  /** Shows the host's list of problems (diagnostics). */
  showProblems(): PromiseLike<void>;
  /**
   * Tells the host whether a preview text box is being edited in the focused preview, so its key
   * bindings for undo, redo, select all and delete line apply (VS Code: a `when` context).
   */
  setPreviewEditing(editing: boolean): void;
  /** The text on the clipboard. */
  readClipboard(): PromiseLike<string>;
  /** Puts `text` on the clipboard. */
  writeClipboard(text: string): PromiseLike<void>;
}
