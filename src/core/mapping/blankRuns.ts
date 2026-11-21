import { frontmatterLineCount, isCommonMarkBlank } from "./blockRange";
import { splitLines } from "./blockMove";
import { emptyQuoteLine, sameQuoteShape } from "./quoteLine";

/** A blank run: 1-based, inclusive document lines. */
export interface BlankRun {
  line: number;
  endLine: number;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * Every maximal run of two or more CommonMark blank lines after the frontmatter, in document order.
 * A single blank line is the separator Markdown needs and is not a run. The empty pseudo-line after a
 * final line break is not a line, so it is never counted. LF, CR LF and lone CR work the same.
 */
export function blankRuns(text: string): BlankRun[] {
  const lines = splitLines(text);
  const runs: BlankRun[] = [];
  let index = frontmatterLineCount(text);
  while (index < lines.length) {
    if (!isCommonMarkBlank(lines[index].text)) {
      index += 1;
      continue;
    }
    const first = index;
    while (index < lines.length && isCommonMarkBlank(lines[index].text)) {
      index += 1;
    }
    if (index - first >= 2) {
      runs.push({ line: first + 1, endLine: index });
    }
  }
  return runs;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * Every quote run after the frontmatter, in document order: a maximal sequence of two or more
 * consecutive empty quote lines of the same depth and marker columns. A line of another depth does
 * not join a run (keeping one of them would merge or split quotes). It lists runs wherever they are,
 * fences and code blocks included: the page decides where one shows.
 */
export function quoteBlankRuns(text: string): BlankRun[] {
  const lines = splitLines(text);
  const runs: BlankRun[] = [];
  let index = frontmatterLineCount(text);
  while (index < lines.length) {
    const first = emptyQuoteLine(lines[index].text);
    if (!first) {
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    for (let next = emptyQuoteLine(lines[index]?.text ?? ""); next && sameQuoteShape(first, next);
      next = emptyQuoteLine(lines[index]?.text ?? "")) {
      index += 1;
    }
    if (index - start >= 2) {
      runs.push({ line: start + 1, endLine: index });
    }
  }
  return runs;
}
