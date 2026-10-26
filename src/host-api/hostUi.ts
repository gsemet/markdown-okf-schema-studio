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
