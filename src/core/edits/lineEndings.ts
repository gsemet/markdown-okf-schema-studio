/**
 * Line endings of a block text that a text box returned with LF only. Kept free of other imports:
 * the page bundle uses it too.
 */

const LINE_BREAK = /\r\n|\n|\r/gu;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-263
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-234
/**
 * `editedText` with every line break in the line ending of `reference` (the block text as it is in
 * the document), so a text unchanged but for the LF a text box returns is `reference` again, byte
 * for byte. A `reference` with one line ending takes it for every break; one with no break takes
 * the one line ending of `documentText`. A `reference` with mixed line endings keeps each ending
 * on the lines the edit left in place (the lines before and after the changed lines); a changed
 * line takes the ending of the line it replaces, or of the line above when lines were added or
 * removed. With `keepOwnEndings` (the host, which also gets texts from older pages), a text that
 * already holds a CR keeps its endings when `reference` is mixed. A `reference` with no break and a mixed document leaves `editedText` as it is.
 */
export function matchLineEndings(editedText: string, reference: string, documentText = "", keepOwnEndings = false): string {
  let endings = new Set(reference.match(LINE_BREAK));
  if (endings.size === 0) endings = new Set(documentText.match(LINE_BREAK));
  if (endings.size === 0) return editedText;
  if (endings.size === 1) {
    const [ending] = endings;
    return editedText.replace(LINE_BREAK, ending!);
  }
  const referenceBreaks = reference.match(LINE_BREAK) ?? [];
  if (referenceBreaks.length === 0 || (keepOwnEndings && editedText.includes("\r"))) return editedText;
  const referenceLines = reference.split(LINE_BREAK);
  const editedLines = editedText.split(LINE_BREAK);
  const referenceCount = referenceLines.length;
  const editedCount = editedLines.length;
  const limit = Math.min(referenceCount, editedCount);
  let before = 0;
  while (before < limit - 1 && editedLines[before] === referenceLines[before]) before += 1;
  let after = 0;
  while (before + after < limit && editedLines[editedCount - 1 - after] === referenceLines[referenceCount - 1 - after]) after += 1;
  const counts = new Map<string, number>();
  for (const ending of referenceBreaks) counts.set(ending, (counts.get(ending) ?? 0) + 1);
  let common = referenceBreaks[0]!;
  for (const [ending, count] of counts) if (count > counts.get(common)!) common = ending;
  const sameSpan = editedCount === referenceCount;
  let result = "";
  for (let index = 0; index < editedCount; index += 1) {
    result += editedLines[index];
    if (index === editedCount - 1) break;
    const fromEnd = editedCount - 1 - index;
    if (index < before) result += referenceBreaks[index];
    else if (fromEnd < after) result += referenceBreaks[referenceCount - 1 - fromEnd];
    else if (sameSpan) result += referenceBreaks[index];
    else result += before > 0 ? referenceBreaks[before - 1] : common;
  }
  return result;
}
