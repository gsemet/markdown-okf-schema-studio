import { frontmatterLineCount, isCommonMarkBlank } from "./blockRange";
import { splitLines } from "./blockMove";
import { emptyQuoteLine, sameQuoteShape } from "./quoteLine";

/** A range of document lines: 1-based, inclusive. */
export interface BlankRun {
  line: number;
  endLine: number;
}

/**
 * Every maximal run of CommonMark blank lines after the frontmatter, with the line count of the text.
 * The empty pseudo-line after a final line break is not a line, so it is never counted.
 */
function plainRuns(text: string): { runs: BlankRun[]; lineCount: number } {
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
    runs.push({ line: first + 1, endLine: index });
  }
  return { runs, lineCount: lines.length };
}

/** The first shown line of a plain run, or undefined when the run shows nothing (rules 2 to 4). */
function plainShownStart(run: BlankRun, lineCount: number): number | undefined {
  // At the end of the body and at the top of a file without frontmatter every line shows; between
  // two blocks the run's first line is the separator.
  const first = run.endLine === lineCount || run.line === 1 ? run.line : run.line + 1;
  return first <= run.endLine ? first : undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * Every maximal run of CommonMark blank lines after the frontmatter, in document order, that shows
 * at least one blank line: a run of two or more lines, or a single line that a rule shows (at the end
 * of the body, or at line 1). A single blank line between two blocks is the separator Markdown needs
 * and is not listed. LF, CR LF and lone CR work the same.
 */
export function blankRuns(text: string): BlankRun[] {
  const { runs, lineCount } = plainRuns(text);
  return runs.filter((run) => run.endLine > run.line || plainShownStart(run, lineCount) !== undefined);
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * Every quote run after the frontmatter, in document order: a maximal sequence of two or more
 * consecutive empty quote lines of the same depth and marker columns. A line of another depth does
 * not join a run (keeping one of them would merge or split quotes). It lists runs wherever they are,
 * fences and code blocks included: the page decides where one shows. A single empty quote line is
 * the separator of its quote and is not a run.
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

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * The ranges of shown blank lines, in line order, one range per run that shows at least one line
 * (a range may be one line). Rules, first match wins: a quote run keeps its first line as the
 * separator, wherever it stands; a plain run at the end of the body shows every line; a plain run at
 * line 1 (a file without frontmatter) shows every line; a plain run between two blocks keeps its
 * first line as the separator.
 */
export function shownBlankLines(text: string): BlankRun[] {
  const { runs, lineCount } = plainRuns(text);
  const shown: BlankRun[] = [];
  for (const run of runs) {
    const first = plainShownStart(run, lineCount);
    if (first !== undefined) shown.push({ line: first, endLine: run.endLine });
  }
  for (const run of quoteBlankRuns(text)) {
    shown.push({ line: run.line + 1, endLine: run.endLine });
  }
  return shown.sort((first, second) => first.line - second.line);
}

/** The maximal run, plain or quote, that holds `line` (a single line included), or undefined. */
export function blankRunAround(text: string, line: number): BlankRun | undefined {
  if (!Number.isSafeInteger(line) || line < 1) return undefined;
  const lines = splitLines(text);
  if (line > lines.length || line <= frontmatterLineCount(text)) return undefined;
  const quote = quoteBlankRuns(text).find((run) => run.line <= line && line <= run.endLine);
  if (quote) return quote;
  return plainRuns(text).runs.find((run) => run.line <= line && line <= run.endLine);
}
