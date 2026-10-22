/** Commands that focus the editor group at a given position (the first group is column 1). */
export const FOCUS_GROUP_COMMANDS = [
  "workbench.action.focusFirstEditorGroup",
  "workbench.action.focusSecondEditorGroup",
  "workbench.action.focusThirdEditorGroup",
  "workbench.action.focusFourthEditorGroup",
  "workbench.action.focusFifthEditorGroup",
  "workbench.action.focusSixthEditorGroup",
  "workbench.action.focusSeventhEditorGroup",
  "workbench.action.focusEighthEditorGroup",
];

/**
 * The command that focuses the group at `column`, or undefined when no such group exists now.
 * VS Code creates a new empty group when one of these commands names a position past the last
 * group, so a column read from a snapshot taken before a group closed must never reach it.
 */
export function focusGroupCommand(column: number | undefined, groupCount: number): string | undefined {
  if (column === undefined || !Number.isInteger(column) || column < 1 || column > groupCount) return undefined;
  return FOCUS_GROUP_COMMANDS[column - 1];
}
