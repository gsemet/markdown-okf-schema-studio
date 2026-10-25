import * as assert from "node:assert/strict";
import { test } from "node:test";

import { insertionText, planInsertion } from "../../../src/core/mapping/insertion";
import { extractFrontmatter } from "../../../src/core/frontmatter/okfFrontmatter";

function insert(text: string, afterLine: number, raw: string): string | undefined {
  const plan = planInsertion(text, afterLine);
  if (!plan) return undefined;
  return text.slice(0, plan.offset) + insertionText(plan, raw) + text.slice(plan.offset);
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-094
test("inserts between blocks separated by a blank line", () => {
  assert.equal(insert("A\n\nB\n", 1, "NEW"), "A\n\nNEW\n\nB\n");
});

test("inserts after the last line; a final line break is not a following line", () => {
  assert.equal(insert("A\n", 1, "NEW"), "A\n\nNEW\n");
  assert.equal(insert("A", 1, "NEW"), "A\n\nNEW");
});

test("separates a block from a directly following non-blank line", () => {
  assert.equal(insert("- a\n- b\n", 1, "NEW"), "- a\n\nNEW\n\n- b\n");
});

test("start of an empty document and of a body without frontmatter", () => {
  assert.equal(insert("", 0, "NEW"), "NEW\n");
  assert.equal(insert("Body\n", 0, "NEW"), "NEW\n\nBody\n");
  assert.equal(insert("\nBody\n", 0, "NEW"), "NEW\n\nBody\n");
});

test("start with frontmatter inserts after the closing fence and keeps the frontmatter", () => {
  const text = "---\na: 1\n---\nBody\n";
  const result = insert(text, 0, "NEW");
  assert.equal(result, "---\na: 1\n---\n\nNEW\n\nBody\n");
  assert.deepEqual(extractFrontmatter(result as string).frontmatter, { a: 1 });
  assert.equal(insert("---\na: 1\n---\n", 0, "NEW"), "---\na: 1\n---\n\nNEW\n");
  assert.equal(insert("---\na: 1\n---", 0, "NEW"), "---\na: 1\n---\n\nNEW");
});

test("CRLF documents keep CRLF", () => {
  assert.equal(insert("A\r\n\r\nB\r\n", 1, "N1\nN2"), "A\r\n\r\nN1\r\nN2\r\n\r\nB\r\n");
  assert.equal(insert("- a\r\n- b\r\n", 1, "NEW"), "- a\r\n\r\nNEW\r\n\r\n- b\r\n");
  assert.equal(insert("---\r\na: 1\r\n---\r\nBody\r\n", 0, "NEW"), "---\r\na: 1\r\n---\r\n\r\nNEW\r\n\r\nBody\r\n");
});

test("whitespace-only raw text inserts nothing", () => {
  const plan = planInsertion("A\n", 1);
  assert.ok(plan);
  assert.equal(insertionText(plan, "  \n\t\n"), "");
  assert.equal(insertionText(plan, ""), "");
});

test("trailing line breaks of the raw text are dropped", () => {
  assert.equal(insert("A\n", 1, "NEW\n\n"), "A\n\nNEW\n");
});

test("out of range lines have no plan", () => {
  assert.equal(planInsertion("A\n", 2), undefined);
  assert.equal(planInsertion("A\n\nB\n", 4), undefined);
  assert.equal(planInsertion("A", 2), undefined);
  assert.equal(planInsertion("A", -1), undefined);
});

const FIGURE_SHAPES: Array<[string, string, number]> = [
  ["colon-fence figure", ":::{figure} a.svg\n:alt: x\n\nCaption\n:::", 5],
  ["backtick-fence figure", "```{figure} a.svg\n\nCaption\n```", 4],
  ["plain image", "![alt](a.png)", 1],
];

for (const [name, figure, closingLine] of FIGURE_SHAPES) {
  test(`inserting after a ${name}: middle, last block, with and without a final line break`, () => {
    const lead = "Intro\n\n";
    const leadLines = 2;
    const after = leadLines + closingLine;
    assert.equal(
      insert(`${lead}${figure}\n\nOutro\n`, after, "NEW"),
      `${lead}${figure}\n\nNEW\n\nOutro\n`,
    );
    assert.equal(insert(`${lead}${figure}\n`, after, "NEW"), `${lead}${figure}\n\nNEW\n`);
    assert.equal(insert(`${lead}${figure}`, after, "NEW"), `${lead}${figure}\n\nNEW`);
    const crlf = (text: string): string => text.replace(/\n/gu, "\r\n");
    assert.equal(
      insert(crlf(`${lead}${figure}\n`), after, "NEW"),
      crlf(`${lead}${figure}\n\nNEW\n`),
    );
    // Directly followed by text (no blank line): the new block is separated from both sides.
    assert.equal(
      insert(`${lead}${figure}\nOutro\n`, after, "NEW"),
      `${lead}${figure}\n\nNEW\n\nOutro\n`,
    );
  });
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-094
test("lone-CR documents keep CR and count lines by CR", () => {
  assert.equal(insert("A\r\rB\r", 1, "N1\nN2"), "A\r\rN1\rN2\r\rB\r");
  assert.equal(insert("A\r\rB\r", 3, "NEW"), "A\r\rB\r\rNEW\r");
  assert.equal(insert("- a\r- b\r- c\r", 2, "NEW"), "- a\r- b\r\rNEW\r\r- c\r");
  assert.equal(insert("Body\r", 0, "NEW"), "NEW\r\rBody\r");
  assert.equal(planInsertion("A\r", 2), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-094
test("CRLF documents are counted line by line for later lines", () => {
  assert.equal(insert("A\r\n\r\nB\r\n", 3, "NEW"), "A\r\n\r\nB\r\n\r\nNEW\r\n");
});
