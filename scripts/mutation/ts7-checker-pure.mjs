/**
 * Pure parts of the TypeScript 7 checker (CR-450): no TypeScript API, no file system, so
 * `test/build/mutationTools.test.ts` can run them.
 */

/** Offsets of the start of each line (lines split on \n; a \r stays at the end of its line). */
export function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) if (text[index] === "\n") starts.push(index + 1);
  return starts;
}

/**
 * The text of `original` with the mutant applied. `location` is Stryker's `{ start, end }` with
 * 0-based `line` and `column`; the replaced span goes from start to end.
 */
export function applyMutant(original, location, replacement) {
  const starts = lineStarts(original);
  const from = starts[location.start.line] + location.start.column;
  const to = starts[location.end.line] + location.end.column;
  return original.slice(0, from) + replacement + original.slice(to);
}

/** The 1-based line and column of an offset. */
export function positionOf(text, offset) {
  const starts = lineStarts(text);
  let line = 0;
  while (line + 1 < starts.length && starts[line + 1] <= offset) line += 1;
  return { line: line + 1, column: offset - starts[line] + 1 };
}

/** Identity of a diagnostic for the baseline comparison: not its position, which a mutant can shift. */
export function diagnosticKey(diagnostic) {
  return `${diagnostic.fileName ?? ""}|${diagnostic.code}|${diagnostic.text}`;
}

/** The error diagnostics (category 1) that are not in the baseline (a Set of keys). */
export function newDiagnostics(baseline, diagnostics) {
  const remaining = new Map();
  for (const key of baseline) remaining.set(key, (remaining.get(key) ?? 0) + 1);
  return diagnostics.filter((diagnostic) => {
    if (diagnostic.category !== 1) return false;
    const key = diagnosticKey(diagnostic);
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      return false;
    }
    return true;
  });
}

/** The CompileError reason: `TS<code> <text> (<file>:<line>:<column>)` of the first new diagnostic. */
export function describeDiagnostic(diagnostic, textOf) {
  const where = diagnostic.fileName
    ? (() => {
        const text = textOf(diagnostic.fileName);
        const position = text === undefined ? undefined : positionOf(text, diagnostic.pos ?? 0);
        return ` (${diagnostic.fileName}${position ? `:${position.line}:${position.column}` : ""})`;
      })()
    : "";
  return `TS${diagnostic.code} ${String(diagnostic.text).split("\n")[0]}${where}`;
}

/** Overlay key of a path: slashes, lower case, so Windows and POSIX spellings meet. */
export function overlayKey(file) {
  return file.replace(/\\/gu, "/").toLowerCase();
}
