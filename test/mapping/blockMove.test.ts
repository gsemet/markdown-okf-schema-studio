import * as assert from "node:assert/strict";
import { test } from "node:test";

import { opensIncludeDirective, planBlockMove, type BlockMovePlan } from "../../src/mapping/blockMove";

function move(text: string, first: [number, number], second: [number, number]): string | { refused: string } {
  const plan = planBlockMove(
    text,
    { line: first[0], endLine: first[1] },
    { line: second[0], endLine: second[1] },
  );
  if ("refused" in plan) return plan;
  return text.slice(0, plan.start) + plan.text + text.slice(plan.end);
}

function plan(text: string, first: [number, number], second: [number, number]): BlockMovePlan {
  const result = planBlockMove(text, { line: first[0], endLine: first[1] }, { line: second[0], endLine: second[1] });
  assert.ok(!("refused" in result), "refused" in result ? result.refused : "");
  return result;
}

test("swaps two blocks and keeps the separator and the final line break", () => {
  assert.equal(move("A\n\nB\n", [1, 1], [3, 3]), "B\n\nA\n");
  assert.equal(move("A\n\nB", [1, 1], [3, 3]), "B\n\nA", "no final newline stays absent");
});

test("keeps CRLF line breaks, inside the blocks and between them", () => {
  assert.equal(move("a1\r\na2\r\n\r\nB\r\n", [1, 2], [4, 4]), "B\r\n\r\na1\r\na2\r\n");
  assert.equal(move("A\r\n\r\nB1\r\nB2", [1, 1], [3, 4]), "B1\r\nB2\r\n\r\nA");
});

test("several blank lines between the blocks are kept as they are", () => {
  assert.equal(move("A\n\n\n\nB\n", [1, 1], [5, 5]), "B\n\n\n\nA\n");
});

test("only the lines from the first block to the second block change", () => {
  const text = "# T\n\nA\n\nB\n\nC\n";
  const result = plan(text, [3, 3], [5, 5]);
  assert.equal(text.slice(0, result.start), "# T\n\n");
  assert.equal(text.slice(result.end), "\nC\n");
  assert.equal(move(text, [3, 3], [5, 5]), "# T\n\nB\n\nA\n\nC\n");
});

test("reports the new first line of each block", () => {
  const result = plan("A1\nA2\n\nB\n", [1, 2], [4, 4]);
  assert.equal(result.newSecondStartLine, 1);
  assert.equal(result.newStartLine, 3);
});

test("glued blocks get a blank line instead of merging into one paragraph", () => {
  assert.equal(move("para\n- item\n", [1, 1], [2, 2]), "- item\n\npara\n");
  assert.equal(move("# Head\nbody\n", [1, 1], [2, 2]), "body\n\n# Head\n");
});

test("a block glued to its neighbours stays apart after the move", () => {
  assert.equal(move("x\n```\ncode\n```\n\nB\ny\n", [2, 4], [6, 6]), "x\n\nB\n\n```\ncode\n```\n\ny\n");
});

test("move down then up restores the document", () => {
  const text = "# T\n\nA1\nA2\n\nB\n\n- c\n- d\n";
  const down = move(text, [3, 4], [6, 6]) as string;
  assert.equal(down, "# T\n\nB\n\nA1\nA2\n\n- c\n- d\n");
  assert.equal(move(down, [3, 3], [5, 6]), text);
  const crlf = text.replace(/\n/gu, "\r\n");
  const crlfDown = move(crlf, [3, 4], [6, 6]) as string;
  assert.equal(move(crlfDown, [3, 3], [5, 6]), crlf);
  const noFinal = "A\n\nB";
  assert.equal(move(move(noFinal, [1, 1], [3, 3]) as string, [1, 1], [3, 3]), noFinal);
});

test("refuses blocks in the frontmatter and a move across it", () => {
  const text = "---\ntitle: x\n---\n\nA\n\nB\n";
  assert.ok("refused" in (move(text, [1, 3], [5, 5]) as object));
  assert.ok("refused" in (move(text, [2, 2], [5, 5]) as object));
  assert.equal(move(text, [5, 5], [7, 7]), "---\ntitle: x\n---\n\nB\n\nA\n");
});

test("refuses non-blank text between the blocks", () => {
  const refusal = move("A\n\n<!-- note -->\n\nB\n", [1, 1], [5, 5]);
  assert.ok(typeof refusal === "object" && "refused" in refusal);
  assert.ok("refused" in (move("A\n\n[ref]: http://x\n\nB\n", [1, 1], [5, 5]) as object));
});

test("refuses overlapping, unordered, out-of-range and blank-edged ranges", () => {
  const text = "A\n\nB\n\nC\n";
  for (const [first, second] of [
    [[1, 3], [3, 3]], [[3, 3], [1, 1]], [[1, 1], [1, 1]], [[1, 1], [5, 9]], [[1, 1], [9, 9]],
    [[0, 1], [3, 3]], [[1, 2], [3, 3]], [[3, 2], [5, 5]],
  ] as Array<[[number, number], [number, number]]>) {
    assert.ok("refused" in (move(text, first, second) as object), JSON.stringify([first, second]));
  }
  assert.ok("refused" in planBlockMove(text, { line: 1.5, endLine: 1 }, { line: 3, endLine: 3 }));
  assert.ok("refused" in planBlockMove(text, { line: Number.NaN, endLine: 1 }, { line: 3, endLine: 3 }));
});

test("detects the line that opens an include directive", () => {
  for (const line of ["```{include} other.md", ":::{include} other.md", "  ~~~{include} x.md"]) {
    assert.equal(opensIncludeDirective(line), true, line);
  }
  for (const line of ["```python", "{include} x", "Text ```{include}", "```{note}"]) {
    assert.equal(opensIncludeDirective(line), false, line);
  }
});
