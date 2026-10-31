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
  assert.equal(SCENARIOS.length, 420, "245 scenarios minus the 4 exact aliases, plus 14 B4 gap-fill scenarios, plus 2 change-bar scenarios, plus 2 long-words scenarios, plus 3 floating-bar scenarios (CR 034), plus 3 code-block-caption scenarios, plus 4 comment-list scenarios, plus 2 rich-text paste scenarios, plus 5 grid and toctree scenarios, plus 3 inline-thread scenarios, plus 2 list-table scenarios, plus 19 B5 extension-state scenarios, plus 3 update-glow scenarios (CR 046), plus 3 built-in PlantUML engine scenarios, plus 4 PlantUML file and local include scenarios, plus 2 fresh-workspace scenarios, plus 5 conf.py warning banner, 2 inline image and 1 pasted image scenarios (CR 050), plus 5 README showcase scenarios (CR 090), plus 2 dollar-price scenarios, plus 2 copy-button keyboard focus scenarios, plus 3 sticky-heading shadow scenarios, plus 6 table row handle scenarios, plus 3 list-table row handle scenarios, plus 6 narrow row handle scenarios, plus 3 scrolling-table row handle scenarios, plus 1 comments-button thread scenario, plus 2 checkbox refusal scenarios, plus 2 raw-table colour-span scenarios, plus 2 table bar group scenarios, plus 2 link warning icon scenarios, plus 2 cursor-block mark scenarios, plus 2 sticky-band running-text scenarios, plus 1 PlantUML theme and sprite scenario, plus 2 frontmatter long-key scenarios and 2 frontmatter long-value scenarios, plus 3 review-thread contrast scenarios (CR 110), plus 2 unclosed-directive scenarios (CR 111), plus 2 edit-bar tooltip and rule scenarios (CR 112), plus 2 pasted-image alt-text Enter scenarios (CR 118), plus 2 keyboard block selection scenarios (CR 120), plus 1 README comment-thread scenario (CR 124), plus 2 palette clearance scenarios (CR 123), plus 2 mid-document unclosed-fence scenarios (CR 125), plus 5 code-block comfort scenarios (CR 131), plus 2 front matter change-bar scenarios (CR 155), plus 2 tab-panel edit scenarios, plus 2 empty-document Start writing hint scenarios (CR 156), plus 2 keyboard table-cell scenarios (CR 157), plus 1 Edit figure button scenario (CR 161), plus 1 release showcase scenario (CR 166), plus 1 alert body editing scenario, plus 1 admonition body editing scenario (CR 200), plus 4 grid card editor layout scenarios (CR 203), plus 2 radio choice plan scenarios (CR 214), plus 8 link edit mode scenarios (CR 217), plus 2 link list hint scenarios (CR 220)");
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
  const visual = path.resolve(__dirname, "../../../test/visual");
  const source = fs.readFileSync(path.join(visual, "capture.py"), "utf8");
  // The check code: the capture_*.py modules, and capture.py before the campaign driver
  // (`capture_scenarios`, `main`).
  const modules = fs.readdirSync(visual).filter((name) => /^capture_\w+\.py$/u.test(name)).sort();
  assert.ok(modules.length > 0);
  const capture = [
    ...modules.map((name) => fs.readFileSync(path.join(visual, name), "utf8")),
    source.slice(0, source.indexOf("def capture_scenarios")),
  ].join("\n");
  assert.ok(capture.length > 1000);
  // No check may branch on a scenario id: not by comparison, membership or prefix/suffix tests.
  assert.doesNotMatch(capture, /scenario\[["']id["']\]\s*(==|!=|in\b|not in\b)/u);
  assert.doesNotMatch(capture, /scenario\[["']id["']\]\.(startswith|endswith)\(/u);
  assert.doesNotMatch(capture, /scenario\.get\(["']id["']/u);
});

test("integration test rows name existing test files", () => {
  assert.equal(INTEGRATION_TESTS.length, 30, "28 rows plus the edit-keys test (CR 119) and the window-switch keys test (CR 129)");
  for (const row of INTEGRATION_TESTS) {
    assert.ok(isGroupId(row.group), row.file);
    assert.ok(fs.existsSync(path.resolve(__dirname, "../../..", row.file)), row.file);
  }
});
