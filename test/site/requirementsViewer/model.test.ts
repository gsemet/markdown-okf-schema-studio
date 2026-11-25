import * as assert from "node:assert/strict";
import { test } from "node:test";

import { DIAGRAM_SOURCE, fixtureReport } from "./fixture";
import { EXAMPLE_SWRS_ID, behavioursOf, parseKnownIssues, parseRequirementsReport, parseScenarios, replacementsOf } from "./model";

function model() {
  const parsed = parseRequirementsReport(fixtureReport(), "abc123");
  assert.ok(parsed);
  return parsed;
}

test("the model separates active from retired by req_lifecycle and reads the older key", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-083#S1
  const m = model();
  assert.deepEqual(m.retired.map((r) => r.id), ["StRS-X-002", "SwRS-X-015", "SwRS-X-016"]);
  assert.equal(m.byId.get("SwRS-X-014")?.lifecycle, "proposed", "lifecycle is the fallback of req_lifecycle");
  assert.equal(m.byId.get("SwRS-X-014")?.active, true);
  assert.equal(m.stats.activeStrs, 2);
  assert.equal(m.stats.activeSwrs, 6);
  assert.deepEqual(m.stats.retired, [
    { lifecycle: "archived", strs: 0, swrs: 1 },
    { lifecycle: "superseded", strs: 1, swrs: 1 },
  ]);
  assert.deepEqual(replacementsOf(m, m.byId.get("SwRS-X-015")!).map((r) => r.id), ["SwRS-X-014"]);
  assert.deepEqual(replacementsOf(m, m.byId.get("StRS-X-002")!).map((r) => r.id), ["StRS-X-001"]);
  assert.equal(m.sha, "abc123");
});

test("the model counts the figures of active requirements and the areas", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069#S1
  const { stats, areas } = model();
  assert.equal(stats.targets, 5);
  assert.equal(stats.implemented, 4);
  assert.equal(stats.tested, 5);
  assert.equal(stats.fullyTraceable, 4);
  assert.equal(stats.exemptions, 1);
  assert.equal(stats.knownIssues, 2, "the notes of a retired SwRS are not counted");
  assert.equal(stats.swrsWithKnownIssue, 1);
  assert.equal(stats.strsValidated, 2);
  assert.deepEqual(areas.map((a) => [a.id, a.useCases, a.behaviours, a.linkedPercent]), [["gfm", 2, 5, 80], ["myst", 0, 1, undefined]]);
  assert.deepEqual(stats.scopes.map((s) => s.scope), ["gfm", "myst"]);
  for (const raw of ["", "not json", "[]", '{"requirements": 3}']) assert.equal(parseRequirementsReport(raw), undefined);
  const empty = parseRequirementsReport(JSON.stringify({ requirements: [] }));
  assert.equal(empty?.example, undefined);
  assert.equal(empty?.areas.length, 0);
});

test("the model reads scenarios, files, parents, paths and known issues", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082#S3
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082#S4
  const m = model();
  const go = m.byId.get("SwRS-X-011")!;
  assert.deepEqual(go.scenarios.map((s) => [s.kind, s.name]), [["nominal", "Go on"], ["boundary", "Go on twice"]]);
  assert.deepEqual(go.scenarios[0]?.steps, ["GIVEN a box", "WHEN it is <clicked>", "THEN it flips and stays"]);
  assert.deepEqual(go.knownIssues, ["Known issue: first", "Known issue: second"]);
  assert.deepEqual(go.implementedIn, ["src/a.ts"]);
  assert.deepEqual(m.byId.get("SwRS-X-013")?.derivesFrom, ["StRS-X-001", "StRS-X-003"]);
  assert.equal(m.byId.get("SwRS-X-013")?.exempt, true);
  assert.deepEqual(behavioursOf(m, "StRS-X-003").map((r) => r.id), [EXAMPLE_SWRS_ID, "SwRS-X-013", "SwRS-X-014"]);
  assert.deepEqual([...m.paths.keys()], ["StRS-X-001"]);
  assert.equal(m.byId.get("StRS-X-001")?.diagram, DIAGRAM_SOURCE, "the diagram before Main paths is read and Main paths still parse");
  assert.equal(m.byId.get("StRS-X-003")?.diagram, undefined);
  assert.equal(m.byId.get("StRS-X-002")?.diagram, undefined, "a retired StRS has no diagram");
  assert.equal(m.diagrams.size, 0, "the writer fills the drawings, not the parser");
  assert.equal(m.paths.get("StRS-X-001")?.[0]?.steps.length, 3);
  assert.equal(m.example?.id, EXAMPLE_SWRS_ID);
  assert.deepEqual(parseScenarios("### Scenario: no kind\n\n- GIVEN a\n- WHEN b\n- THEN c\n")[0]?.kind, "nominal");
  assert.deepEqual(parseKnownIssues("- Known issue (CR 1): not counted\n- Known issue: counted\n"), ["Known issue: counted"]);
});

test("the model reads table scenarios, notes and mixed scenarios in source order", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082#S3
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082#S4
  const m = model();
  const [table, mixed] = m.byId.get("SwRS-X-014")!.scenarios;
  assert.deepEqual(table?.blocks.map((b) => b.type), ["table"]);
  assert.deepEqual(table?.blocks[0], {
    type: "table",
    header: ["Input", "Outcome"],
    rows: [["`a | b`", "kept"], ["<b> &lt;", "decoded once"]],
  }, "the separator line is skipped, the escaped pipe is a pipe, the entities decode once");
  assert.deepEqual(table?.steps, []);
  assert.deepEqual(mixed?.blocks.map((b) => b.type), ["steps", "note", "note", "table"]);
  assert.deepEqual(mixed?.blocks[0], { type: "steps", lines: ["GIVEN a box", 'WHEN it is "x"', "THEN it flips"] });
  assert.deepEqual(mixed?.steps, ["GIVEN a box", 'WHEN it is "x"', "THEN it flips"]);
  assert.deepEqual(mixed?.blocks[1], { type: "note", text: 'A note line "x" under the steps.' });
  assert.deepEqual(mixed?.blocks[2], { type: "note", text: "A bullet note" });
  assert.deepEqual(mixed?.blocks[3], { type: "table", header: ["Given", "When", "Then"], rows: [["a", "b", "c"]] });
  const list = m.byId.get("SwRS-X-011")!.scenarios[0]!;
  assert.equal(list.blocks.length, 1);
  assert.deepEqual(list.blocks[0], { type: "steps", lines: [...list.steps] });
});

test("a scenario heading carries its S<n> id, and the older heading has none", () => {
  const [withId, older] = parseScenarios("### Scenario S3 (boundary): Twice\n\n- GIVEN a\n\n### Scenario (refusal): Old\n\n- GIVEN b\n");
  assert.equal(withId?.id, "S3");
  assert.equal(withId?.kind, "boundary");
  assert.equal(withId?.name, "Twice");
  assert.equal(older?.id, "");
  assert.equal(older?.kind, "refusal");
});
