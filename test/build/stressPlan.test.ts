import * as assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_STRESS_REPEAT, stressPlan } from "../shared/stressPlan";

const AVAILABLE = ["table-tab", "list-editor", "flush-frontmatter-typed"];

test("CR 041: the stress plan runs every scenario the default number of times", () => {
  assert.deepEqual(stressPlan({}, AVAILABLE, 7), { repeat: 7, scenarios: AVAILABLE });
  assert.deepEqual(stressPlan({ STUDIO_STRESS_REPEAT: " 20 " }, AVAILABLE).repeat, 20);
  assert.deepEqual(stressPlan({ STUDIO_STRESS_REPEAT: "" }, AVAILABLE).repeat, 10);
});

test("CR 041: a scenario filter keeps the given order and drops duplicates", () => {
  assert.deepEqual(
    stressPlan({ STUDIO_STRESS_SCENARIOS: "flush-frontmatter-typed, table-tab,table-tab," }, AVAILABLE).scenarios,
    ["flush-frontmatter-typed", "table-tab"],
  );
});

test("CR 041: an invalid repeat count or an unknown scenario fails before any window opens", () => {
  for (const value of ["0", "-1", "1.5", "ten", String(MAX_STRESS_REPEAT + 1), "1e2"]) {
    assert.throws(() => stressPlan({ STUDIO_STRESS_REPEAT: value }, AVAILABLE), /STUDIO_STRESS_REPEAT/u, value);
  }
  assert.throws(() => stressPlan({ STUDIO_STRESS_SCENARIOS: "table-tab,nope" }, AVAILABLE),
    /Unknown stress scenario\(s\) nope; available: table-tab, list-editor, flush-frontmatter-typed/u);
  assert.throws(() => stressPlan({}, []), /No stress scenario/u);
});
