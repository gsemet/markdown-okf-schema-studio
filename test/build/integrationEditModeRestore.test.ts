import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

const ROOT = path.resolve(__dirname, "../../..");
const INTEGRATION = path.join(ROOT, "test", "integration");

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-004
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
/**
 * CR 152: the workspace remembers the edit mode for the next preview, and the real-window scenarios
 * run one after the other in the same window. A scenario that turns edit mode on and leaves it on
 * makes the next one open its preview in edit mode: its `setEditMode(page, true)` then clicks
 * nothing, the page never takes the keyboard focus and its arrow keys go to the workbench
 * (windowSwitchKeys.test.ts after pasteUrl.test.ts). Each top-level scenario that turns it on turns
 * it off again.
 */
test("CR 152: every top-level integration scenario that turns edit mode on turns it off again", () => {
  const leaking = fs.readdirSync(INTEGRATION, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name)
    .filter((name) => {
      const source = fs.readFileSync(path.join(INTEGRATION, name), "utf8");
      return source.includes("setEditMode(page, true)") && !source.includes("setEditMode(page, false)");
    });
  assert.deepEqual(leaking, [], "these scenarios leave the workspace in edit mode for the next one");
});
