import assert from "node:assert/strict";
import test from "node:test";

import { AUTOMATIC_MIN_KEEP, automaticKeep, trackedReportFiles } from "./pruneReportsCli";

test("trackedReportFiles warns and throws when git fails, so nothing is pruned", () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    assert.throws(() => trackedReportFiles(() => { throw new Error("not a git repository"); }), /refusing to prune: git ls-files failed \(not a git repository\)/u);
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /refusing to prune/u);
});

test("trackedReportFiles lists the tracked files as absolute paths", () => {
  const files = trackedReportFiles(() => "out/reports/a.md\0out/reports/b/c.png\0");
  assert.equal(files.length, 2);
  assert.ok(files.every((file) => file.endsWith("a.md") || file.endsWith("c.png")));
});

test("the automatic prune keeps at least two runs per kind", () => {
  assert.equal(AUTOMATIC_MIN_KEEP, 2);
  assert.equal(automaticKeep({ STUDIO_E2E_KEEP_RUNS: "1" }), 2);
  assert.equal(automaticKeep({}), 5);
  assert.equal(automaticKeep({ STUDIO_E2E_KEEP_RUNS: "9" }), 9);
});
