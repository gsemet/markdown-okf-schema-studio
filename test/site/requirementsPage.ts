import * as fs from "node:fs";
import * as path from "node:path";

/** Lifecycles that leave a requirement out of the active count; they are counted separately. */
const RETIRED_LIFECYCLES: ReadonlySet<string> = new Set(["superseded", "deprecated", "archived"]);

/** The SwRS shown as a worked example when the report holds it. */
export const EXAMPLE_SWRS_ID = "SwRS-MDOKFSTUDIO-GFM-021";

export interface ScopeStats {
  readonly scope: string;
  readonly strs: number;
  readonly swrs: number;
  readonly targets: number;
  readonly implemented: number;
  readonly tested: number;
}

export interface RetiredStats {
  readonly lifecycle: string;
  readonly strs: number;
  readonly swrs: number;
}

export interface ExampleSwrs {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly derivesFrom: readonly string[];
  readonly dependsOn: readonly string[];
  readonly scenario: readonly string[];
  readonly scenarioName: string;
  readonly implementedIn: readonly string[];
  readonly testedIn: readonly string[];
}

export interface RequirementsStats {
  readonly generatedAt: string;
  readonly activeStrs: number;
  readonly activeSwrs: number;
  /** Active requirements per lifecycle value (draft, approved...). */
  readonly activeLifecycles: ReadonlyMap<string, number>;
  readonly retired: readonly RetiredStats[];
  /** Active SwRS that need markers (not exempt). */
  readonly targets: number;
  readonly implemented: number;
  readonly tested: number;
  readonly fullyTraceable: number;
  /** Active SwRS with an annotation exemption. */
  readonly exemptions: number;
  readonly knownIssues: number;
  readonly swrsWithKnownIssue: number;
  readonly strsValidated: number;
  readonly scopes: readonly ScopeStats[];
  readonly example?: ExampleSwrs;
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function statusOf(value: unknown): string {
  return isRecord(value) ? text(value.status) : "";
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function exampleFrom(requirement: Json, frontmatter: Json): ExampleSwrs {
  const body = text(requirement.text);
  const start = body.search(/^### Scenario[^\n]*:/mu);
  const section = start < 0 ? "" : body.slice(start).split(/\n### /u)[0] ?? "";
  const [heading = "", ...rest] = section.split("\n");
  const scenarioName = /:\s*(.+)$/u.exec(heading)?.[1]?.trim() ?? "";
  const scenario = rest.map((line) => line.replace(/^-\s+/u, "").trim())
    .filter((line) => /^(GIVEN|WHEN|THEN|AND)\b/u.test(line));
  return {
    id: text(requirement.id),
    title: text(frontmatter.title),
    statement: text(frontmatter.description),
    derivesFrom: textList(frontmatter.derives_from),
    dependsOn: textList(frontmatter.depends_on),
    scenarioName,
    scenario,
    implementedIn: textList(frontmatter.implemented_in_files),
    testedIn: textList(frontmatter.tested_in_files),
  };
}

/** Parse the okfreq report JSON; returns undefined when it is not a usable report. */
export function parseRequirementsReport(raw: string): RequirementsStats | undefined {
  let report: unknown;
  try {
    report = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(report) || !Array.isArray(report.requirements)) return undefined;

  const scopes = new Map<string, { strs: number; swrs: number; targets: number; implemented: number; tested: number }>();
  const scopeOf = (name: string) => {
    let entry = scopes.get(name);
    if (!entry) scopes.set(name, entry = { strs: 0, swrs: 0, targets: 0, implemented: 0, tested: 0 });
    return entry;
  };
  const activeLifecycles = new Map<string, number>();
  const retired = new Map<string, { strs: number; swrs: number }>();
  let activeStrs = 0, activeSwrs = 0, targets = 0, implemented = 0, tested = 0, fullyTraceable = 0;
  let exemptions = 0, knownIssues = 0, swrsWithKnownIssue = 0, strsValidated = 0;
  let example: ExampleSwrs | undefined;

  for (const entry of report.requirements) {
    if (!isRecord(entry)) continue;
    const frontmatter = isRecord(entry.frontmatter) ? entry.frontmatter : {};
    const tier = text(entry.tier) || text(frontmatter.tier);
    if (tier !== "StRS" && tier !== "SwRS") continue;
    const lifecycle = text(frontmatter.lifecycle) || "unknown";
    if (RETIRED_LIFECYCLES.has(lifecycle)) {
      const row = retired.get(lifecycle) ?? { strs: 0, swrs: 0 };
      if (tier === "StRS") row.strs += 1; else row.swrs += 1;
      retired.set(lifecycle, row);
      continue;
    }
    increment(activeLifecycles, lifecycle);
    const scope = scopeOf(text(entry.scope) || text(frontmatter.scope) || "unknown");
    if (tier === "StRS") {
      activeStrs += 1;
      scope.strs += 1;
      if (statusOf(entry.stakeholder_test_coverage) === "covered") strsValidated += 1;
      continue;
    }
    activeSwrs += 1;
    scope.swrs += 1;
    if (frontmatter.annotation_exemption === true) exemptions += 1;
    const notes = (text(entry.text).match(/^\s*-\s+Known issue:/gmu) ?? []).length;
    knownIssues += notes;
    if (notes > 0) swrsWithKnownIssue += 1;
    if (entry.coverage_target === true) {
      const hasSource = statusOf(entry.implementation) === "covered";
      const hasTest = statusOf(entry.tests) === "covered";
      targets += 1;
      scope.targets += 1;
      if (hasSource) { implemented += 1; scope.implemented += 1; }
      if (hasTest) { tested += 1; scope.tested += 1; }
      if (hasSource && hasTest) fullyTraceable += 1;
    }
    if (text(entry.id) === EXAMPLE_SWRS_ID) example = exampleFrom(entry, frontmatter);
  }

  return {
    generatedAt: text(report.generated_at),
    activeStrs,
    activeSwrs,
    activeLifecycles,
    retired: [...retired.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([lifecycle, row]) => ({ lifecycle, ...row })),
    targets,
    implemented,
    tested,
    fullyTraceable,
    exemptions,
    knownIssues,
    swrsWithKnownIssue,
    strsValidated,
    scopes: [...scopes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([scope, row]) => ({ scope, ...row })),
    example,
  };
}

/** Read the report file; a missing or unreadable file gives undefined and never throws. */
export function loadRequirementsStats(reportPath: string): RequirementsStats | undefined {
  try {
    return parseRequirementsReport(fs.readFileSync(reportPath, "utf8"));
  } catch {
    return undefined;
  }
}

export const REQUIREMENTS_REPORT_PATH = (extensionRoot: string): string =>
  path.join(extensionRoot, "out", "reports", "requirements", "requirements-report.json");

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function percent(part: number, whole: number): string {
  if (whole === 0) return "n/a";
  const value = (part / whole) * 100;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

const PAGE_CSS = `
.req-lead { font-size: 1.1rem; color: var(--muted); }
.req-diagram { overflow-x: auto; margin: 1.5rem 0; padding: 1rem; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
.req-diagram svg { display: block; min-width: 680px; width: 100%; height: auto; }
.req-diagram .box { fill: var(--paper); stroke: var(--accent); stroke-width: 1.5; }
.req-diagram .box-cross { fill: none; stroke: var(--warm); stroke-width: 1.5; stroke-dasharray: 5 4; }
.req-diagram .name { fill: var(--accent-strong); font: 700 17px ui-sans-serif, -apple-system, "Segoe UI", sans-serif; }
.req-diagram .note { fill: var(--muted); font: 13px ui-sans-serif, -apple-system, "Segoe UI", sans-serif; }
.req-diagram .mono { fill: var(--ink); font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
.req-diagram .arrow { stroke: var(--accent); stroke-width: 2; fill: none; }
.req-diagram .arrow-head { fill: var(--accent); }
.req-diagram .arrow-cross { stroke: var(--warm); stroke-width: 1.5; stroke-dasharray: 5 4; fill: none; }
.req-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1.25rem 0; }
.req-stat { padding: .9rem 1rem; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
.req-stat strong { display: block; font-size: 1.9rem; line-height: 1.15; color: var(--accent-strong); font-variant-numeric: tabular-nums; }
.req-stat span { color: var(--muted); font-size: .88rem; }
.req-table-wrap { overflow-x: auto; }
.req-table { width: 100%; border-collapse: collapse; font-size: .92rem; font-variant-numeric: tabular-nums; }
.req-table th, .req-table td { padding: .45rem .7rem; border-bottom: 1px solid var(--line); text-align: right; }
.req-table th:first-child, .req-table td:first-child { text-align: left; }
.req-table th { color: var(--muted); font-weight: 700; }
.req-table tfoot td { font-weight: 700; border-top: 2px solid var(--line); }
.req-example { padding: 1rem 1.25rem; border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 8px; background: var(--panel); }
.req-example h4 { margin: .2rem 0 .6rem; }
.req-example pre { margin: .4rem 0 1rem; font-size: .85rem; }
.req-example ul { margin: .3rem 0 0; padding-left: 1.2rem; }
.req-example .req-kind { margin: 0; color: var(--muted); font-size: .85rem; }
.req-missing { padding: 1rem; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); background: var(--panel); }
`;

function diagram(): string {
  const boxes: Array<{ x: number; name: string; lines: string[]; mono?: string }> = [
    { x: 20, name: "StRS", lines: ["A use case a person can", "observe in VS Code", "(user need)"] },
    { x: 260, name: "SwRS", lines: ["One behaviour with its", "scenarios (nominal, refusal,", "boundary), derived from StRS"] },
    { x: 500, name: "Code", lines: ["The source that produces", "the behaviour carries the", "marker, next to it"], mono: "@implements_req" },
    { x: 740, name: "Test", lines: ["The test that checks the", "behaviour carries the", "marker, in the test"], mono: "@tests_req" },
  ];
  const shapes = boxes.map((box) => {
    const lines = box.lines.map((line, index) =>
      `<text class="note" x="${box.x + 16}" y="${96 + index * 18}">${escape(line)}</text>`).join("");
    const mono = box.mono ? `<text class="mono" x="${box.x + 16}" y="${70}">${escape(box.mono)}</text>` : "";
    return `<rect class="box" x="${box.x}" y="30" width="200" height="130" rx="10"/>`
      + `<text class="name" x="${box.x + 16}" y="${box.mono ? 54 : 58}">${escape(box.name)}</text>${mono}${lines}`;
  }).join("");
  const arrows = [220, 460, 700].map((x) =>
    `<path class="arrow" d="M${x + 4} 95 H${x + 30}"/><path class="arrow-head" d="M${x + 38} 95 l-9 -5 v10 z"/>`).join("");
  const cross = `<rect class="box-cross" x="260" y="200" width="230" height="50" rx="10"/>`
    + `<text class="note" x="276" y="222">Cross-cutting rules, written once</text>`
    + `<text class="note" x="276" y="239">and cited with depends_on</text>`
    + `<path class="arrow-cross" d="M375 200 V164"/><path class="arrow-head" d="M375 162 l-5 9 h10 z" style="fill: var(--warm)"/>`;
  return `<svg viewBox="0 0 960 270" role="img" aria-labelledby="req-diagram-title req-diagram-desc">`
    + `<title id="req-diagram-title">How a requirement is anchored to the code</title>`
    + `<desc id="req-diagram-desc">A use case (StRS) is refined into SwRS behaviours. Each behaviour is marked with @implements_req in the source and @tests_req in a test. Cross-cutting rules are cited by the SwRS that rely on them.</desc>`
    + `${shapes}${arrows}${cross}</svg>`;
}

const MARKER_LINE = /^\s*(?:\/\/|#|\/\*|\*|<!--)\s*@(?:implements|tests)_req\s+(\S+)/u;

export interface MarkerSnippet {
  readonly file: string;
  readonly line: number;
  readonly code: string;
}

/** The first marker line of `id` in `source`, with a line before and a few lines after it. */
export function extractMarkerSnippet(source: string, id: string, file: string, after = 6): MarkerSnippet | undefined {
  const lines = source.split(/\r?\n/u);
  const index = lines.findIndex((line) => MARKER_LINE.exec(line)?.[1] === id);
  if (index < 0) return undefined;
  const first = Math.max(0, index - 1);
  return { file, line: index + 1, code: lines.slice(first, index + 1 + after).join("\n") };
}

/** The first of `files` (under `root`) that holds a marker of `id`; unreadable files are skipped. */
function findSnippet(root: string, files: readonly string[], id: string): MarkerSnippet | undefined {
  for (const file of files) {
    try {
      const snippet = extractMarkerSnippet(fs.readFileSync(path.join(root, file), "utf8"), id, file);
      if (snippet) return snippet;
    } catch {
      continue;
    }
  }
  return undefined;
}

function renderSnippet(kind: string, snippet: MarkerSnippet | undefined, files: readonly string[]): string {
  const caption = (file: string, line?: number) => `<p class="req-kind">${kind} <code>${escape(file)}${line ? `:${line}` : ""}</code></p>`;
  if (snippet) return `${caption(snippet.file, snippet.line)}<pre><code>${escape(snippet.code)}</code></pre>`;
  const file = files[0];
  return file ? `${caption(file)}<p class="req-missing">The marker could not be read from this file when the site was built.</p>` : "";
}

function renderExample(example: ExampleSwrs, root: string): string {
  const scenario = example.scenario.length === 0 ? "" : `<p class="req-kind">Scenario: ${escape(example.scenarioName)}</p><ul>${
    example.scenario.map((line) => `<li>${escape(line)}</li>`).join("")}</ul>`;
  const implemented = findSnippet(root, example.implementedIn, example.id);
  const tested = findSnippet(root, example.testedIn, example.id);
  return `<h3>A real example</h3>
<p>This requirement is read from the report and the repository as they stand. Its statement and a scenario, then the two comments that tie it to the code and to the test.</p>
<article class="req-example">
<p class="req-kind"><code>${escape(example.id)}</code>${example.derivesFrom.length > 0 ? ` &middot; derives from <code>${escape(example.derivesFrom.join(", "))}</code>` : ""}${example.dependsOn.length > 0 ? ` &middot; cites ${example.dependsOn.length} cross-cutting rule${example.dependsOn.length === 1 ? "" : "s"}` : ""}</p>
<h4>${escape(example.title)}</h4>
<p>${escape(example.statement)}</p>
${scenario}
${renderSnippet("In the code, the marker next to the implementation:", implemented, example.implementedIn)}
${renderSnippet("In the test, the marker above the test that checks it:", tested, example.testedIn)}
</article>`;
}

function renderStats(stats: RequirementsStats): string {
  const card = (value: string | number, label: string) => `<div class="req-stat"><strong>${escape(String(value))}</strong><span>${escape(label)}</span></div>`;
  const lifecycles = [...stats.activeLifecycles.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => `${count} ${escape(name)}`).join(", ");
  const rows = stats.scopes.map((scope) => `<tr><td>${escape(scope.scope)}</td><td>${scope.strs}</td><td>${scope.swrs}</td><td>${scope.implemented} / ${scope.targets}</td><td>${scope.tested} / ${scope.targets}</td></tr>`).join("");
  const retiredRows = stats.retired.map((row) => `<tr><td>${escape(row.lifecycle)}</td><td>${row.strs}</td><td>${row.swrs}</td></tr>`).join("");
  const generated = stats.generatedAt ? ` Report generated ${escape(stats.generatedAt)}.` : "";
  return `<h2>The figures</h2>
<p>Counts come from the <code>okfreq generate-report</code> JSON and cover active requirements only (${lifecycles || "none"}); retired ones are counted below.${generated}</p>
<div class="req-stats">
${card(stats.activeStrs, "StRS use cases")}
${card(stats.activeSwrs, "SwRS behaviours")}
${card(percent(stats.implemented, stats.targets), `implemented (${stats.implemented} of ${stats.targets})`)}
${card(percent(stats.tested, stats.targets), `tested (${stats.tested} of ${stats.targets})`)}
${card(percent(stats.fullyTraceable, stats.targets), `fully traceable (${stats.fullyTraceable})`)}
${card(stats.exemptions, "SwRS with a marker exemption")}
${card(stats.knownIssues, `known issues in ${stats.swrsWithKnownIssue} SwRS`)}
${card(`${stats.strsValidated} of ${stats.activeStrs}`, "StRS with a stakeholder validation test")}
</div>
<h3>Per scope</h3>
<div class="req-table-wrap"><table class="req-table"><thead><tr><th>Scope</th><th>StRS</th><th>SwRS</th><th>Implemented</th><th>Tested</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><td>Total</td><td>${stats.activeStrs}</td><td>${stats.activeSwrs}</td><td>${stats.implemented} / ${stats.targets}</td><td>${stats.tested} / ${stats.targets}</td></tr></tfoot></table></div>
<h3>Retired requirements</h3>
<p>Kept for their identifiers, never counted above and exempt from markers.</p>
<div class="req-table-wrap"><table class="req-table"><thead><tr><th>Lifecycle</th><th>StRS</th><th>SwRS</th></tr></thead><tbody>${retiredRows || '<tr><td colspan="3">None</td></tr>'}</tbody></table></div>`;
}

/** Body of the Requirements page; the page frame comes from pageDocument. `root` is the repository root. */
export function renderRequirementsPage(stats: RequirementsStats | undefined, root = process.cwd()): string {
  const figures = stats
    ? renderStats(stats)
    : `<h2>The figures</h2><p class="req-missing">The requirements report was not generated, so there are no figures to show. Run <code>just requirements-report</code> and rebuild the site.</p>`;
  return `<style>${PAGE_CSS}</style>
<h1>Requirements</h1>
<p class="req-lead">The Studio is specified by requirements that describe what it does today. Each one is tied to the code that produces the behaviour and to the test that checks it.</p>
<h2>What the requirements are</h2>
<p>The requirements live in the repository, in a bundle managed by the <code>okfreq</code> tool. They come at two levels. A <strong>StRS</strong> (stakeholder requirement) is a use case: something a writer, reviewer or maintainer can do and see in VS Code. A <strong>SwRS</strong> (software requirement) is one observable behaviour of the extension, written with its scenarios: given a situation, when something happens, then this is the outcome. A rule that many behaviours share is written once and cited by the others. Together they specify what the Studio does today, never what we would like it to do.</p>
<h2>Why we keep them</h2>
<ul>
<li>The documented behaviour stays equal to the code, because each requirement is checked against the source and the tests.</li>
<li>Bugs become visible: a behaviour that looks wrong is written down as it behaves, under a "Known issue", and its fix is planned separately.</li>
<li>We know which test checks which behaviour, and which behaviour has no test.</li>
<li>A change can be reviewed against a contract: the requirement, the code and the test change together.</li>
</ul>
<h2>How it works</h2>
<p>A use case (StRS) is refined into behaviours (SwRS). Each behaviour is anchored in two places by a one-line comment holding its identifier: <code>@implements_req</code> where the code produces it, and <code>@tests_req</code> in the test that checks it.</p>
<div class="req-diagram">${diagram()}</div>
${stats?.example ? renderExample(stats.example, root) : ""}
<h3>What keeps it in sync</h3>
<p>The requirement checks run in CI with the other static checks (<code>just check</code> runs <code>just requirements-lint</code>): <code>okfreq validate</code> checks the requirement files and their links, <code>okfreq lint --check</code> checks the generated navigation, and <code>okfreq update-coverage --check</code> fails when a marker is missing, unknown or out of date. A change that moves marked code or tests moves the markers in the same commit.</p>
${figures}
<h2>Browse the requirements</h2>
<p>Browsing the requirements from this site, from a use case to its behaviours and their tests, with a page per requirement and a search, is planned and not available yet. Until then the requirements are readable in the repository, under <code>requirements/tiers/</code>.</p>`;
}

/** Write requirements.html; a missing or invalid report degrades the page and never throws. */
export function writeRequirementsPage(
  outputFile: string,
  reportPath: string,
  frame: (body: string) => string,
  root = path.resolve(path.dirname(reportPath), "..", "..", ".."),
): void {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, frame(renderRequirementsPage(loadRequirementsStats(reportPath), root)));
}
