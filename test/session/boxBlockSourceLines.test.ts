/**
 * The blocks inside an admonition or a GitHub alert that a directive builds: what a click, Enter,
 * an erased editor and the move chord act on. The document is rendered and mapped like the preview;
 * the lines come from `createMappedBlocks(...).editingElementFor` and from the move neighbour of
 * `installBlockMoves`, and go to the real `PreviewManager` over an in-memory document, like page
 * messages.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installBlockMoves } from "../../src/page/features/blockMoves";
import { createMappedBlocks } from "../../src/page/features/mappedBlocks";
import { MAPPINGS_SELECTOR } from "../../src/page/features/pageRuntime";
import { fixture } from "./blockFixture";
import { renderMappedPage, type MappedElement } from "./mappedHtmlDom";

const SOURCE_FILE = "/w/a.md";
const DOCUMENT_ID = "file:///w/a.md";

type Range = [number, number];
type Direction = "up" | "down";

const text = (...lines: string[]): string => `${lines.join("\n")}\n`;

/** Lines `from` to `to` (one-based, inclusive) of `source`, as the host returns them. */
const linesOf = (source: string, [from, to]: Range): string => text(...source.split("\n").slice(from - 1, to));

async function load(source: string) {
  const page = await renderMappedPage(source, SOURCE_FILE, DOCUMENT_ID);
  const context = { activeSourceFile: SOURCE_FILE, documentId: DOCUMENT_ID } as never;
  const blocks = createMappedBlocks(page.document as never, context);
  const moves = installBlockMoves({
    document: page.document, window: {}, context, host: {}, state: {}, tools: { blockSelection: {} }, blocks,
  } as never);
  const rangeOf = (element: MappedElement): Range => {
    const { line, endLine } = blocks.blockRange(element as never);
    return [line, endLine];
  };
  /** The box of rank `index`, in page order. */
  const box = (index = 0): MappedElement =>
    page.document.querySelectorAll(MAPPINGS_SELECTOR).filter((element) => element.matches(".admonition"))[index]!;
  const inner = (parent: MappedElement): MappedElement[] =>
    blocks.mappedChildren(parent as never) as unknown as MappedElement[];

  /** Clicks `target` (with `exact`, Enter on it once selected) and returns what the editor opens. */
  async function open(target: MappedElement, exact: boolean): Promise<{ range: Range; originalText: unknown }> {
    const mapped = target.closest(MAPPINGS_SELECTOR);
    assert.ok(mapped, "the target lands in a mapped block");
    const editing = blocks.editingElementFor(mapped as never, { exact });
    const element = editing.element as unknown as MappedElement;
    const range: Range = editing.sourceRange
      ? [editing.sourceRange.line, editing.sourceRange.endLine]
      : rangeOf(element);
    const run = fixture({ text: source });
    await run.send("previewEditOpen", { editId: "e1", line: range[0], endLine: range[1] });
    const [answer] = run.of("previewEditSource");
    assert.equal(answer?.error, undefined);
    return { range, originalText: answer?.originalText };
  }

  /** The move chord on `block`: the document after the move, or undefined when nothing is sent. */
  async function chord(block: MappedElement, direction: Direction): Promise<string | undefined> {
    const neighbour = moves.moveNeighbour(block as never, direction);
    if (!neighbour) return undefined;
    const own = blocks.blockRange(block as never);
    const other = blocks.blockRange(neighbour);
    const run = fixture({ text: source });
    await run.send("previewBlockMove", {
      line: own.line, endLine: own.endLine,
      neighbourLine: other.line, neighbourEndLine: other.endLine, direction,
    });
    assert.deepEqual(run.of("previewBlockMoveResult").map(({ ok, reason }) => [ok, reason]), [[true, undefined]]);
    return run.document.getText();
  }

  return { page, blocks, box, inner, rangeOf, open, chord };
}

/** The innermost first descendant of `element`: where a pointer over its content lands. */
function deepest(element: MappedElement): MappedElement {
  return element.children.length > 0 ? deepest(element.children[0]!) : element;
}

/**
 * `source` with the block at `first` and the block at `second`, below it, swapped. As the host
 * does, an empty line (`>` in a quote) separates a moved block from a line of text beside it.
 */
function swapped(source: string, first: Range, second: Range): string {
  const lines = source.split("\n");
  const empty = lines[0]!.startsWith(">") ? ">" : "";
  const gap = (line: string | undefined): string[] => (line ? (line === ">" ? [] : [empty]) : []);
  return [
    ...lines.slice(0, first[0] - 1),
    ...gap(lines[first[0] - 2]),
    ...lines.slice(second[0] - 1, second[1]),
    ...lines.slice(first[1], second[0] - 1),
    ...lines.slice(first[0] - 1, first[1]),
    ...gap(lines[second[1]]),
    ...lines.slice(second[1]),
  ].join("\n");
}

/** The direct blocks of the first box are the `ranges`; a click and Enter on each open it whole. */
async function assertWholeBlocks(source: string, ranges: Range[]): Promise<void> {
  const loaded = await load(source);
  const children = loaded.inner(loaded.box());
  assert.deepEqual(children.map(loaded.rangeOf), ranges);
  for (const [index, child] of children.entries()) {
    for (const [gesture, target, exact] of [["click", deepest(child), false], ["Enter", child, true]] as const) {
      const opened = await loaded.open(target, exact);
      assert.deepEqual(opened.range, ranges[index], `${gesture} on the block at line ${ranges[index]![0]}`);
      assert.equal(opened.originalText, linesOf(source, ranges[index]!), `${gesture} opens the source`);
    }
  }
}

/** The chord swaps every block of the first box with each of its two neighbours, whole. */
async function assertWholeMoves(source: string, ranges: Range[]): Promise<void> {
  const loaded = await load(source);
  const children = loaded.inner(loaded.box());
  assert.deepEqual(children.map(loaded.rangeOf), ranges);
  for (let index = 0; index + 1 < children.length; index += 1) {
    const expected = swapped(source, ranges[index]!, ranges[index + 1]!);
    assert.equal(await loaded.chord(children[index]!, "down"), expected, `down from line ${ranges[index]![0]}`);
    assert.equal(await loaded.chord(children[index + 1]!, "up"), expected, `up from line ${ranges[index + 1]![0]}`);
  }
  assert.equal(await loaded.chord(children[0]!, "up"), undefined, "no block above the first");
  assert.equal(await loaded.chord(children[children.length - 1]!, "down"), undefined, "no block below the last");
}

const NOTE_OF_DIRECTIVES = text(
  "::::{note}",
  "Before.",
  "",
  "```{mermaid}",
  "graph TD",
  "  A --> B",
  "```",
  "",
  "```{math}",
  "x = 1",
  "```",
  "",
  "```{code-block} python",
  ":caption: A caption",
  "print(1)",
  "print(2)",
  "```",
  "",
  "```{code-block} python",
  "print(3)",
  "```",
  "",
  "```{code} python",
  "print(4)",
  "```",
  "",
  "```{code-cell} python",
  "print(5)",
  "```",
  "",
  "$$",
  "y = 2",
  "$$",
  "",
  "```python",
  "print(6)",
  "```",
  "",
  "```mermaid",
  "graph LR",
  "  C --> D",
  "```",
  "",
  "After.",
  "::::",
);
const NOTE_RANGES: Range[] = [
  [2, 2], [4, 7], [9, 11], [13, 17], [19, 21], [23, 25], [27, 29], [31, 33], [35, 37], [39, 42], [44, 44],
];

const ALERT_OF_DIRECTIVES = text(
  "> [!NOTE]",
  "> Before.",
  ">",
  "> ```{mermaid}",
  "> graph TD",
  ">   A --> B",
  "> ```",
  ">",
  "> ```{math}",
  "> x = 1",
  "> ```",
  ">",
  "> ```{code-block} python",
  "> print(1)",
  "> ```",
  ">",
  "> $$",
  "> y = 2",
  "> $$",
  ">",
  "> ```python",
  "> print(6)",
  "> ```",
  ">",
  "> After.",
);
const ALERT_RANGES: Range[] = [[2, 2], [4, 7], [9, 11], [13, 15], [17, 19], [21, 23], [25, 25]];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click or Enter on a directive of an admonition opens the whole directive", async () => {
  await assertWholeBlocks(NOTE_OF_DIRECTIVES, NOTE_RANGES);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a click or Enter on a directive of a GitHub alert opens the whole directive", async () => {
  await assertWholeBlocks(ALERT_OF_DIRECTIVES, ALERT_RANGES);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("the chord moves a directive of an admonition, and a block past it, without cutting a fence", async () => {
  await assertWholeMoves(NOTE_OF_DIRECTIVES, NOTE_RANGES);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("the chord moves a directive of a GitHub alert, and a block past it, without cutting a fence", async () => {
  await assertWholeMoves(ALERT_OF_DIRECTIVES, ALERT_RANGES);
});

const TABLES_IN_A_NOTE = text(
  "::::{note}",
  "Before.",
  "",
  "```{list-table} A list table",
  "* - a",
  "  - b",
  "```",
  "",
  "```{csv-table} A csv table",
  "a,b",
  "1,2",
  "```",
  "",
  "After.",
  "::::",
);
const TABLE_RANGES: Range[] = [[2, 2], [4, 7], [9, 12], [14, 14]];

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("a {list-table} and a {csv-table} of an admonition are opened and moved as whole directives", async () => {
  await assertWholeBlocks(TABLES_IN_A_NOTE, TABLE_RANGES);
  await assertWholeMoves(TABLES_IN_A_NOTE, TABLE_RANGES);
});

const AMSMATH_IN_A_NOTE = text(
  "::::{note}",
  "Before.",
  "",
  "\\begin{equation}",
  "a = b",
  "\\end{equation}",
  "",
  "After.",
  "::::",
);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("a bare LaTeX environment of an admonition holds its closing line", async () => {
  await assertWholeBlocks(AMSMATH_IN_A_NOTE, [[2, 2], [4, 6], [8, 8]]);
  await assertWholeMoves(AMSMATH_IN_A_NOTE, [[2, 2], [4, 6], [8, 8]]);
});

const NESTED = text(
  ":::::{note}",
  "::::{warning} Nested one line",
  "::::",
  "",
  ":::{tip}",
  "- item",
  "",
  "  ```{mermaid}",
  "  graph TD",
  "  ```",
  "",
  "```{math}",
  ":label: eq",
  "",
  "x = 1",
  "```",
  ":::",
  "",
  "After.",
  ":::::",
);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
test("in nested admonitions, a directive opens whole, in a list item too", async () => {
  const loaded = await load(NESTED);
  const outer = loaded.box();
  assert.deepEqual(loaded.inner(outer).map(loaded.rangeOf), [[2, 3], [5, 17], [19, 19]]);
  const [warning, tip] = loaded.inner(outer);
  assert.deepEqual(loaded.inner(warning!), [], "the body on the opening line is no block of its own");
  assert.deepEqual((await loaded.open(deepest(warning!), false)).range, [2, 3]);
  const [list, math] = loaded.inner(tip!);
  assert.deepEqual(loaded.rangeOf(math!), [12, 16]);
  assert.deepEqual((await loaded.open(deepest(math!), false)).range, [12, 16]);
  const mermaid = list!.querySelectorAll(MAPPINGS_SELECTOR).find((element) => loaded.rangeOf(element)[0] === 8)!;
  assert.deepEqual((await loaded.open(mermaid, true)).range, [8, 10]);
  assert.equal(await loaded.chord(warning!, "down"), swapped(NESTED, [2, 3], [5, 17]), "the one-line warning moves");
});

const CALLOUTS = text(
  "::::{note}",
  "::: {.callout-tip}",
  "Callout body.",
  ":::",
  "",
  "After.",
  "::::",
  "",
  "> [!NOTE]",
  "> ::: {.callout-tip}",
  "> In an alert.",
  "> :::",
);

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a callout inside an admonition or an alert spans its two fence lines", async () => {
  const loaded = await load(CALLOUTS);
  for (const [parent, range] of [[0, [2, 4]], [2, [10, 12]]] as const) {
    const callout = loaded.inner(loaded.box(parent))[0]!;
    assert.deepEqual(loaded.rangeOf(callout), range);
    assert.equal((await loaded.open(callout, false)).originalText, linesOf(CALLOUTS, [...range]));
  }
});

const ONE_LINE_BODIES = [
  ["a colon {warning}", ":::{warning} Text on the opening line", ":::"],
  ["a backtick {note}", "```{note} Text on the opening line", "```"],
  ["a {seealso}", ":::{seealso} Text on the opening line", ":::"],
] as const;

for (const [name, opening, closing] of ONE_LINE_BODIES) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  test(`the body written on the opening line of ${name} opens the whole directive`, async () => {
    const source = text(opening, closing, "", "After.");
    const loaded = await load(source);
    assert.deepEqual(loaded.inner(loaded.box()), [], "the body is no block of its own");
    const body = loaded.page.elementWithText("Text on the opening line");
    for (const exact of [false, true]) {
      const opened = await loaded.open(body, exact);
      assert.deepEqual(opened.range, [1, 2]);
      assert.equal(opened.originalText, linesOf(source, [1, 2]));
    }
    assert.equal(await loaded.chord(body.closest(MAPPINGS_SELECTOR)!, "up"), undefined);

    const run = fixture({ text: source });
    await run.send("previewEditSave", {
      editId: "e1", line: 1, endLine: 2, originalText: linesOf(source, [1, 2]),
      editedText: "", final: true, deleteWhenEmpty: true,
    });
    assert.equal(run.document.getText(), "After.\n", "erasing it removes both fence lines");
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-260#S7
test("a table caption and a card title written on an opening line are no blocks of their own", async () => {
  const source = text(
    "::::::{note}",
    "```{table} Table caption",
    "| a |",
    "| - |",
    "```",
    "",
    "```{card} Card title",
    "Card body.",
    "```",
    "::::::",
  );
  const loaded = await load(source);
  const leaves = (element: MappedElement): MappedElement[] =>
    element.children.length > 0 ? element.children.flatMap(leaves) : [element];
  const byText = (value: string): MappedElement =>
    leaves(loaded.page.document).find((element) => element.textContent.trim() === value)!;
  assert.deepEqual((await loaded.open(byText("Table caption"), false)).range, [1, 10], "the admonition around it");
  assert.deepEqual((await loaded.open(byText("Card title"), false)).range, [7, 9], "the whole card");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-MYST-001#S4
test("the body of a version admonition opens its own lines, wherever it starts", async () => {
  const source = text(
    "```{versionadded} 1.0",
    "",
    "After one blank.",
    "```",
    "",
    "```{versionchanged} 2.0",
    "",
    "",
    "After two blanks.",
    "```",
    "",
    "```{deprecated} 2.0",
    ":class: x",
    "",
    "After the option.",
    "```",
  );
  const loaded = await load(source);
  for (const [body, line] of [["After one blank.", 3], ["After two blanks.", 9], ["After the option.", 15]] as const) {
    const opened = await loaded.open(loaded.page.elementWithText(body), false);
    assert.deepEqual(opened.range, [line, line], body);
    assert.equal(opened.originalText, `${body}\n`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-MYST-001#S4
test("a version admonition body whose source lines cannot be found opens the whole directive", async () => {
  const source = text(
    "```{deprecated} 2.0",
    "---",
    "class: x",
    "---",
    "Under a block of options.",
    "```",
  );
  const loaded = await load(source);
  const opened = await loaded.open(loaded.page.elementWithText("Under a block of options."), false);
  assert.deepEqual(opened.range, [1, 6]);
});
