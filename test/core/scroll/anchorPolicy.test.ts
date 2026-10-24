import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAnchorPolicy,
  EditorEchoGuard,
  shiftLineForEdits,
} from "../../../src/core/scroll/anchorPolicy";

const policy = createAnchorPolicy();

test("anchors long paragraphs at the start of each source line", () => {
  const map = policy.buildAnchorMap([
    { top: 100, height: 40, line: 1, endLine: 1 },
    { top: 200, height: 300, line: 3, endLine: 6, lineTops: [260, 380, 440] },
  ]);

  assert.equal(policy.yAtLine(map, 3), 200);
  assert.equal(policy.yAtLine(map, 4), 260);
  assert.equal(policy.yAtLine(map, 5), 380);
  assert.equal(policy.yAtLine(map, 6), 440);
  assert.equal(policy.yAtLine(map, 7), 500);
  assert.equal(policy.lineAtY(map, 320), 4.5);
});

test("falls back to block bounds when paragraph lines cannot be measured", () => {
  const map = policy.buildAnchorMap([
    { top: 200, height: 300, line: 3, endLine: 6, lineTops: [260] },
  ]);

  assert.equal(policy.yAtLine(map, 3), 200);
  assert.equal(policy.yAtLine(map, 7), 500);
  assert.equal(policy.yAtLine(map, 5), 350);
});

test("converts lines to scroll positions and back through the reading offset", () => {
  const map = policy.buildAnchorMap([
    { top: 100, height: 40, line: 2, endLine: 2 },
    { top: 500, height: 300, line: 10, endLine: 14, lineTops: [560, 620, 680, 740] },
  ]);
  const readingOffset = 65;

  for (const line of [1, 2, 3.5, 10, 11, 12.25, 14]) {
    const scrollTop = policy.scrollTopForLine(map, line, readingOffset, 10_000);
    assert.ok(scrollTop !== undefined);
    const roundTrip = policy.lineAtScrollTop(map, scrollTop, readingOffset);
    assert.ok(roundTrip !== undefined && Math.abs(roundTrip - line) < 1e-9, `line ${line}`);
  }
  assert.equal(policy.scrollTopForLine(map, 11, readingOffset, 10_000), 560 - readingOffset);
});

test("ramps the reading line so the top of the page is line 1", () => {
  assert.equal(policy.readingY(0, 65), 0);
  assert.equal(policy.readingY(30, 65), 60);
  assert.equal(policy.readingY(65, 65), 130);
  assert.equal(policy.readingY(100, 65), 165);
  assert.equal(policy.scrollTopForY(60, 65, 1_000), 30);
  assert.equal(policy.scrollTopForY(165, 65, 1_000), 100);
  assert.equal(policy.scrollTopForY(5_000, 65, 1_000), 1_000);
  assert.equal(policy.readingOffset(3, 20, 5), 65);
});

test("reports the editor top line as the floor of the anchor", () => {
  assert.equal(policy.editorTopLine(12.999), 12);
  assert.equal(policy.editorTopLine(12.9999999), 13);
  assert.equal(policy.editorTopLine(0.4), 1);
  assert.equal(policy.editorTopLine(Number.NaN), 1);
});

test("ignores editor echoes across re-renders, then yields to the user", () => {
  const guard = new EditorEchoGuard(500);
  guard.expect("file:///active.md", 10, 42, 100);

  assert.equal(guard.isEcho("file:///active.md", 25, 110), true);
  assert.equal(guard.isEcho("file:///active.md", 42, 120), true);
  assert.equal(guard.isEcho("file:///active.md", 80, 130), false);
  assert.equal(guard.isEcho("file:///active.md", 42, 140), false);

  guard.expect("file:///active.md", 10, 42, 200);
  assert.equal(guard.isEcho("file:///active.md", 42, 701), false);
  guard.expect("file:///active.md", 10, 42, 800);
  assert.equal(guard.isEcho("file:///other.md", 42, 801), false);
});

test("accepts one centered-reveal echo, then treats further scrolling as the user's", () => {
  const guard = new EditorEchoGuard(500);
  guard.expect("file:///active.md", 60, 42, 100);

  assert.equal(guard.isEcho("file:///active.md", 21, 101, true), true);
  assert.equal(guard.isEcho("file:///active.md", 26, 102, true), false);

  guard.expect("file:///active.md", 60, 42, 200);
  assert.equal(guard.isEcho("file:///active.md", 21, 201, false), false);
});

test("shifts the anchor when lines change above it only", () => {
  const insertAbove = [{ startLine: 3, endLine: 3, insertedLineCount: 2 }];
  assert.equal(shiftLineForEdits(10.5, insertAbove), 12.5);
  assert.equal(shiftLineForEdits(2, insertAbove), 2);

  const deleteAbove = [{ startLine: 3, endLine: 6, insertedLineCount: 0 }];
  assert.equal(shiftLineForEdits(10, deleteAbove), 7);

  const editOnAnchorLine = [{ startLine: 10, endLine: 10, insertedLineCount: 1 }];
  assert.equal(shiftLineForEdits(10.25, editOnAnchorLine), 10.25);
});
