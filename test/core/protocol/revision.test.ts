import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isRevision, RevisionCounter } from "../../../src/core/protocol/revision";

test("a revision is any safe integer", () => {
  assert.equal(isRevision(0), true);
  assert.equal(isRevision(7), true);
  assert.equal(isRevision(-1), true);
  assert.equal(isRevision(1.5), false);
  assert.equal(isRevision("1"), false);
  assert.equal(isRevision(2 ** 53), false);
});

test("the counter starts each document at 1 and only moves it forward", () => {
  const counter = new RevisionCounter();
  assert.equal(counter.current("a"), 1);
  assert.equal(counter.advance("a"), 2);
  assert.equal(counter.advance("a"), 3);
  assert.equal(counter.current("a"), 3);
  assert.equal(counter.current("b"), 1, "documents are counted apart");
  assert.equal(counter.advance("b"), 2);
  assert.equal(counter.current("a"), 3);
});
