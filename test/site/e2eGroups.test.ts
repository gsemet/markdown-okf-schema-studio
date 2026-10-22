import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";

import { GROUPS, INTEGRATION_TESTS, isGroupId } from "../shared/e2eGroups";
import { REMOVED_ALIASES, SCENARIO_ID_BY_LEGACY_ID } from "../visual/scenarioIds";
import { SCENARIOS } from "../visual/scenarios";

test("the e2e campaign has the 16 frozen feature groups with unique ids", () => {
  assert.equal(GROUPS.length, 16);
  assert.equal(new Set(GROUPS.map((group) => group.id)).size, GROUPS.length);
  for (const id of ["frontmatter-schema", "frontmatter-editing", "myst"]) {
    assert.ok(isGroupId(id), id);
  }
});

test("every visual scenario has a permanent <group>/vNN id whose prefix is its group", () => {
  const ids = new Set(SCENARIOS.map((scenario) => scenario.id));
  assert.equal(ids.size, SCENARIOS.length, "scenario ids are unique");
  assert.equal(SCENARIOS.length, 265, "245 scenarios minus the 4 exact aliases, plus 14 B4 gap-fill scenarios, plus 2 change-bar scenarios, plus 2 long-words scenarios, plus 3 floating-bar scenarios (CR 034), plus 3 code-block-caption scenarios");
  for (const scenario of SCENARIOS) {
    assert.ok(isGroupId(scenario.group), scenario.id);
    assert.match(scenario.id, new RegExp(`^${scenario.group}/v\\d{2,}-[a-z0-9-]+$`, "u"));
  }
  assert.deepEqual(Object.values(SCENARIO_ID_BY_LEGACY_ID).filter((id) => !ids.has(id)), []);
  assert.equal(REMOVED_ALIASES.length, 4);
  for (const alias of REMOVED_ALIASES) {
    assert.ok(!SCENARIOS.some((scenario) => scenario.legacyId === alias), alias);
  }
});

test("the Mermaid theme-switch check is keyed by a flag, not by an id", () => {
  const flagged = SCENARIOS.filter((scenario) => scenario.mermaidThemeSwitch);
  assert.equal(flagged.length, 1);
  assert.match(flagged[0]!.fixture, /mermaid/u);
  const source = fs.readFileSync(path.resolve(__dirname, "../../../test/visual/capture.py"), "utf8");
  // Everything before the campaign driver (`capture_scenarios`, `main`) is check code.
  const capture = source.slice(0, source.indexOf("def capture_scenarios"));
  assert.ok(capture.length > 1000);
  // No check may branch on a scenario id: not by comparison, membership or prefix/suffix tests.
  assert.doesNotMatch(capture, /scenario\[["']id["']\]\s*(==|!=|in\b|not in\b)/u);
  assert.doesNotMatch(capture, /scenario\[["']id["']\]\.(startswith|endswith)\(/u);
  assert.doesNotMatch(capture, /scenario\.get\(["']id["']/u);
});

test("integration test rows name existing test files", () => {
  assert.equal(INTEGRATION_TESTS.length, 26);
  for (const row of INTEGRATION_TESTS) {
    assert.ok(isGroupId(row.group), row.file);
    assert.ok(fs.existsSync(path.resolve(__dirname, "../../..", row.file)), row.file);
  }
});
