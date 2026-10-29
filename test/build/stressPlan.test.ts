import * as assert from "node:assert/strict";
import { test } from "node:test";

import { hostStressPlan, MAX_STRESS_REPEAT, STRESS_SCENARIOS_BY_HOST, stressPlan } from "../shared/stressPlan";

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

test("CR 043: each window runs only its own stress scenarios, and a filter may name either window", () => {
  const trusted = hostStressPlan({ STUDIO_STRESS_REPEAT: "3" }, "trusted");
  assert.deepEqual(trusted, { repeat: 3, scenarios: [...STRESS_SCENARIOS_BY_HOST.trusted] });
  assert.deepEqual(hostStressPlan({}, "untrusted"), { repeat: 10, scenarios: ["untrusted-read-only"] });
  const filter = { STUDIO_STRESS_SCENARIOS: "untrusted-read-only,image-paste" };
  assert.deepEqual(hostStressPlan(filter, "trusted")?.scenarios, ["image-paste"]);
  assert.deepEqual(hostStressPlan(filter, "untrusted")?.scenarios, ["untrusted-read-only"]);
  assert.equal(hostStressPlan({ STUDIO_STRESS_SCENARIOS: "table-tab" }, "untrusted"), undefined);
  assert.throws(() => hostStressPlan({ STUDIO_STRESS_SCENARIOS: "nope" }, "untrusted"), /Unknown stress scenario\(s\) nope/u);
});

test("CR 043: every T2 real-window scenario is in the stress plan, and no name is listed twice", () => {
  const all = [...STRESS_SCENARIOS_BY_HOST.trusted, ...STRESS_SCENARIOS_BY_HOST.untrusted];
  assert.equal(new Set(all).size, all.length);
  for (const name of ["incoming-changes", "review-threads", "image-paste", "untrusted-read-only"]) {
    assert.ok(all.includes(name), name);
  }
});

test("CR 048: the slash menu scenario runs in the trusted window's stress plan", () => {
  assert.ok(STRESS_SCENARIOS_BY_HOST.trusted.includes("slash-menu"));
  assert.deepEqual(hostStressPlan({ STUDIO_STRESS_SCENARIOS: "slash-menu" }, "trusted")?.scenarios, ["slash-menu"]);
  assert.equal(hostStressPlan({ STUDIO_STRESS_SCENARIOS: "slash-menu" }, "untrusted"), undefined);
});

test("find in preview (cream and dark, with replace) runs in the trusted window's stress plan", () => {
  assert.ok(STRESS_SCENARIOS_BY_HOST.trusted.includes("find-in-preview"));
  assert.deepEqual(hostStressPlan({ STUDIO_STRESS_SCENARIOS: "find-in-preview" }, "trusted")?.scenarios, ["find-in-preview"]);
  assert.equal(hostStressPlan({ STUDIO_STRESS_SCENARIOS: "find-in-preview" }, "untrusted"), undefined);
});
