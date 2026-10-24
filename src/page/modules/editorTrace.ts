/** One event of the page's editor trace. */
export interface EditorTraceEntry {
  /** Milliseconds since the page script started. */
  at: number;
  event: string;
  detail?: string;
  /** The nearest named callers of `record`, innermost first (`a < b < c`). */
  stack?: string;
}

/**
 * A small ring buffer of editor lifecycle events (open, close and why, focus moves, content
 * replacements). It changes nothing in the page: tests read it through the page's diagnostics
 * when an editor is missing, so a failure names what closed it. Injected into the page script with
 * `.toString()`: the body uses nothing defined outside it.
 */
export function createEditorTrace(
  limit: number,
  now: () => number,
): {
    record(event: string, detail?: string, stack?: string): void;
    entries(): EditorTraceEntry[];
    callers(stack: string | undefined, skip?: number): string;
  } {
  const start = now();
  const buffer: EditorTraceEntry[] = [];
  // "at name (file:line:col)" (V8) or "name@file:line:col" (others): the function names only.
  const callers = (stack: string | undefined, skip = 0): string => {
    if (typeof stack !== "string") return "";
    const names: string[] = [];
    for (const line of stack.split("\n").slice(1)) {
      const match = /^\s*at\s+(?:async\s+)?([^\s(]+)\s*\(/u.exec(line) ?? /^\s*([^@\s]+)@/u.exec(line);
      if (match && match[1] && !match[1].startsWith("<")) names.push(match[1].replace(/^Object\./u, ""));
    }
    return names.slice(skip, skip + 3).join(" < ");
  };
  return {
    record(event: string, detail?: string, stack?: string): void {
      const entry: EditorTraceEntry = { at: Math.round(now() - start), event };
      if (detail !== undefined && detail !== "") entry.detail = detail;
      if (stack !== undefined && stack !== "") entry.stack = stack;
      buffer.push(entry);
      if (buffer.length > limit) buffer.splice(0, buffer.length - limit);
    },
    entries: () => buffer.map((entry) => ({ ...entry })),
    callers,
  };
}
