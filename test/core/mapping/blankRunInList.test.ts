import * as assert from "node:assert/strict";
import { test } from "node:test";

import { planBlocksPaste } from "../../../src/core/edits/sourceEdits";
import { planBlankRunPaste, planBlankRunRemoval } from "../../../src/core/mapping/blockRange";
import { insertionText, planBlankRunInsertion } from "../../../src/core/mapping/insertion";
import { shownBlankLines } from "../../../src/core/mapping/blankRuns";
import { renderPreviewSource } from "../../../src/core/render/renderPipeline";
import { attribute, findElements, parseHtml, textContent } from "../render/dom";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";

/**
 * A block written or pasted in place of a blank run inside a list (CR-448): the host indents it to the
 * item, so it stays in the item; a line typed at the item's own level adds an item. Each case runs in
 * LF, CR LF and lone CR, and its result is rendered to check the list is still one list.
 */

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const;
const join = (eol: string, entries: string[]): string => entries.join(eol);

const render = (text: string) =>
  renderPreviewSource({ text, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false }, createNodeFileSystem());

/** The first shown blank line of the text, one line: `endLine === line`. */
function firstShown(text: string): { line: number; endLine: number } {
  const [first] = shownBlankLines(text);
  return { line: first.line, endLine: first.line };
}

/** The text with `raw` written in the first shown blank line of the text, `itemLine` being its list item. */
function writeInRun(text: string, itemLine: number | undefined, raw: string): string {
  const run = firstShown(text);
  const plan = planBlankRunInsertion(text, run.line, itemLine);
  return text.slice(0, plan.replace!.start) + insertionText(plan, raw) + text.slice(plan.replace!.end);
}

const noBareLineBreak = (text: string, eol: string): void => {
  if (eol === "\r\n") assert.ok(!/(?<!\r)\n/u.test(text) && !/\r(?!\n)/u.test(text), "no bare LF or CR in CR LF");
  if (eol === "\n") assert.ok(!text.includes("\r"), "no CR in LF");
  if (eol === "\r") assert.ok(!text.includes("\n"), "no LF in CR");
};

/** The top-level lists of a rendered text, and the `li` elements as `[marker line, own text]`. */
async function listsOf(text: string): Promise<{ lists: number; items: Array<[number, string]> }> {
  const document = parseHtml((await render(text)).html);
  const [body] = findElements(document, (e) => e.tagName === "body");
  const top = body.childNodes.filter((node) => "tagName" in node && (node.tagName === "ul" || node.tagName === "ol"));
  const items = findElements(document, (e) => e.tagName === "li").map((li): [number, string] => [
    Number(attribute(li, "data-line")),
    li.childNodes.filter((node) => "tagName" in node && node.tagName === "p").map(textContent).join("|"),
  ]);
  return { lists: top.length, items };
}

for (const [name, eol] of EOLS) {
  const between = join(eol, ["- a", "", "", "", "- b", ""]);
  const inItem = join(eol, ["- a", "", "", "", "  more", ""]);
  const nested = join(eol, ["- top", "  - a1", "", "", "", "  - a2", ""]);

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "More" between two items goes into the item above, indented to its content`, async () => {
    const written = writeInRun(between, 1, "More");
    assert.equal(written, join(eol, ["- a", "", "  More", "", "- b", ""]));
    noBareLineBreak(written, eol);
    const { lists, items } = await listsOf(written);
    assert.equal(lists, 1);
    assert.deepEqual(items, [[1, "a|More"], [5, "b"]]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "More" between two paragraphs of an item is indented with the item`, async () => {
    const written = writeInRun(join(eol, ["- a", "", "  p1", "", "", "", "  p2", "", "- b"]), 1, "More");
    assert.equal(written, join(eol, ["- a", "", "  p1", "", "  More", "", "  p2", "", "- b"]));
    const { lists, items } = await listsOf(written);
    assert.equal(lists, 1);
    assert.deepEqual(items, [[1, "a|p1|More|p2"], [9, "b"]]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: a two-line block with a blank line between keeps both lines in the item`, async () => {
    const written = writeInRun(between, 1, join(eol, ["More", "", "Text"]));
    assert.equal(written, join(eol, ["- a", "", "  More", "", "  Text", "", "- b", ""]));
    const { lists, items } = await listsOf(written);
    assert.equal(lists, 1);
    assert.deepEqual(items, [[1, "a|More|Text"], [7, "b"]]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "- c" between items adds an item at the item level, between nested items at theirs`, async () => {
    const top = writeInRun(between, 1, "- c");
    assert.equal(top, join(eol, ["- a", "", "- c", "", "- b", ""]));
    assert.deepEqual(await listsOf(top), { lists: 1, items: [[1, "a"], [3, "c"], [5, "b"]] });
    const deep = writeInRun(nested, 2, "- c");
    assert.equal(deep, join(eol, ["- top", "  - a1", "", "  - c", "", "  - a2", ""]));
    const { lists, items } = await listsOf(deep);
    assert.equal(lists, 1);
    assert.deepEqual(items.map(([, text]) => text), ["top", "a1", "c", "a2"]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "- c" inside an item becomes a nested list of that item`, async () => {
    const written = writeInRun(inItem, 1, "- c");
    assert.equal(written, join(eol, ["- a", "", "  - c", "", "  more", ""]));
    const { lists, items } = await listsOf(written);
    assert.equal(lists, 1);
    assert.deepEqual(items.map(([line]) => line), [1, 3], "a nested item and no new top-level item");
    const document = parseHtml((await render(written)).html);
    const [outer] = findElements(document, (e) => e.tagName === "li");
    assert.equal(findElements(outer, (e) => e.tagName === "li").length, 2, "the item holds the nested item");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
  test(`${name}: "More" after a tab marker and after a second marker takes four spaces`, async () => {
    assert.equal(writeInRun(join(eol, ["-\ta", "", "", "", "- b"]), 1, "More"), join(eol, ["-\ta", "", "    More", "", "- b"]));
    assert.equal(writeInRun(join(eol, ["- - a", "", "", "", "- b"]), 1, "More"), join(eol, ["- - a", "", "    More", "", "- b"]));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: a marker typed after two spaces between items takes the item indent and keeps the two spaces`, async () => {
    const written = writeInRun(between, 1, "  - sub");
    assert.equal(written, join(eol, ["- a", "", "  - sub", "", "- b", ""]));
    const { lists, items } = await listsOf(written);
    assert.equal(lists, 1);
    assert.deepEqual(items.map(([, text]) => text), ["a", "sub", "b"]);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: without an item line the block is written as before, and a thematic break stays a content line`, () => {
    assert.equal(writeInRun(between, undefined, "More"), join(eol, ["- a", "", "More", "", "- b", ""]));
    assert.equal(writeInRun(between, 1, "---"), join(eol, ["- a", "", "  ---", "", "- b", ""]));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: the blank lines of a typed block get no indent, and the line endings are the document's`, () => {
    const written = writeInRun(between, 1, join(eol, ["P", "", "  ", "Q"]));
    assert.equal(written, join(eol, ["- a", "", "  P", "", "  ", "  Q", "", "- b", ""]));
    noBareLineBreak(written, eol);
    const typedWithLf = writeInRun(between, 1, "P\n\nQ");
    assert.equal(typedWithLf, join(eol, ["- a", "", "  P", "", "  Q", "", "- b", ""]));
    noBareLineBreak(typedWithLf, eol);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: a paste takes the same indent as typing, and refuses a line that is no list item`, async () => {
    const run = firstShown(between);
    const paste = (clipboard: string, itemLine?: number) =>
      planBlankRunPaste(between, run.line, clipboard, itemLine);
    const more = paste("More", 1);
    assert.ok(!("refused" in more));
    const applied = (plan: { offset: number; text: string; end?: number }): string =>
      between.slice(0, plan.offset) + plan.text + between.slice(plan.end ?? plan.offset);
    assert.equal(applied(more as { offset: number; text: string; end?: number }), join(eol, ["- a", "", "  More", "", "- b", ""]));
    const item = paste("- c", 1);
    assert.equal(applied(item as { offset: number; text: string; end?: number }), join(eol, ["- a", "", "- c", "", "- b", ""]));
    assert.deepEqual(paste("More", 3), { refused: "The preview is out of date. Refresh it and try again." });
    assert.deepEqual(paste("More", 5), { refused: "The preview is out of date. Refresh it and try again." });
    const viaBlocks = planBlocksPaste(between, run.line - 1, "More", { ...run, itemLine: 1 });
    assert.ok("edit" in viaBlocks);
    assert.equal(
      between.slice(0, viaBlocks.edit.start) + viaBlocks.edit.text + between.slice(viaBlocks.edit.end),
      join(eol, ["- a", "", "  More", "", "- b", ""]),
    );
    assert.ok("refused" in planBlocksPaste(between, run.line - 1, "More", { ...run, itemLine: 5 }));
    const pasted = applied(more as { offset: number; text: string; end?: number });
    assert.equal((await listsOf(pasted)).lists, 1);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S3
  test(`${name}: removing a blank line between items or inside an item removes that line only and keeps one list`, async () => {
    for (const text of [between, inItem, nested]) {
      const run = firstShown(text);
      const plan = planBlankRunRemoval(text, run.line);
      assert.ok(!("refused" in plan));
      const removed = text.slice(0, (plan as { start: number }).start) + text.slice((plan as { end: number }).end);
      const lines = text.split(eol);
      lines.splice(run.line - 1, 1);
      assert.equal(removed, lines.join(eol), "only the removed line goes");
      assert.equal((await listsOf(removed)).lists, 1);
    }
  });
}
