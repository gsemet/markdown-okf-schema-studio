/**
 * Keystrokes of the writer in a text editor, as far as VS Code shows them (CR 139). VS Code has no
 * keystroke event; a selection change whose kind is the keyboard is the closest signal, and the
 * cursor moves with every typed character, backspace and paste.
 */

import * as vscode from "vscode";

let lastKeystroke: number | undefined;

// @implements_req SwRS-MDOKFSTUDIO-LIFE-094
/**
 * Starts noting keystrokes: a selection change made by the keyboard (typing, cursor keys) is one.
 * Backspace, Delete and a paste report no kind, so they count only after another key. It posts
 * nothing and keeps one timestamp.
 */
export function startKeystrokeTracking(): vscode.Disposable {
  return vscode.window.onDidChangeTextEditorSelection((event) => {
    if (event.kind === vscode.TextEditorSelectionChangeKind.Keyboard) noteKeystrokeForTests();
  });
}

/** Notes a keystroke now. The integration tests call it: `executeCommand("type")` reports no key. */
export function noteKeystrokeForTests(): void {
  lastKeystroke = Date.now();
}

/** When the last keystroke was seen, in milliseconds since the epoch. */
export function lastKeystrokeAt(): number | undefined {
  return lastKeystroke;
}
