import * as assert from "node:assert/strict";
import { test } from "node:test";

import { formatLandingRecords, formatListMarks } from "../shared/inputLandingProbe";

test("CR 330: records are relative to the origin, filtered by start, and a failed read is text", () => {
  const text = formatLandingRecords([
    { name: "workbench", records: [
      { at: 900, type: "mousedown", target: "old" },
      { at: 1_250, type: "pointerdown", target: "iframe.webview", x: 10.4, y: 20.6 },
      { at: 1_260, type: "focusin", target: "iframe.webview" },
    ] },
    { name: "host", records: [] },
    { name: "content", records: "unreadable: closed" },
  ], 1_000, 1_000);
  assert.equal(text, "landing workbench [250 pointerdown iframe.webview @10,21; 260 focusin iframe.webview] host [none] content [unreadable: closed]");
});

test("CR 330: only the last records are shown and the count of the others is said", () => {
  const records = [1, 2, 3, 4].map((at) => ({ at, type: "mousedown", target: "t" }));
  assert.equal(formatLandingRecords([{ name: "w", records }], 0, 0, 2), "landing w [2 earlier omitted; 3 mousedown t; 4 mousedown t]");
});

test("CR 330: list marks are on the scenario clock", () => {
  assert.equal(formatListMarks([{ at: 1_120, mark: "inserted" }, { at: 1_300, mark: "transitionend" }], 1_000),
    "list marks [120 inserted; 300 transitionend]");
  assert.equal(formatListMarks([], 0), "list marks [none]");
  assert.equal(formatListMarks("unreadable: x", 0), "list marks [unreadable: x]");
});
