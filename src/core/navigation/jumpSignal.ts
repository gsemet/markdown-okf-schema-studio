/**
 * The jump signal, pure: whether a selection change of a Markdown text editor is a jump (a search
 * result, Quick Open `file.md:42`, a problem, a link, Go to Line) or a cursor move of the reader
 * (arrow keys, a click, typing). The host (`host-vscode/editorJumps.ts`) gathers the facts from the
 * VS Code selection event and asks here; no host API.
 */

/** The kind of a selection change, as the host reads it from VS Code (`none`: no kind reported). */
export type SelectionChangeKind = "keyboard" | "mouse" | "command" | "none";

/**
 * Where the selection landed: a saved Markdown file (`eligible` says whether it is one), a side of
 * a text diff with the real file the side preview shows (`realFileEligible`, and whether the
 * selection is on that real file's side), or anything else.
 */
export type JumpTarget =
  | { readonly kind: "file"; readonly eligible: boolean }
  | { readonly kind: "diff-side"; readonly realFileEligible: boolean; readonly onRealSide: boolean }
  | { readonly kind: "other" };

/** The facts of one selection change. */
export interface SelectionFacts {
  readonly changeKind: SelectionChangeKind;
  readonly selectionCount: number;
  /** The first selection's 0-based start line. */
  readonly firstLine: number;
  readonly target: JumpTarget;
  /** True when the change matched a selection Studio itself asked for (`StudioSelections`). */
  readonly matchedStudioSelection: boolean;
}

/** Not a jump, or a jump to a 1-based line of the target's real file. */
export type JumpVerdict = { readonly jump: false } | { readonly jump: true; readonly line: number };

const NO_JUMP: JumpVerdict = { jump: false };

// @implements_req SwRS-MDOKFSTUDIO-LIFE-186
// @implements_req SwRS-MDOKFSTUDIO-LIFE-190
/**
 * Every change of kind `command` with one selection is a jump, except one Studio expected. A cursor
 * move by keyboard or mouse, and a change of no kind (a restored view state, undo, an edit's side
 * effect), never is. The line is the first selection's start line, 1-based; in a diff the same
 * line number serves whichever side holds the selection.
 */
export function jumpVerdict(facts: SelectionFacts): JumpVerdict {
  if (facts.changeKind !== "command" || facts.selectionCount !== 1) return NO_JUMP;
  if (facts.matchedStudioSelection) return NO_JUMP;
  if (!Number.isSafeInteger(facts.firstLine) || facts.firstLine < 0) return NO_JUMP;
  const { target } = facts;
  const eligible = target.kind === "file" ? target.eligible : target.kind === "diff-side" && target.realFileEligible;
  return eligible ? { jump: true, line: facts.firstLine + 1 } : NO_JUMP;
}
