import * as assert from "node:assert/strict";
import { test } from "node:test";

import { blankRunIndent, startsDefinitionEntry, startsFootnoteDefinition } from "../../../src/core/mapping/blankRunContainer";
import { blankRuns, quoteBlankRuns } from "../../../src/core/mapping/blankRuns";

/** CR-462, section 4: the indent a block written in place of a run takes, every row of the examples table. */
const EOLS = [["LF", "\n"], ["CRLF", "\r\n"], ["CR", "\r"]] as const;
const join = (eol: string, entries: string[]): string => entries.join(eol);

interface Row {
  name: string;
  lines: string[];
  /** The run: the first quote run, or else the first plain run of the text. */
  itemLine?: number;
  containerLine?: number;
  quote: string;
  content: string;
  sibling?: { kind: "item" | "definition" | "footnote"; indent: string };
}

const ROWS: Row[] = [
  { name: "a quote", lines: ["> a", ">", ">", "> b"], quote: "> ", content: "" },
  { name: "a quote at the start of the file", lines: [">", ">", "> b"], quote: "> ", content: "" },
  { name: "an alert", lines: ["> [!NOTE]", ">", ">", "> x"], quote: "> ", content: "" },
  { name: "a nested quote", lines: ["> > c", "> >", "> >", "> > d"], quote: "> > ", content: "" },
  { name: "a quote in a list item", lines: ["- item", "", "  > q", "  >", "  >", "  > r"], quote: "  > ", content: "" },
  { name: "a list item in a quote", lines: ["> - x", ">", ">", ">   more"], itemLine: 1, quote: "> ", content: "  " },
  {
    name: "a list item in a quote, with a tab after the marker",
    lines: [">\t- x", ">", ">", ">   more"],
    itemLine: 1,
    quote: "> ",
    // The tab goes to column 4: the item's content starts at column 6, so four spaces follow the one of the quote.
    content: "    ",
  },
  {
    name: "a sibling item in a quote",
    lines: ["> - x", ">", ">", "> - y"],
    itemLine: 1,
    quote: "> ",
    content: "  ",
    sibling: { kind: "item", indent: "" },
  },
  { name: "an admonition", lines: ["```{note}", "a", "", "", "b", "```"], containerLine: 1, quote: "", content: "" },
  {
    name: "an admonition in a list item",
    lines: ["- i", "", "  ```{note}", "  a", "", "", "  b", "  ```"],
    containerLine: 3,
    quote: "",
    content: "  ",
  },
  { name: "a quote directive", lines: ["```{epigraph}", "q1", "", "", "q2", "```"], containerLine: 1, quote: "", content: "" },
  { name: "a context-tag panel", lines: ["<example>", "", "alpha", "", "", "beta"], containerLine: 1, quote: "", content: "" },
  { name: "a definition", lines: ["Term", ": d1", "", "", "  two"], containerLine: 2, quote: "", content: "  " },
  {
    name: "a run between two definition entries",
    lines: ["Term", ": d1", "", "", "Other", ": d2"],
    containerLine: 2,
    quote: "",
    content: "  ",
    sibling: { kind: "definition", indent: "" },
  },
  { name: "a footnote", lines: ["[^a]: f1", "", "", "    more"], containerLine: 1, quote: "", content: "    " },
  { name: "a footnote label line alone", lines: ["[^b]:", "", "", "    body"], containerLine: 1, quote: "", content: "    " },
  {
    name: "a run between two footnotes",
    lines: ["[^a]: f1", "", "", "[^b]: f2"],
    containerLine: 1,
    quote: "",
    content: "    ",
    sibling: { kind: "footnote", indent: "" },
  },
  // A tab before the container line is kept as it is.
  { name: "a tab before a fence", lines: ["\t```{note}", "\ta", "", "", "\tb", "\t```"], containerLine: 1, quote: "", content: "\t" },
  { name: "a tab before a context tag", lines: ["\t<example>", "", "\talpha", "", "", "\tbeta"], containerLine: 1, quote: "", content: "\t" },
  { name: "a tab before a definition marker", lines: ["Term", "\t: d1", "", "", "\t  two"], containerLine: 2, quote: "", content: "\t  " },
  { name: "spaces before a footnote label", lines: ["   [^a]: f1", "", "", "       more"], containerLine: 1, quote: "", content: "       " },
  { name: "a list item in a quote with a deeper marker", lines: ["> 1. x", ">", ">", ">    more"], itemLine: 1, quote: "> ", content: "   " },
  {
    name: "a forged but well-formed fence, accepted",
    lines: ["```{note}", "```", "x", "", "", "y"],
    containerLine: 1,
    quote: "",
    content: "",
  },
  {
    name: "a fence at another indent, accepted",
    lines: ["   ~~~{admonition} T", "   a", "", "", "   b", "   ~~~"],
    containerLine: 1,
    quote: "",
    content: "   ",
  },
  { name: "a colon fence", lines: [":::{note}", "a", "", "", "b", ":::"], containerLine: 1, quote: "", content: "" },
];

for (const [name, eol] of EOLS) {
  for (const row of ROWS) {
    test(`${name}: the indent of ${row.name}`, () => {
      const text = join(eol, [...row.lines, ""]);
      const run = quoteBlankRuns(text)[0] ?? blankRuns(text)[0];
      const indent = blankRunIndent(text, run.line, row.itemLine, row.containerLine);
      assert.ok(indent, "the container line holds");
      assert.equal(indent.quote, row.quote);
      assert.equal(indent.content, row.content);
      assert.deepEqual(indent.sibling, row.sibling);
      assert.equal(indent.blank !== undefined, row.quote !== "", "only a quote run has a copy of its first line");
    });
  }
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("a quote run has its first line, byte for byte, as the copy of a blank line", () => {
  const text = "> a\n> \n> \n> b\n";
  assert.equal(blankRunIndent(text, 2)?.blank, "> ");
  assert.equal(blankRunIndent(">\t\n>\n> b", 1)?.blank, ">\t");
  assert.equal(blankRunIndent("a\n\n\nb\n", 2)?.blank, undefined, "a plain run has none");
  assert.deepEqual(blankRunIndent("a\n\n\nb\n", 2), { quote: "", content: "" }, "and no container indent");
});

test("a footnote label after a tab is no footnote label: it is refused", () => {
  const text = "\t[^a]: f1\n\n\n\tmore\n";
  assert.equal(blankRunIndent(text, 2, undefined, 1), undefined);
});

/** The container line `anchor` at line 1, then the run `line`..`endLine` of the rest of the lines. */
const refused = (lines: string[], itemLine: number | undefined, containerLine: number | undefined): boolean => {
  const text = join("\n", [...lines, ""]);
  const run = quoteBlankRuns(text)[0] ?? blankRuns(text)[0];
  return blankRunIndent(text, run.line, itemLine, containerLine) === undefined;
};

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("a container line that is not of the shape of a container is refused as stale", () => {
  assert.ok(refused(["a paragraph", "", "", "b"], undefined, 1), "a paragraph line");
  assert.ok(refused(["```", "a", "", "", "b", "```"], undefined, 1), "a fence without a name");
  assert.ok(refused(["```python", "a", "", "", "b", "```"], undefined, 1), "a fence with a language only");
  assert.ok(refused(["<div>", "", "a", "", "", "b"], undefined, 1), "an HTML tag line");
  assert.ok(refused(["Term", ":", "", "", "two"], undefined, 2), "a colon with no text after it");
  assert.ok(refused(["Term", ": ", "", "", "two"], undefined, 2), "a colon with only a space after it");
  assert.ok(refused(["[^a]:", "", "", "    b"], undefined, 2), "a line that is not a label");
  assert.ok(refused(["- x", "", "", "  b"], undefined, 1), "a list item line given as a container line");
  assert.ok(refused(["```{note}", "a", "", "", "b", "```"], 1, undefined), "a fence line given as an item line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("a container line at or after the run, in the frontmatter, or out of the text is refused as stale", () => {
  const text = "a\n\n```{note}\n\n\nb\n```\n";
  assert.equal(blankRunIndent(text, 4, undefined, 3)?.content, "", "the line before the run holds");
  assert.equal(blankRunIndent(text, 4, undefined, 4), undefined, "the first line of the run");
  assert.equal(blankRunIndent(text, 4, undefined, 6), undefined, "a line after the run");
  assert.equal(blankRunIndent(text, 4, undefined, 0), undefined, "line zero");
  assert.equal(blankRunIndent(text, 4, undefined, 99), undefined, "a line out of the text");
  assert.equal(blankRunIndent(text, 4, undefined, 1.5), undefined, "not an integer");
  assert.equal(blankRunIndent(text, 4, 3, 3), undefined, "an item line and a container line exclude each other");
  const frontmatter = "---\n```{note}\n---\n\n\n```{note}\nb\n```\n";
  assert.equal(blankRunIndent(frontmatter, 4, undefined, 2), undefined, "a line of the frontmatter");
  assert.equal(blankRunIndent(frontmatter, 4, undefined, 6), undefined, "a line after the run");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
test("quote markers at another depth or other columns than the run's refuse the container line", () => {
  assert.equal(blankRunIndent("> - x\n>\n>\n> y\n", 2, 1)?.quote, "> ");
  assert.equal(blankRunIndent("- x\n>\n>\n> y\n", 2, 1), undefined, "no markers on the container line");
  assert.equal(blankRunIndent("> > - x\n>\n>\n> y\n", 2, 1), undefined, "deeper markers");
  assert.equal(blankRunIndent("> > - x\n> >\n> >\n> > y\n", 2, 1)?.quote, "> > ", "the same depth");
  assert.equal(blankRunIndent("> - x\n> >\n> >\n> > y\n", 2, 1), undefined, "fewer markers");
  assert.equal(blankRunIndent("  > - x\n>\n>\n> y\n", 2, 1), undefined, "other marker columns");
  assert.equal(blankRunIndent("```{note}\n>\n>\n> y\n", 2, undefined, 1), undefined, "a container line outside the quote");
  assert.equal(blankRunIndent("> ```{note}\n>\n>\n> y\n", 2, undefined, 1)?.content, "", "a fence in a quote");
  assert.equal(blankRunIndent("> - x\n\n\n  y\n", 2, 1), undefined, "a plain run with a quote line");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
test("a fence in a list item takes its leading spaces and tabs as they are, also for a tab after a quote marker", () => {
  assert.equal(blankRunIndent(">\t```{note}\n>\n>\n> y\n", 2, undefined, 1)?.content, "  ", "the rest of the tab stays");
  assert.equal(blankRunIndent("- a\n  ```{note}\n\n\n  y\n  ```\n", 3, undefined, 2)?.content, "  ");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
test("a block is a new definition entry or a new footnote only by its own lines", () => {
  assert.ok(startsDefinitionEntry(["New", ": dn"]));
  assert.ok(startsDefinitionEntry(["New", "", ": dn"]));
  assert.ok(!startsDefinitionEntry(["New", "", "", ": dn"]));
  assert.ok(!startsDefinitionEntry([": dn"]));
  assert.ok(!startsDefinitionEntry(["More"]));
  assert.ok(!startsDefinitionEntry(["", "New", ": dn"]));
  assert.ok(startsFootnoteDefinition("[^c]: f3"));
  assert.ok(startsFootnoteDefinition("   [^c]: f3"));
  assert.ok(!startsFootnoteDefinition("    [^c]: f3"));
  assert.ok(!startsFootnoteDefinition("More [^c]: f3"));
});
