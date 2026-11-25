/**
 * The block editor of a list item. The document is rendered and mapped like the preview, and the
 * lines are the ones `createMappedBlocks(...).editingElementFor` gives for a click (or, with
 * `exact`, for Enter on a block the keyboard selected), as `openBlockEditor` posts them with
 * previewEditOpen.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createMappedBlocks } from "../../src/page/features/mappedBlocks";
import { MAPPINGS_SELECTOR } from "../../src/page/features/pageRuntime";
import { renderMappedPage, type MappedElement } from "./mappedHtmlDom";

const SOURCE_FILE = "/w/spec.md";
const DOCUMENT_ID = "file:///w/spec.md";

/** The element an edit of `clicked` opens on and its line range (`exact`: from the keyboard). */
function editRangeOf(page: Awaited<ReturnType<typeof renderMappedPage>>, clicked: MappedElement, exact = false) {
  const mapped = clicked.closest(MAPPINGS_SELECTOR);
  assert.ok(mapped, "the target is in a mapped block");
  const blocks = createMappedBlocks(page.document as never, { activeSourceFile: SOURCE_FILE, documentId: DOCUMENT_ID } as never);
  const editing = blocks.editingElementFor(mapped as never, { exact });
  const element = editing.element as unknown as MappedElement;
  const line = editing.sourceRange?.line ?? Number(element.getAttribute("data-sphinx-source-line"));
  const endLine = editing.sourceRange?.endLine ?? Number(element.getAttribute("data-sphinx-source-end-line") || line);
  return { tagName: element.tagName, line, endLine };
}

/** Lines `from` to `to` (one-based, inclusive) of `source`. */
function linesOf(source: string, from: number, to: number): string {
  return source.split("\n").slice(from - 1, to).join("\n");
}

const CHAPTER = [
  "# Braking",
  "",
  "- [SRS_0001] Brake on demand",
  "",
  "  The system shall apply the brakes within 200 ms of a brake request.",
  "",
  "      Satisfies: STK_0001",
  "      Labels: ASIL-B",
  "",
  "- [SRS_0002] Release on demand",
  "",
  "  The system shall release the brakes within 300 ms of a release request.",
  "",
  "      Satisfies: STK_0002",
  "",
  "- A plain item",
  "",
  "  with a second paragraph.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S10
test("a click on the first line, a paragraph or the code block of a list item opens that item only", async () => {
  const page = await renderMappedPage(CHAPTER, SOURCE_FILE, DOCUMENT_ID);
  const codeBlocks = page.document.querySelectorAll("code");
  const cases: Array<[string, MappedElement, number, number]> = [
    ["first line of the first item", page.elementWithText("[SRS_0001] Brake on demand"), 3, 9],
    ["paragraph of the second item", page.elementWithText("The system shall release the brakes within 300 ms of a release request."), 10, 15],
    ["code block of the second item", codeBlocks[1]!, 10, 15],
    ["second paragraph of a plain item", page.elementWithText("with a second paragraph."), 16, 18],
  ];
  for (const [name, clicked, from, to] of cases) {
    const range = editRangeOf(page, clicked);
    assert.deepEqual([range.tagName, range.line, range.endLine], ["LI", from, to], name);
  }
  assert.equal(linesOf(CHAPTER, 10, 15), [
    "- [SRS_0002] Release on demand",
    "",
    "  The system shall release the brakes within 300 ms of a release request.",
    "",
    "      Satisfies: STK_0002",
    "",
  ].join("\n"), "the range holds the item's lines and the blank line that separates it from the next item, as the list's range does");
});

const TIGHT_LIST = [
  "- Short",
  "- Soft",
  "  wrapped",
  "- [ ] A task",
  "  wrapped too",
  "",
  "After the list.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S8
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S9
test("a wrapped item of a tight list opens on all its lines", async () => {
  const page = await renderMappedPage(TIGHT_LIST, SOURCE_FILE, DOCUMENT_ID);
  const items = page.document.querySelectorAll("li");
  const cases: Array<[string, number, number]> = [["Short", 1, 1], ["Soft", 2, 3], ["A task", 4, 6]];
  for (const [index, [name, from, to]] of cases.entries()) {
    const range = editRangeOf(page, items[index]!);
    assert.deepEqual([range.tagName, range.line, range.endLine], ["LI", from, to], name);
  }
});

const NESTED_LIST = [
  "- An outer item:",
  "",
  "  - the wheel speed channel",
  "  - the pedal channel",
  "",
  "  Each window lasts 5 ms.",
  "",
  "- The last outer item.",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S10
test("a click in a nested list opens the nested item; the rest of the outer item opens the outer item", async () => {
  const page = await renderMappedPage(NESTED_LIST, SOURCE_FILE, DOCUMENT_ID);
  const nested = editRangeOf(page, page.elementWithText("the pedal channel"));
  assert.deepEqual([nested.tagName, nested.line, nested.endLine], ["LI", 4, 5], "the nearest item wins");
  const outer = editRangeOf(page, page.elementWithText("Each window lasts 5 ms."));
  assert.deepEqual([outer.tagName, outer.line, outer.endLine], ["LI", 1, 7], "the outer item holds its nested list");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S8
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S9
test("the list itself, outside its items, opens the whole list", async () => {
  const page = await renderMappedPage(CHAPTER, SOURCE_FILE, DOCUMENT_ID);
  const list = page.document.querySelectorAll("ul")[0]!;
  const range = editRangeOf(page, list);
  assert.deepEqual([range.tagName, range.line, range.endLine], ["UL", 3, 18]);
  const keyboard = editRangeOf(page, list, true);
  assert.deepEqual([keyboard.tagName, keyboard.line, keyboard.endLine], ["UL", 3, 18], "the same from the keyboard");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("from the keyboard, an item opens on its lines and a block inside it opens on its own lines", async () => {
  const page = await renderMappedPage(CHAPTER, SOURCE_FILE, DOCUMENT_ID);
  const item = editRangeOf(page, page.document.querySelectorAll("li")[0]!, true);
  assert.deepEqual([item.tagName, item.line, item.endLine], ["LI", 3, 9]);
  const paragraph = editRangeOf(page, page.elementWithText("The system shall apply the brakes within 200 ms of a brake request."), true);
  assert.deepEqual([paragraph.tagName, paragraph.line, paragraph.endLine], ["P", 5, 6], "up to the next block of the item");
  const tight = await renderMappedPage(TIGHT_LIST, SOURCE_FILE, DOCUMENT_ID);
  const wrapped = tight.document.querySelectorAll("li")[1]!.querySelectorAll("p")[0]!;
  const tightParagraph = editRangeOf(tight, wrapped, true);
  assert.deepEqual([tightParagraph.line, tightParagraph.endLine], [2, 3], "a paragraph of a tight item keeps its wrapped line");
});

const ITEM_SHAPES = [
  "- a `code",
  "  span` end",
  "  third line",
  "- a",
  "  <div>",
  "  hi",
  "  </div>",
  "- a",
  "  <!-- c1",
  "  c2 -->",
  "  tail",
  "-",
  "  text",
  "",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S4
test("an item opens on all its lines whatever its content: an inline code span, an HTML block, a comment, an empty first line", async () => {
  const page = await renderMappedPage(ITEM_SHAPES, SOURCE_FILE, DOCUMENT_ID);
  const items = page.document.querySelectorAll("li");
  const expected: Array<[number, number]> = [[1, 3], [4, 7], [8, 11], [12, 13]];
  for (const [index, [from, to]] of expected.entries()) {
    const range = editRangeOf(page, items[index]!);
    assert.deepEqual([range.tagName, range.line, range.endLine], ["LI", from, to], `item ${index + 1}`);
  }
});
