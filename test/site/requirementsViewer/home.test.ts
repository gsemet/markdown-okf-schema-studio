import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { GROUPS } from "../../shared/e2eGroups";
import { fixtureReport, requirement } from "./fixture";
import { homePage, extractMarkerSnippet } from "./home";
import { EXAMPLE_SWRS_ID, parseRequirementsReport } from "./model";

function load(raw = fixtureReport()) {
  const model = parseRequirementsReport(raw, "abc123");
  assert.ok(model);
  return model;
}

test("home: layers, areas, sections and figures", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  const { body } = homePage(load(), "/nonexistent-root");
  assert.ok(body.includes('class="layers"') && body.includes("StRS · 2") && body.includes("SwRS · 6") && body.includes("75% linked"));
  assert.equal(body.match(/<a class="arow"/gu)?.length, 2);
  assert.ok(body.includes('href="gfm/"') && body.includes("GitHub Flavored Markdown"));
  for (const heading of ["What the requirements are", "Why we keep them", "How it works", "A real example", "What keeps it in sync", "The figures", "Retired requirements"]) {
    assert.ok(body.includes(heading), heading);
  }
  assert.ok(body.includes("<svg") && body.includes("@implements_req") && body.includes("@tests_req"));
  assert.ok(body.includes("<strong>80%</strong><span>implemented (4 of 5)"));
  assert.ok(body.includes("<strong>100%</strong><span>tested (5 of 5)"));
  assert.ok(body.includes("2 of 2") && body.includes("StRS with a stakeholder validation test"));
  assert.ok(body.includes("okfreq validate") && body.includes("okfreq update-coverage --check"));
  assert.ok(body.includes("<td>archived</td><td>0</td><td>1</td>") && body.includes("<td>superseded</td><td>1</td><td>1</td>"));
  assert.ok(body.includes("Scenario: Toggle &lt;b&gt;") && !body.includes("Toggle <b>"), "text from the report is escaped");
  assert.ok(body.includes(`<a href="gfm/${EXAMPLE_SWRS_ID}/"><code>${EXAMPLE_SWRS_ID}</code></a>`), "the example links its behaviour page");
  assert.ok(!body.includes("Browse the requirements"));
});

test("home lists the 16 areas", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  const raw = JSON.stringify({ requirements: GROUPS.map((group, index) => requirement(`StRS-X-${100 + index}`, "StRS", group.id)) });
  const { body } = homePage(load(raw), "/nonexistent-root");
  assert.equal(body.match(/<a class="arow"/gu)?.length, 16);
});

test("home degrades without a report", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  const { body } = homePage(undefined, "/nonexistent-root");
  assert.ok(body.includes("The requirements report was not generated"));
  assert.ok(body.includes("<svg"), "the diagram does not depend on the report");
  assert.ok(!body.includes('class="req-stats"') && !body.includes('class="arow'));
});

test("an empty report shows n/a", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  const { body } = homePage(load(JSON.stringify({ requirements: [] })), "/nonexistent-root");
  assert.ok(body.includes("<strong>n/a</strong>") && !body.includes("NaN"));
  assert.ok(!body.includes("A real example"));
});

test("marker snippets come from the repository files and fall back to the path", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  const source = ["a", "// @implements_req SwRS-X-001", "export function <f>() {}", "1", "2", "3", "4", "5", "6", "7"].join("\n");
  const snippet = extractMarkerSnippet(source, "SwRS-X-001", "src/a.ts");
  assert.equal(snippet?.line, 2);
  assert.equal(snippet?.code.split("\n").length, 8, "one line before and six after the marker");
  assert.equal(extractMarkerSnippet(source, "SwRS-X-002", "src/a.ts"), undefined);
  assert.equal(extractMarkerSnippet("x // @implements_req SwRS-X-001", "SwRS-X-001", "f"), undefined, "a marker after code is not a marker");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    fs.mkdirSync(path.join(root, "src"));
    fs.writeFileSync(path.join(root, "src", "a.ts"), `// @implements_req ${EXAMPLE_SWRS_ID}\nexport function <f>() {}\n`);
    const { body } = homePage(load(), root);
    assert.ok(body.includes("<code>src/a.ts:1</code>"));
    assert.ok(body.includes("export function &lt;f&gt;() {}"), "snippet is escaped");
    assert.ok(body.includes(`<pre tabindex="0" role="region" aria-label="Marker in src/a.ts">`), "a scrollable block is focusable and named");
    assert.ok(body.includes("<code>test/a.test.ts</code>") && body.includes("could not be read"), "the unreadable test file keeps its path");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
