/**
 * The jumps of the text editors: the only reader of the selection change event for jumps. It builds
 * the facts of each change (its kind, the target file or diff side, whether Studio itself asked for
 * the selection), asks the pure rules (`core/navigation/jumpSignal.ts`) and fires `onJump` with the
 * real file's URI and 1-based line. The side preview marker reads it.
 *
 * A diff side is read as the side preview reads a diff: `realSideOfDiff`, never the stand-in file.
 * The side is the one that got the selection (the event's own editor), not the active editor.
 */

import * as vscode from "vscode";

import {
  jumpVerdict,
  type JumpTarget,
  type SelectionChangeKind,
  type SelectionFacts,
} from "../core/navigation/jumpSignal";
import { activeDiffInput, isDiffSide, isEligibleUri, realSideOfDiff } from "./diffRealFile";
import type { StudioSelections } from "./studioSelections";

/** A jump into a Markdown file: the real file, the 1-based line, and when it was seen. */
export interface EditorJump {
  readonly uri: vscode.Uri;
  readonly line: number;
  readonly at: number;
}

/** What the integration tests record of each selection change (see `testHooks.ts`). */
export interface SelectionRecord {
  readonly at: number;
  readonly uri: string;
  readonly kind: SelectionChangeKind;
  readonly selections: number;
  readonly firstLine: number;
  readonly target: JumpTarget["kind"];
  readonly matchedStudioSelection: boolean;
  /** The jump `onJump` fired for this change, when it did. */
  readonly jump?: { readonly uri: string; readonly line: number };
}

/** The jump source of an activation. */
export interface EditorJumps extends vscode.Disposable {
  readonly onJump: vscode.Event<EditorJump>;
  /** Sets the recorder the integration tests use (`undefined` stops it). */
  recordForTests(recorder: ((record: SelectionRecord) => void) | undefined): void;
}

function kindOf(kind: vscode.TextEditorSelectionChangeKind | undefined): SelectionChangeKind {
  switch (kind) {
    case vscode.TextEditorSelectionChangeKind.Keyboard: return "keyboard";
    case vscode.TextEditorSelectionChangeKind.Mouse: return "mouse";
    case vscode.TextEditorSelectionChangeKind.Command: return "command";
    default: return "none";
  }
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-186
/** Starts listening to the selection changes; the disposable stops it. */
export function startEditorJumps(deps: { readonly selections: StudioSelections }): EditorJumps {
  const emitter = new vscode.EventEmitter<EditorJump>();
  let recorder: ((record: SelectionRecord) => void) | undefined;

  const listener = vscode.window.onDidChangeTextEditorSelection((event) => {
    const uri = event.textEditor.document.uri;
    const first = event.selections[0];
    const firstLine = first?.start.line ?? 0;
    // The diff the active tab shows, when this editor is one of its sides.
    const diff = activeDiffInput();
    let target: JumpTarget = { kind: "other" };
    let realUri: vscode.Uri | undefined;
    if (diff && isDiffSide(diff, uri)) {
      realUri = realSideOfDiff(diff, uri);
      target = {
        kind: "diff-side",
        realFileEligible: realUri !== undefined,
        onRealSide: realUri?.toString() === uri.toString(),
      };
    } else if (uri.scheme === "file") {
      realUri = uri;
      target = { kind: "file", eligible: isEligibleUri(uri) };
    }
    const changeKind = kindOf(event.kind);
    // Studio's own selection is looked up only for the kind that could be a jump, so the entry is not used up by another event.
    const considered = changeKind === "command" && event.selections.length === 1;
    const matchedStudioSelection = considered
      && deps.selections.take(uri.toString(), firstLine) !== undefined;
    const facts: SelectionFacts = {
      changeKind,
      selectionCount: event.selections.length,
      firstLine,
      target,
      matchedStudioSelection,
    };
    const verdict = jumpVerdict(facts);
    const jumpUri = verdict.jump && realUri ? realUri : undefined;
    recorder?.({
      at: Date.now(),
      uri: uri.toString(),
      kind: changeKind,
      selections: event.selections.length,
      firstLine,
      target: target.kind,
      matchedStudioSelection,
      ...(verdict.jump && jumpUri ? { jump: { uri: jumpUri.toString(), line: verdict.line } } : {}),
    });
    if (verdict.jump && jumpUri) emitter.fire({ uri: jumpUri, line: verdict.line, at: Date.now() });
  });

  return {
    onJump: emitter.event,
    recordForTests: (next) => { recorder = next; },
    dispose: () => {
      listener.dispose();
      emitter.dispose();
    },
  };
}
