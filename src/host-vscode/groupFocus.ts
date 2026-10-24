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

/** One workbench focus command run by this extension on its own, with its wall-clock time. */
export interface GroupFocusMove {
  at: number;
  command: string;
}

/**
 * Tracks background work that moves the workbench focus (the group unlock after a preview
 * closes): which runs are still pending, and the last focus commands they ran. Tests wait for
 * `settled()` before they open the next preview, so a closed preview can no longer take the focus
 * from it, and a failure lists `moves()` next to the page's own focus trace.
 */
export function createFocusWorkTracker(limit: number, now: () => number): {
  track(work: Promise<void>): void;
  pending(): number;
  settled(): Promise<void>;
  record(command: string): void;
  moves(since?: number): GroupFocusMove[];
} {
  const running = new Set<Promise<void>>();
  const log: GroupFocusMove[] = [];
  return {
    track(work: Promise<void>): void {
      const tracked = work.catch(() => undefined);
      running.add(tracked);
      void tracked.finally(() => running.delete(tracked));
    },
    pending: () => running.size,
    async settled(): Promise<void> {
      // Work that starts while waiting (another preview closing) is waited for too.
      while (running.size > 0) await Promise.all([...running]);
    },
    record(command: string): void {
      log.push({ at: now(), command });
      if (log.length > limit) log.splice(0, log.length - limit);
    },
    moves: (since = 0) => log.filter((move) => move.at >= since).map((move) => ({ ...move })),
  };
}
