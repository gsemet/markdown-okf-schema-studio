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
