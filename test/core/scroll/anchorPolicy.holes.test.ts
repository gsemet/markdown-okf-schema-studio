import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createAnchorPolicy, type AnchorBlock } from "../../../src/core/scroll/anchorPolicy";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const policy = createAnchorPolicy();
const good: AnchorBlock = { top: 100, height: 40, line: 1, endLine: 1 };
const withOnly = (overrides: Partial<AnchorBlock>): AnchorBlock => ({ ...good, ...overrides });

// @tests_req SwRS-MDOKFSTUDIO-LIFE-119#S1
test("a block with a position, a height or a line that is not usable adds nothing to the anchor map", () => {
  const usable = policy.buildAnchorMap([good]);
  assert.deepEqual(usable, [{ y: 0, line: 1 }, { y: 100, line: 1 }, { y: 140, line: 2 }]);
  for (const [name, block] of Object.entries({
    "top is NaN": withOnly({ top: Number.NaN }),
    "top is infinite": withOnly({ top: Number.POSITIVE_INFINITY }),
    "height is NaN": withOnly({ height: Number.NaN }),
    "height is infinite": withOnly({ height: Number.POSITIVE_INFINITY }),
    "height is negative": withOnly({ height: -1 }),
    "line is NaN": withOnly({ line: Number.NaN }),
    "line is infinite": withOnly({ line: Number.POSITIVE_INFINITY }),
    "line is 0": withOnly({ line: 0, endLine: 0 }),
    "line is negative": withOnly({ line: -3, endLine: -3 }),
  })) {
    assert.deepEqual(policy.buildAnchorMap([block]), [], name);
    assert.deepEqual(policy.buildAnchorMap([block, withOnly({ top: 200, line: 4, endLine: 4 })]), [
      { y: 0, line: 1 }, { y: 200, line: 4 }, { y: 240, line: 5 },
    ], `${name}: the other block still counts`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-119#S1
test("a block of height 0 still anchors its line", () => {
  assert.deepEqual(policy.buildAnchorMap([withOnly({ height: 0 })]), [{ y: 0, line: 1 }, { y: 100, line: 1 }, { y: 100, line: 2 }]);
  assert.equal(policy.yAtLine(policy.buildAnchorMap([withOnly({ top: 50, height: 0, line: 3, endLine: 3 })]), 3), 50);
});
