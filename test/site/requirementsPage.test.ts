import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { pageDocument } from "./buildSite";
import {
  EXAMPLE_SWRS_ID,
  extractMarkerSnippet,
  parseRequirementsReport,
  renderRequirementsPage,
  writeRequirementsPage,
} from "./requirementsPage";

interface FixtureOptions {
  readonly lifecycle?: string;
  readonly exempt?: boolean;
  readonly target?: boolean;
  readonly implemented?: boolean;
  readonly tested?: boolean;
  readonly text?: string;
}

function requirement(id: string, tier: "StRS" | "SwRS", scope: string, options: FixtureOptions = {}): unknown {
  const target = options.target ?? tier === "SwRS";
  return {
    id,
    tier,
    scope,
    text: options.text ?? "",
    frontmatter: {
      id,
      tier,
      scope,
      title: `Title of ${id}`,
      description: `When x, the extension SHALL do ${id}.`,
      lifecycle: options.lifecycle ?? "draft",
      annotation_exemption: options.exempt ?? false,
      derives_from: tier === "SwRS" ? ["StRS-X-001"] : [],
      implemented_in_files: ["src/a.ts"],
      tested_in_files: ["test/a.test.ts"],
    },
    coverage_target: target,
    implementation: { status: options.implemented === false ? "missing" : "covered" },
    tests: { status: options.tested === false ? "missing" : "covered" },
    stakeholder_test_coverage: tier === "StRS" ? { status: "covered" } : undefined,
  };
}

const KNOWN_ISSUES_TEXT = "### Known issues\n\n- Known issue: first\n- Known issue: second\n";
const EXAMPLE_TEXT = "## T\n\n### Scenario (nominal): Toggle <b>\n\n- GIVEN a box\n- WHEN it is clicked\n- THEN it flips\n\n### Scenario (refusal): x\n";

function fixture(): string {
  return JSON.stringify({
    generated_at: "2026-10-25T10:00:00+00:00",
    requirements: [
      requirement("StRS-X-001", "StRS", "gfm"),
      requirement("StRS-X-002", "StRS", "myst", { lifecycle: "superseded" }),
      requirement(EXAMPLE_SWRS_ID, "SwRS", "gfm", { text: EXAMPLE_TEXT + KNOWN_ISSUES_TEXT }),
      requirement("SwRS-X-002", "SwRS", "gfm", { implemented: false }),
      requirement("SwRS-X-003", "SwRS", "myst", { exempt: true, target: false }),
      requirement("SwRS-X-004", "SwRS", "myst", { lifecycle: "superseded", text: KNOWN_ISSUES_TEXT }),
      requirement("SwRS-X-005", "SwRS", "myst", { lifecycle: "archived" }),
    ],
  });
}

test("report figures count active requirements only", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  const stats = parseRequirementsReport(fixture());
  assert.ok(stats);
  assert.equal(stats.activeStrs, 1);
  assert.equal(stats.activeSwrs, 3);
  assert.equal(stats.targets, 2);
  assert.equal(stats.implemented, 1);
  assert.equal(stats.tested, 2);
  assert.equal(stats.fullyTraceable, 1);
  assert.equal(stats.exemptions, 1);
  assert.equal(stats.knownIssues, 2, "the superseded SwRS notes are not counted");
  assert.equal(stats.swrsWithKnownIssue, 1);
  assert.equal(stats.strsValidated, 1);
  assert.deepEqual(stats.retired, [
    { lifecycle: "archived", strs: 0, swrs: 1 },
    { lifecycle: "superseded", strs: 1, swrs: 1 },
  ]);
  assert.deepEqual(stats.scopes.map((scope) => [scope.scope, scope.strs, scope.swrs, scope.implemented, scope.targets]), [
    ["gfm", 1, 2, 1, 2],
    ["myst", 0, 1, 0, 0],
  ]);
  assert.equal(stats.example?.id, EXAMPLE_SWRS_ID);
  assert.deepEqual(stats.example?.scenario, ["GIVEN a box", "WHEN it is clicked", "THEN it flips"]);
  const html = renderRequirementsPage(stats);
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("<strong>50%</strong><span>implemented (1 of 2)"));
  assert.ok(html.includes("Retired requirements"));
  assert.ok(html.includes("Scenario: Toggle &lt;b&gt;"), "text from the report is escaped");
  assert.ok(!html.includes("Toggle <b>"));
});

test("a missing or invalid report degrades the page", () => {
  for (const raw of ["", "not json", "[]", "{\"requirements\": 3}"]) assert.equal(parseRequirementsReport(raw), undefined);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    const frame = (body: string) => pageDocument("requirements", "requirements.html", body);
    for (const reportPath of [path.join(root, "absent.json"), path.join(root, "broken.json")]) {
      fs.writeFileSync(path.join(root, "broken.json"), "{");
      const output = path.join(root, "site", "requirements.html");
      writeRequirementsPage(output, reportPath, frame);
      const html = fs.readFileSync(output, "utf8");
      assert.ok(html.includes("The requirements report was not generated"));
      assert.ok(html.includes("<svg"), "the diagram does not depend on the report");
      assert.ok(!html.includes('class="req-stats"'));
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an empty report shows n/a", () => {
  const stats = parseRequirementsReport(JSON.stringify({ requirements: [] }));
  assert.ok(stats);
  assert.equal(stats.example, undefined);
  const html = renderRequirementsPage(stats);
  assert.ok(html.includes("<strong>n/a</strong>"));
  assert.ok(!html.includes("NaN"));
  assert.ok(!html.includes("A real example"));
});

test("the built site links and writes the Requirements page", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    for (const [currentPage, prefix] of [["index.html", ""], ["docs/guide.html", "../"]]) {
      assert.ok(pageDocument("Studio", currentPage, "").includes(`<a href="${prefix}requirements.html">Requirements</a>`));
    }
    const reportPath = path.join(root, "report.json");
    fs.writeFileSync(reportPath, fixture());
    const output = path.join(root, "site", "requirements.html");
    writeRequirementsPage(output, reportPath, (body) => pageDocument("requirements", "requirements.html", body));
    const html = fs.readFileSync(output, "utf8");
    assert.ok(html.includes("<title>requirements | Markdown OKF-Schema Studio</title>"));
    assert.ok(html.includes("prefers-color-scheme: dark"));
    assert.ok(html.includes(`<code>${EXAMPLE_SWRS_ID}</code>`));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("marker snippets come from the repository files and fall back to the path", () => {
  const source = ["a", "// @implements_req SwRS-X-001", "export function <f>() {}", "1", "2", "3", "4", "5", "6", "7"].join("\n");
  const snippet = extractMarkerSnippet(source, "SwRS-X-001", "src/a.ts");
  assert.equal(snippet?.line, 2);
  assert.equal(snippet?.code.split("\n").length, 8, "one line before and six after the marker");
  assert.equal(extractMarkerSnippet(source, "SwRS-X-002", "src/a.ts"), undefined);
  assert.equal(extractMarkerSnippet("x // @implements_req SwRS-X-001", "SwRS-X-001", "f"), undefined, "a marker after code is not a marker");

  const stats = parseRequirementsReport(fixture());
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    fs.mkdirSync(path.join(root, "src"));
    fs.mkdirSync(path.join(root, "test"));
    fs.writeFileSync(path.join(root, "src", "a.ts"), `// @implements_req ${EXAMPLE_SWRS_ID}\nexport function <f>() {}\n`);
    const html = renderRequirementsPage(stats, root);
    assert.ok(html.includes("<code>src/a.ts:1</code>"));
    assert.ok(html.includes("export function &lt;f&gt;() {}"), "snippet is escaped");
    assert.ok(html.includes("<code>test/a.test.ts</code>"), "the unreadable test file keeps its path");
    assert.ok(html.includes("could not be read"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  const html = renderRequirementsPage(stats, "/nonexistent-root");
  assert.ok(html.includes("<code>src/a.ts</code>") && html.includes("Browse the requirements"));
});
