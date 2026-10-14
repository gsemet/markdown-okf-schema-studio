/**
 * Lines removed from `before` and added in `after`, after trimming common leading and trailing
 * lines. Splits on `\n` only, so a `\r` at the end of a CRLF line stays part of that line and
 * line-ending changes are detected.
 */
export function lineDelta(before: string, after: string): { removed: string[]; added: string[] } {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const limit = Math.min(beforeLines.length, afterLines.length);
  let prefix = 0;
  while (prefix < limit && beforeLines[prefix] === afterLines[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < limit - prefix
    && beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    removed: beforeLines.slice(prefix, beforeLines.length - suffix),
    added: afterLines.slice(prefix, afterLines.length - suffix),
  };
}
