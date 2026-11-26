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

  /** The move chord on `block`: the host's answers and the document, or undefined when nothing is sent. */
  async function sendChord(block: MappedElement, direction: Direction) {
    const neighbour = moves.moveNeighbour(block as never, direction);
    if (!neighbour) return undefined;
    const own = blocks.blockRange(block as never);
    const other = blocks.blockRange(neighbour);
    const run = fixture({ text: source });
    await run.send("previewBlockMove", {
      line: own.line, endLine: own.endLine,
      neighbourLine: other.line, neighbourEndLine: other.endLine, direction,
    });
    const answers = run.of("previewBlockMoveResult").map(({ ok, reason }) => [ok, reason]);
    return { answers, document: run.document.getText() };
  }

  /** The move chord on `block`: the document after the move, or undefined when nothing is sent. */
  async function chord(block: MappedElement, direction: Direction): Promise<string | undefined> {
    const sent = await sendChord(block, direction);
    if (sent) assert.deepEqual(sent.answers, [[true, undefined]]);
    return sent?.document;
  }

  return { page, blocks, box, inner, rangeOf, open, sendChord, chord };
}

/** The innermost first descendant of `element`: where a pointer over its content lands. */
function deepest(element: MappedElement): MappedElement {
  return element.children.length > 0 ? deepest(element.children[0]!) : element;
}

/** The childless element under `root` whose trimmed text is `value`. */
function leafReading(root: MappedElement, value: string): MappedElement {
  const leaves = (element: MappedElement): MappedElement[] =>
    element.children.length > 0 ? element.children.flatMap(leaves) : [element];
  const found = leaves(root).find((element) => element.textContent.trim() === value);
  assert.ok(found, `an element reads "${value}"`);
  return found;
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

const TABLE_DIRECTIVE = ["```{table}", "| a |", "| - |", "| 1 |", "```"] as const;

for (const [name, opening] of [["with a caption", "```{table} Caption"], ["without a caption", "```{table}"]] as const) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
  test(`neither a {table} ${name} of an admonition or an alert nor its neighbour moves past it`, async () => {
    const body = ["Before.", "", opening, ...TABLE_DIRECTIVE.slice(1), "", "After.", "", "Last."];
    for (const source of [
      text("::::{note}", ...body, "::::"),
      text("> [!NOTE]", ...body.map((line) => (line ? `> ${line}` : ">"))),
    ]) {
      const loaded = await load(source);
      const children = loaded.inner(loaded.box());
      assert.deepEqual(children.map(loaded.rangeOf), [[2, 2], [5, 7], [10, 10], [12, 12]], source);
      const [before, table, after, last] = children;
      for (const [block, direction] of [[table, "up"], [table, "down"], [before, "down"], [after, "up"]] as const) {
        assert.equal(await loaded.chord(block!, direction), undefined, `${direction} next to the table: ${source}`);
      }
      assert.equal(await loaded.chord(after!, "down"), swapped(source, [10, 10], [12, 12]), "away from it, a move");
      assert.equal(await loaded.chord(last!, "up"), swapped(source, [10, 10], [12, 12]), "away from it, a move");
    }
  });
}

const CARD_WITH_OPTIONS = [
  "```{card} Card title",
  ":header: Card header",
  ":footer: Card footer",
  "",
  "Card body.",
  "```",
] as const;

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-260#S7
test("in an admonition or an alert, a card title opens the whole card, its header and footer their lines", async () => {
  for (const source of [
    text("::::{note}", ...CARD_WITH_OPTIONS, "::::"),
    text("> [!NOTE]", ...CARD_WITH_OPTIONS.map((line) => (line ? `> ${line}` : ">"))),
  ]) {
    const loaded = await load(source);
    for (const [value, range] of [
      ["Card title", [2, 7]], ["Card header", [3, 3]], ["Card footer", [4, 4]],
    ] as const) {
      const opened = await loaded.open(leafReading(loaded.page.document, value), false);
      assert.deepEqual(opened.range, range, `${value}: ${source}`);
      assert.equal(opened.originalText, linesOf(source, [...range]), `${value} opens the source`);
    }
  }
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

/** Admonitions left open at the end of the file, whose last line closes a directive inside. */
const UNCLOSED_AROUND_A_DIRECTIVE = [
  ["a {mermaid} of backticks in a colon admonition", ":::{note}", "```{mermaid}", "graph TD", "```"],
  ["a {math} shorter than the backtick admonition", "````{note}", "```{math}", "x = 1", "```"],
] as const;

for (const [name, admonition, ...directive] of UNCLOSED_AROUND_A_DIRECTIVE) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
  test(`in an unclosed admonition, ${name} that ends the file is a block of its own`, async () => {
    const source = text(admonition, "Before.", "", ...directive);
    await assertWholeBlocks(source, [[2, 2], [4, 6]]);
    await assertWholeMoves(source, [[2, 2], [4, 6]]);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("in an unclosed admonition, a shorter or an indented admonition that ends the file keeps its blocks", async () => {
  for (const source of [
    text("::::{note}", "Before.", "", ":::{tip}", "Inner.", ":::"),
    text(":::{note}", "- item", "", "    :::{tip}", "    Inner.", "    :::"),
  ]) {
    const loaded = await load(source);
    const tip = loaded.box(1);
    assert.deepEqual(loaded.rangeOf(tip), [4, 6], source);
    assert.deepEqual((await loaded.open(tip, false)).range, [4, 6], source);
    assert.deepEqual((await loaded.open(loaded.page.elementWithText("Inner."), false)).range, [5, 5], source);
  }
});

const CODE_AT_THE_END = [
  ["a code block", "```python"],
  ["a {code-block}", "```{code-block} python"],
] as const;

for (const [name, opening] of CODE_AT_THE_END) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-130#S8
  test(`${name} that ends an unclosed admonition keeps all its lines`, async () => {
    const source = text(":::{note}", "Before.", "", opening, "print(1)", "print(2)", "```");
    await assertWholeBlocks(source, [[2, 2], [4, 7]]);
    await assertWholeMoves(source, [[2, 2], [4, 7]]);
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
  const byText = (value: string): MappedElement => leafReading(loaded.page.document, value);
  assert.deepEqual((await loaded.open(byText("Table caption"), false)).range, [1, 10], "the admonition around it");
  assert.deepEqual((await loaded.open(byText("Card title"), false)).range, [7, 9], "the whole card");
});

/** A block of a list item with a directive of the item around it or after it, and its own lines. */
const BESIDE_A_NESTED_DIRECTIVE = [
  ["the text of an item above a captioned {table}", "Step one", [2, 3],
    ["- Step one", "", "  ```{table} Caption", "  | a |", "  | - |", "  ```"]],
  ["a {figure} caption in a list", "Caption text", [5, 5],
    ["- item", "", "  ```{figure} x.png", "  Caption text", "  ```", "", "- next item"]],
  ["the body of a {card} in a list", "Card body.", [5, 5],
    ["- item", "", "  ```{card} Card title", "  Card body.", "  ```"]],
  ["the wrapped text of a tight item above a {note}", "Step one", [2, 3],
    ["- Step one", "  wrapped", "  ```{note}", "  Nested.", "  ```"]],
] as const;

for (const [name, value, range, body] of BESIDE_A_NESTED_DIRECTIVE) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`in an admonition or an alert, Enter on ${name} opens and erases no fence line`, async () => {
    for (const source of [
      text("::::{note}", ...body, "::::", "", "After."),
      text("> [!NOTE]", ...body.map((line) => (line ? `> ${line}` : ">")), "", "After."),
    ]) {
      const loaded = await load(source);
      const block = loaded.page.document.querySelectorAll(MAPPINGS_SELECTOR)
        .filter((element) => element.textContent.trim().startsWith(value)).at(-1)!;
      const opened = await loaded.open(block, true);
      assert.deepEqual(opened.range, [...range], source);
      assert.equal(opened.originalText, linesOf(source, [...range]), source);

      const run = fixture({ text: source });
      await run.send("previewEditSave", {
        editId: "e1", line: range[0], endLine: range[1], originalText: opened.originalText,
        editedText: "", final: true, deleteWhenEmpty: true,
      });
      const fences = (document: string): string[] => document.split("\n").filter((line) => /```|:::/u.test(line));
      assert.notEqual(run.document.getText(), source, "the block is erased");
      assert.deepEqual(fences(run.document.getText()), fences(source), `every fence line stays: ${source}`);
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("in an admonition, text after a code block of a tight item opens that item", async () => {
  const source = text(
    ":::{note}",
    "- item",
    "  - sub",
    "    ```python",
    "    x",
    "    ```",
    "    after code",
    "    more after",
    "- last",
    ":::",
  );
  const loaded = await load(source);
  const after = loaded.page.document.querySelectorAll("li")
    .find((element) => element.textContent.trim().startsWith("sub"))!;
  const paragraphs = after.children.filter((element) => element.textContent.includes("after code"));
  assert.equal(paragraphs.length, 1);
  assert.deepEqual((await loaded.open(deepest(paragraphs[0]!), true)).range, [3, 8]);
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

/** A formula of a list item that the parser gives no lines: the item, and the formula's lines in it. */
const FORMULAS_WITHOUT_LINES = [
  ["after the text of a tight item", [2, 4], ["- Text", "  $$", "  y = 2", "  $$"]],
  ["after the text of a loose item", [2, 4], ["- Text", "  $$", "  y = 2", "  $$", "", "- next"]],
  ["after a quote", [4, 6], ["- Text", "", "  > quoted", "  $$", "  y = 2", "  $$"]],
  ["after a code block and text", [6, 8],
    ["- Text", "  ```py", "  x", "  ```", "  tail", "  $$", "  y = 2", "  $$"]],
  ["written on one line", [2, 2], ["- Text", "  $$ y = 2 $$", "", "- next"]],
  ["with a label", [2, 4], ["- Text", "  $$", "  y = 2", "  $$ (label)", "", "- next"]],
  ["between two texts", [2, 4], ["- Text", "  $$", "  y = 2", "  $$", "  after"]],
  ["of a nested item", [3, 5], ["- Text", "  - sub", "    $$", "    y = 2", "    $$"]],
] as const;

for (const [name, [from, to], body] of FORMULAS_WITHOUT_LINES) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`in an admonition or an alert, a formula ${name} opens only lines that hold all of it`, async () => {
    for (const source of [
      text(":::{note}", ...body, ":::", "", "After."),
      text("> [!NOTE]", ...body.map((line) => (line ? `> ${line}` : ">")), "", "After."),
    ]) {
      const formula: Range = [from + 1, to + 1];
      const loaded = await load(source);
      const rendered = loaded.page.document.querySelectorAll(".math-display");
      assert.equal(rendered.length, 1, source);
      for (const exact of [false, true]) {
        const { range } = await loaded.open(rendered[0]!, exact);
        assert.ok(range[0] <= formula[0] && range[1] >= formula[1], `${range.join("-")}: ${source}`);
      }
      for (const block of loaded.page.document.querySelectorAll(MAPPINGS_SELECTOR)) {
        const [line, endLine] = loaded.rangeOf(block);
        const apart = endLine < formula[0] || line > formula[1];
        const whole = line <= formula[0] && endLine >= formula[1];
        assert.ok(apart || whole, `<${block.tagName} ${line}-${endLine}> cuts the formula: ${source}`);
      }
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("in an admonition, a paragraph of an item keeps its lines above a closing HTML tag", async () => {
  for (const gap of [[""], []]) {
    const source = text(
      ":::{note}", "- Step one", "  <details>", "  <summary>More</summary>", "", "  Inside.", ...gap,
      "  </details>", "  <div>", "  Last.", "  </div>", ":::",
    );
    const loaded = await load(source);
    const paragraph = loaded.page.elementWithText("Inside.");
    const opened = await loaded.open(paragraph, true);
    const lines: Range = [6, 6 + gap.length];
    assert.deepEqual(opened.range, lines, source);
    assert.equal(opened.originalText, linesOf(source, lines));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("a formula directly in the body of a box, with text after it, opens its own line", async () => {
  for (const [opening, line] of [[[":::{note}"], 4], [[":::{div}", ":class: callout-tip", ""], 6]] as const) {
    const source = text(...opening, "Before.", "", "***", "$$ y = 2 $$ after", ":::");
    const loaded = await load(source);
    const rendered = loaded.page.document.querySelectorAll(".math-display");
    for (const exact of [false, true]) {
      assert.deepEqual((await loaded.open(rendered[0]!, exact)).range, [line + 1, line + 1], source);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("a formula with text after it, first in a paragraph of two lines, opens no part of the paragraph", async () => {
  const body = ["$$ y = 2 $$ after", "more words"];
  for (const [source, from] of [
    [text(":::{note}", "Before.", "", "***", ...body, ":::"), 5],
    [text("::::{note}", "- Item", "", "  :::{tip}", ...body.map((line) => `  ${line}`), "  :::", "::::"), 5],
  ] as const) {
    const loaded = await load(source);
    const rendered = loaded.page.document.querySelectorAll(".math-display");
    for (const exact of [false, true]) {
      const { range } = await loaded.open(rendered[0]!, exact);
      assert.ok(range[0] <= from && range[1] >= from + 1, `${range.join("-")}: ${source}`);
    }
  }
});

/**
 * Boxes written with a `---` block of options and a later `---` line in the body, where the renderer
 * maps the body one line down, with the lines of the innermost box that holds them.
 */
const SHIFTED_BODIES = [
  ["a note", text(":::{note}", "---", "class: x", "---", "Alpha", "", "---", ":::"), [1, 8]],
  ["a dropdown", text(":::{dropdown} T", "---", "open:", "---", "Alpha", "", "---", ":::"), [1, 8]],
  ["a callout, the line inside code",
    text(":::{div}", "---", "class: callout-tip", "---", "Alpha", "", "```", "---", "```", ":::"), [1, 10]],
  ["a quoted note", text("> :::{note}", "> ---", "> class: x", "> ---", "> Alpha", ">", "> ---", "> :::"), [1, 8]],
  ["a nested tip", text("::::{note}", ":::{tip}", "---", "class: x", "---", "Alpha", "", "---", ":::", "::::"), [2, 9]],
] as const;

for (const [name, source, box] of SHIFTED_BODIES) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`a body mapped one line down opens its whole box: ${name}`, async () => {
    const loaded = await load(source);
    const paragraph = loaded.page.elementWithText("Alpha");
    for (const exact of [false, true]) {
      assert.deepEqual((await loaded.open(paragraph, exact)).range, box);
    }
  });
}

/** Inline HTML under another block of a definition, with the line it is written on. */
const WRAPPED_HTML = [
  ["after a rule", 6, ["  : ***", "    <span>kept</span> words"]],
  ["after a code block", 8, ["  : ~~~", "    x", "    ~~~", "    <span>kept</span> words"]],
  ["after another tag", 7, ["  : ***", "    <b>bold</b>", "    <span>kept</span>"]],
] as const;

for (const [name, line, definition] of WRAPPED_HTML) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`in an admonition, inline HTML of a definition ${name} opens only lines that hold it`, async () => {
    const source = text(":::{note}", "- Text", "", "  Term", ...definition, "- next", ":::");
    const loaded = await load(source);
    const span = loaded.page.document.querySelectorAll("span")
      .find((element) => element.textContent.trim() === "kept")!;
    for (const target of [span, span.parentElement!]) {
      const { range } = await loaded.open(target, true);
      assert.ok(range[0] <= line && range[1] >= line, `${range.join("-")}: ${source}`);
    }
  });
}

/**
 * A `<details>` of a list item whose closing tag has more HTML right under it, so the renderer does
 * not pair its tags: what stands above it in the box, its summary, and its first and last lines.
 */
const UNPAIRED_DETAILS = [
  ["above a table", "Table", [3, 8], [
    "<details>", "<summary>Table</summary>", "", "word", "", "</details>",
    "<table>", "<tr><td>cell</td></tr>", "</table>",
  ]],
  ["under another one", "Second", [9, 14], [
    "<details>", "<summary>First</summary>", "", "one", "", "</details>",
    "<details>", "<summary>Second</summary>", "", "two", "", "</details>",
  ]],
] as const;

for (const [name, summary, [from, to], body] of UNPAIRED_DETAILS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`in an admonition, a details element ${name} opens only lines that hold all of it`, async () => {
    const quoted = body.map((line) => (line ? `  > ${line}` : "  >"));
    const source = text("::::{note}", "- Text", ...quoted, "- next", "::::");
    const loaded = await load(source);
    const title = leafReading(loaded.box(), summary);
    // From the keyboard, which reaches a block inside a list item.
    const opened = await loaded.open(title, true);
    assert.ok(opened.range[0] <= from && opened.range[1] >= to, `${opened.range.join("-")}: ${source}`);
  });
}

/**
 * No click or Enter inside a box of `loaded` opens one line of the pair `tags` without the other;
 * returns the opened ranges.
 */
async function assertKeepsTags(loaded: Awaited<ReturnType<typeof load>>, tags: Range, source: string): Promise<void> {
  const all = (element: MappedElement): MappedElement[] => [element, ...element.children.flatMap(all)];
  for (const element of all(loaded.box())) {
    for (const exact of [false, true]) {
      if (!element.closest(MAPPINGS_SELECTOR)) continue;
      const { range: [line, endLine] } = await loaded.open(element, exact);
      const [open, close] = tags.map((tag) => line <= tag && tag <= endLine);
      assert.equal(open, close, `<${element.tagName}> opens ${line}-${endLine}: ${source}`);
    }
  }
}

/** A one-line block of a list item, above a closing HTML tag. */
const BLOCKS_ABOVE_TAGS = [
  ["a heading", "### Head"], ["a thematic break", "***"], ["a quote", "> Head"], ["a formula", "$$ y = 2 $$"],
] as const;

for (const [name, block] of BLOCKS_ABOVE_TAGS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`in an admonition, ${name} of an item above a closing HTML tag leaves the tag`, async () => {
    for (const tag of ["details", "div"]) {
      for (const gap of [[""], []]) {
        const source = text(
          ":::{note}", "- Step", "", `  <${tag}>`, "  <summary>More</summary>", "", `  ${block}`, ...gap,
          `  </${tag}>`, "", "- next", ":::",
        );
        const closing = 9 + gap.length;
        const loaded = await load(source);
        await assertKeepsTags(loaded, [4, closing], source);
        const own = loaded.page.document.querySelectorAll("h3, hr, blockquote, .math-display")[0]!;
        const { range } = await loaded.open(own, true);
        assert.deepEqual(range, [7, 7 + gap.length], source);
      }
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("in an admonition, text right under a closing HTML tag does not open with that tag", async () => {
  for (const source of [
    text(":::{note}", "<div>", "", "Inside.", "", "</div>", "Under.", ":::"),
    text(":::{note}", "- Step", "", "  <div>", "", "  Inside.", "", "  </div>", "  ***", "", "- next", ":::"),
  ]) {
    const lines = source.split("\n");
    const tags: Range = [
      lines.findIndex((line) => line.includes("<div>")) + 1, lines.findIndex((line) => line.includes("</div>")) + 1,
    ];
    await assertKeepsTags(await load(source), tags, source);
  }
});

/** Elements whose tag lines the preview does not pair as the source writes them. */
const MISPAIRED_TAGS: ReadonlyArray<readonly [string, readonly Range[], readonly string[]]> = [
  ["a closing tag written right above a table", [[2, 7], [8, 10]], [
    "<details>", "<summary>More</summary>", "", "word", "", "</details>",
    "<table>", "<tr><td>cell</td></tr>", "</table>",
  ]],
  ["a details element inside another one", [[4, 13], [7, 9]], [
    "Before.", "", "<details>", "<summary>More</summary>", "", "<details><summary>Inner</summary>", "Words",
    "</details>", "$$", "y = 2", "$$", "</details>",
  ]],
  ["an element of a list item closed after a picture that ends the list", [[5, 15]], [
    "Before.", "", "- Step", "  <details>", "  <summary>More</summary>", "", "  Words", "  and more", "",
    "  <svg viewBox=\"0 0 1 1\">", "  <title>Mark</title>", "  </svg>", "", "  </details>", "- next",
  ]],
];

for (const [name, pairs, body] of MISPAIRED_TAGS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`in an admonition, with ${name}, nothing opens one tag line without the other`, async () => {
    const source = text(":::{note}", ...body, ":::");
    const loaded = await load(source);
    for (const tags of pairs) await assertKeepsTags(loaded, [...tags], source);
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("directly in a box body, a formula in a table row opens the table", async () => {
  const source = text(":::{note}", "| a | b |", "| --- | --- |", "| 1 | 2 |", "$$ y = 2 $$ more", ":::");
  const loaded = await load(source);
  const formula = loaded.page.document.querySelectorAll(".math-display")[0]!;
  for (const exact of [false, true]) {
    assert.deepEqual((await loaded.open(formula, exact)).range, [2, 5], source);
  }
});

/** Formulas directly in a box body that the parser gives no lines of their own. */
const BODY_FORMULAS = [
  ["under text", [3, 5], ["Before.", "$$", "y = 2", "$$"]],
  ["under text, written on one line", [3, 3], ["Before.", "$$ y = 2 $$"]],
  ["under two lines of text", [4, 6], ["Before.", "More.", "$$", "y = 2", "$$"]],
  ["after a block break", [3, 5], ["+++", "$$", "y = 2", "$$"]],
  ["on two lines under a field list", [3, 4], [":name: value", "$$ y", "= 2 $$"]],
] as const;

/** The opening lines of a note, an alert and a callout, around `body`. */
const AROUND_BODY = [
  (body: readonly string[]) => [":::{note}", ...body, ":::"],
  (body: readonly string[]) => ["> [!NOTE]", ...body.map((line) => (line ? `> ${line}` : ">"))],
  (body: readonly string[]) => [":::{div}", ":class: callout-tip", "", ...body, ":::"],
];

for (const [name, [from, to], body] of BODY_FORMULAS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
  test(`directly in a box body, a formula ${name} opens only lines that hold all of it`, async () => {
    for (const [index, around] of AROUND_BODY.entries()) {
      const source = text(...around(body), "", "After.");
      const shift = index === 2 ? 2 : 0;
      const formula: Range = [from + shift, to + shift];
      const loaded = await load(source);
      const rendered = loaded.page.document.querySelectorAll(".math-display");
      assert.equal(rendered.length, 1, source);
      for (const exact of [false, true]) {
        const { range } = await loaded.open(rendered[0]!, exact);
        assert.ok(range[0] <= formula[0] && range[1] >= formula[1], `${range.join("-")}: ${source}`);
      }
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-254#S3
test("directly in a box body, an unpaired details element opens only lines that hold all of it", async () => {
  const body = [
    "<details>", "<summary>Table</summary>", "", "word", "", "</details>",
    "<table>", "<tr><td>cell</td></tr>", "</table>",
  ];
  for (const [index, around] of AROUND_BODY.entries()) {
    const source = text(...around(body), "", "After.");
    const shift = index === 2 ? 4 : 2;
    const loaded = await load(source);
    const summary = leafReading(loaded.page.document.querySelectorAll("details")[0]!, "Table");
    const { range } = await loaded.open(summary, true);
    assert.ok(range[0] <= shift && range[1] >= shift + 5, `${range.join("-")}: ${source}`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014#S3
test("a callout opens from its opening fence to its closing fence", async () => {
  for (const opening of [[":::{div}", ":class: callout-tip", ""], ["::: {.callout-tip}"]]) {
    const source = text(...opening, "Before.", "", "Last.", ":::", "", "After.");
    const loaded = await load(source);
    const whole: Range = [1, opening.length + 4];
    assert.deepEqual((await loaded.open(loaded.box(), false)).range, whole, source);
    assert.deepEqual(loaded.rangeOf(loaded.box()), whole, source);
    const paragraph = loaded.page.elementWithText("Last.");
    const line = opening.length + 3;
    assert.deepEqual((await loaded.open(paragraph, true)).range, [line, line], source);
  }
});

const HIDDEN_BODY = "A --- line cannot start an admonition or an alert: its content would not show.";
const TAKEN_AS_TITLE = "A heading cannot start this admonition: it would become its title.";

/** Boxes whose second block may not become the first, with the reason. */
const REFUSED_FIRST_BLOCKS = [
  ["a colon note, ---", text(":::{note}", "Before.", "", "---", "", "After.", ":::"), HIDDEN_BODY],
  ["a backtick warning with a title, ----", text("```{warning} T", "Before.", "", "----", "```"), HIDDEN_BODY],
  ["a dropdown, ---", text(":::{dropdown} T", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a version admonition, ---", text(":::{versionadded} 1.0", "", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a note with a block of options, a heading",
    text(":::{note}", "---", "class: x", "---", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a note with a body on its opening line, ---", text(":::{note} Text", "", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a note in a list item, ---", text("- item", "", "  :::{note}", "  Before.", "", "  ---", "  :::"), HIDDEN_BODY],
  ["a GitHub alert, ---", text("> [!NOTE]", "> Before.", ">", "> ---"), HIDDEN_BODY],
  ["a bold-marker alert, ---", text("> **Warning**", "> Before.", ">", "> ---"), HIDDEN_BODY],
  ["a colon note, a heading", text(":::{note}", "Before.", "", "## Head", ":::"), TAKEN_AS_TITLE],
  ["a backtick tip with options, an underlined heading",
    text("```{tip}", ":class: x", "", "Before.", "", "Head", "====", "```"), TAKEN_AS_TITLE],
  ["a bare {admonition}, a heading", text(":::{admonition}", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a callout with a title, a heading", text("::: {.callout-tip title=\"T\"}", "Before.", "", "# Head", ":::"),
    TAKEN_AS_TITLE],
  ["a {div} with a :class: option, ---",
    text(":::{div}", ":class: callout-tip", "", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a {div} with a second :class: option, a heading",
    text(":::{div}", ":name: n", ":class: x callout-tip", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a {div} with a block of options, a heading",
    text(":::{div}", "---", "name: n", "class: \"x callout-tip\"", "---", "Before.", "", "# Head", ":::"),
    TAKEN_AS_TITLE],
  ["a {div} with a folded class in a block of options, a heading",
    text(":::{div}", "---", "class: >", "  callout-tip", "---", "", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a quoted {div} with a :class: option, ---",
    text("> :::{div}", "> :class: callout-tip", ">", "> Before.", ">", "> ---", "> :::"), HIDDEN_BODY],
  ["a {div} with a class= attribute, a heading",
    text(":::{div class=\"x callout-tip\"}", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["an attribute-only opening with a :class: option, ---",
    text(":::{#a}", ":class: callout-tip", "", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a { note } written with spaces, a heading", text(":::{ note }", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a {note .x} with a class, ---", text(":::{note .x}", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a bare { admonition }, a heading", text(":::{ admonition }", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a {VersionAdded} in capitals, ---", text(":::{VersionAdded} 1.0", "", "Before.", "", "---", ":::"), HIDDEN_BODY],
  ["a {div} whose block of options lists its class, a heading",
    text(":::{div}", "---", "class: [callout-tip]", "---", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a {div} whose block of options lists its class on a line, a heading",
    text(":::{div}", "---", "class:", "  - callout-tip", "---", "", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a {div} whose class is written with a YAML escape, a heading",
    text(":::{div}", "---", "class: \"call\\x6Fut-tip\"", "---", "Before.", "", "# Head", ":::"), TAKEN_AS_TITLE],
  ["a {div} whose class comes from a YAML alias, a heading",
    text(":::{div}", "---", "name: &c callout-tip", "class: *c", "---", "Before.", "", "# Head", ":::"),
    TAKEN_AS_TITLE],
] as const;

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-124#S7
for (const [name, source, reason] of REFUSED_FIRST_BLOCKS) {
  test(`the chord is refused when it would start a box with a block that spoils it: ${name}`, async () => {
    const loaded = await load(source);
    const [first, second] = loaded.inner(loaded.box());
    for (const [block, direction] of [[first!, "down"], [second!, "up"]] as const) {
      assert.deepEqual(await loaded.sendChord(block, direction),
        { answers: [[false, reason]], document: source }, direction);
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-124#S7
test("the chord is also refused in a {div} whose options name a callout class that it does not get", async () => {
  const source = text(":::{div}", ":name: callout-ref", "", "Before.", "", "# Head", ":::");
  const loaded = await load(source);
  const first = loaded.page.elementWithText("Before.");
  assert.deepEqual(await loaded.sendChord(first, "down"),
    { answers: [[false, TAKEN_AS_TITLE]], document: source });
});

/** Moves that give a rule or a heading a first place that renders it: the lines of the two blocks. */
const ACCEPTED_FIRST_BLOCKS = [
  ["*** in a note", text(":::{note}", "Before.", "", "***", ":::"), 2, 4],
  ["an indented --- in a note", text(":::{note}", "Before.", "", " ---", ":::"), 2, 4],
  ["a heading in a warning with a title", text(":::{warning} T", "Before.", "", "# Head", ":::"), 2, 4],
  ["a heading in a dropdown", text(":::{dropdown}", "Before.", "", "# Head", ":::"), 2, 4],
  ["a heading in a GitHub alert", text("> [!NOTE]", "> Before.", ">", "> # Head"), 2, 4],
  ["a heading under a body on the opening line", text(":::{note} Text", "", "Before.", "", "# Head", ":::"), 3, 5],
  ["--- under a comment", text(":::{note}", "<!-- c -->", "Before.", "", "---", ":::"), 3, 5],
  ["--- under a link definition",
    text(":::{note}", "[a]: http://example.com", "", "Before.", "", "---", ":::"), 4, 6],
  ["--- at the top level, under a closed note", text(":::{note}", "In.", ":::", "", "Before.", "", "---"), 5, 7],
  ["a heading in a {div} that is no callout",
    text(":::{div}", ":class: wide", "", "Before.", "", "# Head", ":::"), 4, 6],
  ["a heading in a {div} whose argument names a callout",
    text(":::{div} callout-tip", "Before.", "", "# Head", ":::"), 2, 4],
] as const;

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-124#S7
test("the chord still moves a rule or a heading to a first place that renders it", async () => {
  for (const [name, source, upper, lower] of ACCEPTED_FIRST_BLOCKS) {
    const run = fixture({ text: source });
    await run.send("previewBlockMove", {
      line: lower, endLine: lower, neighbourLine: upper, neighbourEndLine: upper, direction: "up",
    });
    assert.deepEqual(run.of("previewBlockMoveResult").map(({ ok, reason }) => [ok, reason]), [[true, undefined]], name);
    assert.equal(run.document.getText(), swapped(source, [upper, upper], [lower, lower]), name);
  }
});
