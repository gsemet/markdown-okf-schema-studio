import * as assert from "node:assert/strict";
import { test } from "node:test";

import { insertionText, planInsertion } from "../../src/mapping/insertion";
import { extractFrontmatter } from "../../src/frontmatter/okfFrontmatter";

function insert(text: string, afterLine: number, raw: string): string | undefined {
  const plan = planInsertion(text, afterLine);
  if (!plan) return undefined;
  return text.slice(0, plan.offset) + insertionText(plan, raw) + text.slice(plan.offset);
}

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
