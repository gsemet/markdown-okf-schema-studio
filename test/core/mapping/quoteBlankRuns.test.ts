import * as assert from "node:assert/strict";
import { test } from "node:test";

import { blankRuns, quoteBlankRuns } from "../../../src/core/mapping/blankRuns";
import { checkBlankRun, planBlankRunRemoval } from "../../../src/core/mapping/blockRange";
import { insertionText, planBlankRunInsertion } from "../../../src/core/mapping/insertion";
import { emptyQuoteLine, quoteContent } from "../../../src/core/mapping/quoteLine";

/** CR-462: quote runs, their finders, their checks and their removal, in LF, CR LF and lone CR. */
const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const;
const join = (eol: string, entries: string[]): string => entries.join(eol);

const noBareLineBreak = (text: string, eol: string): void => {
  if (eol === "\r\n") assert.ok(!/(?<!\r)\n/u.test(text) && !/\r(?!\n)/u.test(text), "no bare LF or CR in CR LF");
  if (eol === "\n") assert.ok(!text.includes("\r"), "no CR in LF");
  if (eol === "\r") assert.ok(!text.includes("\n"), "no LF in CR");
};

/** The text once the removal plan of the run `line`..`endLine` is applied. */
function removed(text: string, line: number, endLine: number): string {
  const plan = planBlankRunRemoval(text, line, endLine);
  assert.ok("start" in plan, `the run ${line}-${endLine} is removable`);
  return text.slice(0, plan.start) + text.slice(plan.end);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("an empty quote line is quote markers and nothing else, with its depth, columns and prefix", () => {
  assert.deepEqual(emptyQuoteLine(">"), { depth: 1, columns: [0], prefix: ">" });
  assert.deepEqual(emptyQuoteLine("> "), { depth: 1, columns: [0], prefix: ">" });
  assert.deepEqual(emptyQuoteLine(">\t"), { depth: 1, columns: [0], prefix: ">" });
  assert.deepEqual(emptyQuoteLine("> >"), { depth: 2, columns: [0, 2], prefix: "> >" });
  assert.deepEqual(emptyQuoteLine(">>"), { depth: 2, columns: [0, 1], prefix: ">>" });
  assert.deepEqual(emptyQuoteLine("  >"), { depth: 1, columns: [2], prefix: "  >" });
  assert.deepEqual(emptyQuoteLine(">\t>"), { depth: 2, columns: [0, 4], prefix: ">\t>" });
  assert.deepEqual(emptyQuoteLine("\t>"), { depth: 1, columns: [4], prefix: "\t>" });
  for (const text of ["> a", ">a", "", "   ", "a", "> > a", ">\ta"]) assert.equal(emptyQuoteLine(text), undefined, text);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
test("the quote content skips the markers and one space, a tab gives its rest as spaces", () => {
  const shape = emptyQuoteLine(">")!;
  assert.equal(quoteContent("> text", shape), "text");
  assert.equal(quoteContent(">text", shape), "text");
  assert.equal(quoteContent(">\ttext", shape), "  text");
  assert.equal(quoteContent("text", shape), undefined);
  assert.equal(quoteContent("  > text", shape), undefined, "other marker columns");
  assert.equal(quoteContent("> > text", shape), "> text", "a deeper quote is content of the outer one");
  assert.equal(quoteContent("> text", emptyQuoteLine("> >")!), undefined, "a line with fewer markers");
});

for (const [name, eol] of EOLS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
  test(`${name}: runs of two and of three empty quote lines are found, a single one is the separator`, () => {
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", "> b", ""])), []);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", ">", "> b", ""])), [{ line: 2, endLine: 3 }]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", "> ", ">\t", ">", "> b", ""])), [{ line: 2, endLine: 4 }]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", ">", "> b", ">", ">", ">", "> c"])), [
      { line: 2, endLine: 3 },
      { line: 5, endLine: 7 },
    ]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
  test(`${name}: lines of another depth or other marker columns do not join a run`, () => {
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", "> >", "> b"])), []);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> > c", "> >", ">", "> > d"])), []);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> >", "> >", ">", ">"])), [
      { line: 1, endLine: 2 },
      { line: 3, endLine: 4 },
    ]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", "  >", "> b"])), [], "other marker columns");
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">>", "> >", "> b"])), [], "same depth, other columns");
    assert.deepEqual(quoteBlankRuns(join(eol, ["- a", "", "  >", "  >", "  > b"])), [{ line: 3, endLine: 4 }]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">>", ">>", "> b"])), [{ line: 2, endLine: 3 }]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
  test(`${name}: a run at the start of a quote and one at the end of the text are found`, () => {
    assert.deepEqual(quoteBlankRuns(join(eol, [">", ">", "> b", ""])), [{ line: 1, endLine: 2 }]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["x", "", ">", ">", "> b"])), [{ line: 3, endLine: 4 }]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", ">"])), [{ line: 2, endLine: 3 }]);
    assert.deepEqual(quoteBlankRuns(join(eol, ["> a", ">", ">", ""])), [{ line: 2, endLine: 3 }]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
  test(`${name}: the frontmatter is excluded and a quote run next to a plain run is found beside it`, () => {
    // The frontmatter reader knows LF and CR LF only (a lone CR file has no frontmatter block).
    if (eol !== "\r") {
      const text = join(eol, ["---", ">", ">", "---", "> a", ">", ">", "> b", "", "", "c", ""]);
      assert.deepEqual(quoteBlankRuns(text), [{ line: 6, endLine: 7 }]);
      assert.deepEqual(blankRuns(text), [{ line: 9, endLine: 10 }]);
    }
    const near = join(eol, ["> a", ">", ">", "", "", "b"]);
    assert.deepEqual(quoteBlankRuns(near), [{ line: 2, endLine: 3 }]);
    assert.deepEqual(blankRuns(near), [{ line: 4, endLine: 5 }]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-266
  test(`${name}: a quote run is listed inside a fence held by a quote, the page decides where it shows`, () => {
    assert.deepEqual(quoteBlankRuns(join(eol, ["> ```", "> a", ">", ">", "> b", "> ```"])), [{ line: 3, endLine: 4 }]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
  test(`${name}: checkBlankRun accepts a quote run`, () => {
    const text = join(eol, ["> a", ">", ">", ">", "> b", ""]);
    assert.equal(checkBlankRun(text, 2, 4), undefined);
    assert.equal(checkBlankRun(join(eol, [">", ">", "> b", ""]), 1, 2), undefined, "a run at the start of a quote");
    assert.equal(checkBlankRun(join(eol, ["> a", ">", ">"]), 2, 3), undefined, "a run at the end of the text");
    assert.equal(checkBlankRun(join(eol, ["> a", ">", ">", ""]), 2, 3), undefined);
    assert.equal(checkBlankRun(join(eol, ["> > a", "> >", "> >", "> > b"]), 2, 3), undefined, "a nested run");
    assert.equal(checkBlankRun(join(eol, ["- a", "", "  >", "  >", "  > b"]), 3, 4), undefined, "a run in a list item");
    assert.equal(checkBlankRun(join(eol, ["> a", ">", "> >", "> >", "> b"]), 3, 4), undefined, "another depth above");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-267
  test(`${name}: checkBlankRun refuses a quote run that is stale`, () => {
    const stale = (text: string, line: number, endLine: number, why: string): void =>
      assert.ok(checkBlankRun(text, line, endLine), why);
    stale(join(eol, ["> a", ">", ">", "> b"]), 2, 2, "one empty quote line is no run");
    stale(join(eol, ["> a", ">", "> b", "> c"]), 2, 3, "a line that is not an empty quote line");
    stale(join(eol, ["> a", ">", ">", "> b"]), 2, 4, "a last line that is not an empty quote line");
    stale(join(eol, ["> a", ">", ">", ">", "> b"]), 3, 4, "the line above is the same shape");
    stale(join(eol, ["> a", ">", ">", ">", "> b"]), 2, 3, "the line below is the same shape");
    stale(join(eol, ["> a", ">", "> >", "> b"]), 2, 3, "depths differ");
    stale(join(eol, ["> a", ">>", "> >", "> b"]), 2, 3, "columns differ");
    stale(join(eol, ["> a", ">", "  >", "> b"]), 2, 3, "marker columns differ");
    stale(join(eol, ["> a", ">", ">"]), 2, 9, "a range past the end");
    if (eol !== "\r") stale(join(eol, ["---", ">", ">", "---", "> a"]), 2, 3, "a run in the frontmatter");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
  test(`${name}: removing a quote run keeps its first line byte for byte and nothing else changes`, () => {
    const middle = join(eol, ["> a", "> ", "> ", "> ", "> b", ""]);
    assert.equal(removed(middle, 2, 4), join(eol, ["> a", "> ", "> b", ""]));
    const start = join(eol, [">", ">", "> b", ""]);
    assert.equal(removed(start, 1, 2), join(eol, [">", "> b", ""]), "at the start of the file");
    const afterBlank = join(eol, ["x", "", ">", ">", "> b", ""]);
    assert.equal(removed(afterBlank, 3, 4), join(eol, ["x", "", ">", "> b", ""]), "at the start of a quote after a blank line");
    const tabbed = join(eol, ["> a", ">\t", ">", "> b", ""]);
    assert.equal(removed(tabbed, 2, 3), join(eol, ["> a", ">\t", "> b", ""]), "line `line` keeps its tab");
    for (const text of [middle, start, afterBlank, tabbed]) {
      const run = quoteBlankRuns(text)[0];
      noBareLineBreak(removed(text, run.line, run.endLine), eol);
    }
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
  test(`${name}: removing a quote run at the end of the text keeps the final line break, or its absence`, () => {
    const withBreak = join(eol, ["> a", ">", ">", ""]);
    assert.equal(removed(withBreak, 2, 3), join(eol, ["> a", ">", ""]));
    const withoutBreak = join(eol, ["> a", ">", ">"]);
    assert.equal(removed(withoutBreak, 2, 3), join(eol, ["> a", ">"]));
    const three = join(eol, ["> a", "> ", "> ", "> "]);
    assert.equal(removed(three, 2, 4), join(eol, ["> a", "> "]), "line `line` keeps its space, the text ends without a break");
    noBareLineBreak(removed(withBreak, 2, 3), eol);
    noBareLineBreak(removed(withoutBreak, 2, 3), eol);
    assert.equal(removed(join(eol, [">", ">"]), 1, 2), ">", "a text of one quote run keeps its first line");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
  test(`${name}: plain runs in a directive, a definition and a footnote keep their line \`line\``, () => {
    const directive = join(eol, ["```{note}", "a", "", "", "b", "```", ""]);
    assert.equal(removed(directive, 3, 4), join(eol, ["```{note}", "a", "", "b", "```", ""]));
    const definition = join(eol, ["Term", ": one", "", "", "  two", ""]);
    assert.equal(removed(definition, 3, 4), join(eol, ["Term", ": one", "", "  two", ""]));
    const footnote = join(eol, ["A[^x]", "", "[^x]: note", "", "", "    more", ""]);
    assert.equal(removed(footnote, 4, 5), join(eol, ["A[^x]", "", "[^x]: note", "", "    more", ""]));
    for (const text of [directive, definition, footnote]) {
      const run = blankRuns(text)[0];
      noBareLineBreak(removed(text, run.line, run.endLine), eol);
    }
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: a block written in a quote run stays in the quote`, () => {
    const text = join(eol, ["> a", ">", ">", "> b", ""]);
    const plan = planBlankRunInsertion(text, 2, 3);
    const inserted = insertionText(plan, "new\n\nmore");
    const result = text.slice(0, plan.replace!.start) + inserted + text.slice(plan.replace!.end);
    assert.equal(result, join(eol, ["> a", ">", "> new", ">", "> more", ">", "> b", ""]));
    noBareLineBreak(result, eol);
  });
}
