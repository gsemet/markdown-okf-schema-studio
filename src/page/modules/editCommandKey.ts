import type { PreviewEditCommandName } from "../../core/protocol/hostToPage";

/** The parts of a keydown event the edit-command test reads. */
export interface EditCommandKeyEvent {
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-003
/**
 * The editing command whose VS Code default key `event` is: undo (Cmd/Ctrl+Z), redo (Cmd+Shift+Z
 * on macOS, Ctrl+Shift+Z or Ctrl+Y elsewhere), select all (Cmd/Ctrl+A) and delete line
 * (Cmd/Ctrl+Shift+K). The primary key is Cmd on macOS and Ctrl elsewhere. `undefined` for any other
 * key and during an IME composition. The page does not run the command itself: VS Code runs the
 * key binding the writer set, which may differ from these defaults, and sends the command back.
 */
export function editCommandOfKey(event: EditCommandKeyEvent, mac: boolean): PreviewEditCommandName | undefined {
  if (event.isComposing || event.altKey) return undefined;
  const primary = mac ? event.metaKey === true && !event.ctrlKey : event.ctrlKey === true && !event.metaKey;
  if (!primary) return undefined;
  const key = String(event.key || "").toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !mac && !event.shiftKey) return "redo";
  if (key === "a" && !event.shiftKey) return "selectAll";
  if (key === "k" && event.shiftKey) return "deleteLine";
  return undefined;
}
