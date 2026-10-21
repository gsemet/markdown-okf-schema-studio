import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

import { GROUPS, INTEGRATION_TESTS, isGroupId } from "../shared/e2eGroups";
import { GROUP_BY_SCENARIO_ID } from "../visual/scenarioGroups";
import { SCENARIOS } from "../visual/scenarios";

test("the e2e campaign has the 16 frozen feature groups with unique ids", () => {
  assert.equal(GROUPS.length, 16);
  assert.equal(new Set(GROUPS.map((group) => group.id)).size, GROUPS.length);
  for (const id of ["frontmatter-schema", "frontmatter-editing", "myst"]) {
    assert.ok(isGroupId(id), id);
  }
});

test("every visual scenario has a group and the group table has no stale id", () => {
  const ids = new Set(SCENARIOS.map((scenario) => scenario.id));
  assert.equal(ids.size, SCENARIOS.length, "scenario ids are unique");
  for (const scenario of SCENARIOS) {
    assert.ok(isGroupId(scenario.group), scenario.id);
  }
  assert.deepEqual(Object.keys(GROUP_BY_SCENARIO_ID).filter((id) => !ids.has(id)), []);
});

test("the Mermaid theme-switch check is keyed by a flag, not by an id", () => {
  assert.deepEqual(
    SCENARIOS.filter((scenario) => scenario.mermaidThemeSwitch).map((scenario) => scenario.id),
    ["mermaid-map-dark"],
  );
  const capture = fs.readFileSync(path.resolve(__dirname, "../../../test/visual/capture.py"), "utf8");
  assert.doesNotMatch(capture, /scenario\["id"\]\s*(==|!=)/u);
});

test("integration test rows name existing test files", () => {
  assert.equal(INTEGRATION_TESTS.length, 26);
  for (const row of INTEGRATION_TESTS) {
    assert.ok(isGroupId(row.group), row.file);
    assert.ok(fs.existsSync(path.resolve(__dirname, "../../..", row.file)), row.file);
  }
});
