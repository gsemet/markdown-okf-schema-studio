import * as assert from "node:assert/strict";
import { test } from "node:test";

import { studioTargetFor } from "../../../src/core/navigation/openingPolicy";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

// @tests_req SwRS-MDOKFSTUDIO-LIFE-183
test("a jump into a file with several Studio tabs as active as each other reveals the first of them", () => {
  assert.deepEqual(
    studioTargetFor("studio-at-line", 1, [{ viewColumn: 2, lastActive: 5 }, { viewColumn: 3, lastActive: 5 }]),
    { kind: "reveal", viewColumn: 2 },
  );
  assert.deepEqual(
    studioTargetFor("studio-at-line", 1, [{ viewColumn: 2, lastActive: 4 }, { viewColumn: 3, lastActive: 5 }, { viewColumn: 4, lastActive: 5 }]),
    { kind: "reveal", viewColumn: 3 },
    "the latest wins, and among equals the earliest of them",
  );
});
