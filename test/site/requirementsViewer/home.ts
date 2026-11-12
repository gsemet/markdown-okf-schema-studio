import * as fs from "node:fs";
import * as path from "node:path";

import { escapeHtml } from "../socialCard";
import type { ExampleSwrs, RequirementsStats, ViewerModel } from "./model";
import type { PageSpec } from "./shell";
import { VIEWER_DIR, areaDir, dirLink, pageLink } from "./urls";

/** The home page of the viewer: the layers, the areas, then what the requirements are and the figures. */

const e = escapeHtml;

function percent(part: number, whole: number): string {
  if (whole === 0) return "n/a";
  const value = (part / whole) * 100;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function diagram(): string {
  const boxes: { x: number; name: string; lines: string[]; mono?: string }[] = [
    { x: 20, name: "StRS", lines: ["A use case a person can", "observe in VS Code", "(user need)"] },
    { x: 260, name: "SwRS", lines: ["One behaviour with its", "scenarios (nominal, refusal,", "boundary), derived from StRS"] },
    { x: 500, name: "Code", lines: ["The source that produces", "the behaviour carries the", "marker, next to it"], mono: "@implements_req" },
    { x: 740, name: "Test", lines: ["The test that checks the", "behaviour carries the", "marker, in the test"], mono: "@tests_req" },
  ];
  const shapes = boxes.map((box) => {
    const lines = box.lines.map((line, index) => `<text class="note" x="${box.x + 16}" y="${96 + index * 18}">${e(line)}</text>`).join("");
    const mono = box.mono ? `<text class="mono" x="${box.x + 16}" y="70">${e(box.mono)}</text>` : "";
    return `<rect class="box" x="${box.x}" y="30" width="200" height="130" rx="10"/>`
      + `<text class="name" x="${box.x + 16}" y="${box.mono ? 54 : 58}">${e(box.name)}</text>${mono}${lines}`;
  }).join("");
  const arrows = [220, 460, 700].map((x) => `<path class="arrow" d="M${x + 4} 95 H${x + 30}"/><path class="arrow-head" d="M${x + 38} 95 l-9 -5 v10 z"/>`).join("");
  const cross = `<rect class="box-cross" x="260" y="200" width="230" height="50" rx="10"/>`
    + `<text class="note" x="276" y="222">Cross-cutting rules, written once</text>`
    + `<text class="note" x="276" y="239">and cited with depends_on</text>`
    + `<path class="arrow-cross" d="M375 200 V164"/><path class="arrow-head cross" d="M375 162 l-5 9 h10 z"/>`;
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
  const caption = (file: string, line?: number) => `<p class="req-kind">${kind} <code>${e(file)}${line ? `:${line}` : ""}</code></p>`;
  if (snippet) return `${caption(snippet.file, snippet.line)}<pre tabindex="0" role="region" aria-label="Marker in ${e(snippet.file)}"><code>${e(snippet.code)}</code></pre>`;
  const file = files[0];
  return file ? `${caption(file)}<p class="req-missing">The marker could not be read from this file when the site was built.</p>` : "";
}

function renderExample(model: ViewerModel, example: ExampleSwrs, root: string): string {
  const scenario = example.scenario.length === 0 ? "" : `<p class="req-kind">Scenario: ${e(example.scenarioName)}</p><ul>${
    example.scenario.map((line) => `<li>${e(line)}</li>`).join("")}</ul>`;
  const implemented = findSnippet(root, example.implementedIn, example.id);
  const tested = findSnippet(root, example.testedIn, example.id);
  const href = pageLink(model, VIEWER_DIR, example.id);
  const id = href ? `<a href="${href}"><code>${e(example.id)}</code></a>` : `<code>${e(example.id)}</code>`;
  return `<h3>A real example</h3>
<p>This requirement is read from the report and the repository as they stand: its statement, a scenario, then the two comments that tie it to the code and to the test.</p>
<article class="req-example">
<p class="req-kind">${id}${example.derivesFrom.length > 0 ? ` &middot; derives from <code>${e(example.derivesFrom.join(", "))}</code>` : ""}${example.dependsOn.length > 0 ? ` &middot; cites ${example.dependsOn.length} cross-cutting rule${example.dependsOn.length === 1 ? "" : "s"}` : ""}</p>
<h4>${e(example.title)}</h4>
<p>${e(example.statement)}</p>
${scenario}
${renderSnippet("In the code, the marker next to the implementation:", implemented, example.implementedIn)}
${renderSnippet("In the test, the marker above the test that checks it:", tested, example.testedIn)}
</article>`;
}

function renderStats(model: ViewerModel): string {
  const stats: RequirementsStats = model.stats;
  const titles = new Map(model.areas.map((area) => [area.id, area]));
  const card = (value: string | number, label: string) => `<div class="req-stat"><strong>${e(String(value))}</strong><span>${e(label)}</span></div>`;
  const lifecycles = [...stats.activeLifecycles.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => `${count} ${e(name)}`).join(", ");
  const rows = stats.scopes.map((scope) => {
    const area = titles.get(scope.scope);
    const name = area ? `<a href="${dirLink(VIEWER_DIR, areaDir(scope.scope))}">${e(area.title)}</a>` : e(scope.scope);
    return `<tr><td>${name}</td><td>${scope.strs}</td><td>${scope.swrs}</td><td>${scope.implemented} / ${scope.targets}</td><td>${scope.tested} / ${scope.targets}</td></tr>`;
  }).join("");
  const retiredRows = stats.retired.map((row) => `<tr><td>${e(row.lifecycle)}</td><td>${row.strs}</td><td>${row.swrs}</td></tr>`).join("");
  const generated = stats.generatedAt ? ` Report generated ${e(stats.generatedAt)}.` : "";
  return `<h2>The figures</h2>
<p class="hint">Counts come from the <code>okfreq generate-report</code> JSON and cover active requirements only (${lifecycles || "none"}); retired ones are counted below.${generated}</p>
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
<h3>Per area</h3>
<div class="req-table-wrap"><table class="req-table"><thead><tr><th>Area</th><th>StRS</th><th>SwRS</th><th>Implemented</th><th>Tested</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><td>Total</td><td>${stats.activeStrs}</td><td>${stats.activeSwrs}</td><td>${stats.implemented} / ${stats.targets}</td><td>${stats.tested} / ${stats.targets}</td></tr></tfoot></table></div>
<h3>Retired requirements</h3>
<p class="hint">Kept for their identifiers, never counted above and exempt from markers; the History button shows them.</p>
<div class="req-table-wrap"><table class="req-table"><thead><tr><th>Lifecycle</th><th>StRS</th><th>SwRS</th></tr></thead><tbody>${retiredRows || '<tr><td colspan="3">None</td></tr>'}</tbody></table></div>`;
}

function layersAndAreas(model: ViewerModel): string {
  const linked = model.linkedPercent === undefined ? "n/a" : `${model.linkedPercent}%`;
  const rows = model.areas.map((area) => `<a class="arow" href="${dirLink(VIEWER_DIR, areaDir(area.id))}"><span class="sw" style="background:${e(area.colour)}"></span><span class="name">${e(area.title)}</span><span class="desc">${e(area.description)}</span><span class="num">${area.useCases}</span><span class="num">${area.behaviours}</span></a>`);
  return `<ol class="layers">
  <li><b>Use case</b><span>What a user does and gets, from start to end. Written for a person.</span><code>StRS · ${model.stats.activeStrs}</code></li>
  <li><b>Behaviour</b><span>One rule the software follows, small enough to test on its own.</span><code>SwRS · ${model.stats.activeSwrs}</code></li>
  <li><b>Code and tests</b><span>The files that implement each behaviour and the tests that check it.</span><code>${e(linked)} linked</code></li>
</ol>
<h2>Areas</h2>
<p class="hint">Requirements are grouped by product area; open one to read its use cases.</p>
<div class="areas"><div class="arow head"><span></span><span class="name">Area</span><span class="desc">Covers</span><span class="num">Use cases</span><span class="num">Behaviours</span></div>${rows.join("")}</div>`;
}

export const HOME_DESCRIPTION = "Every feature of Studio written down as use cases, behaviours, code and tests, each linked to the next.";

/** The home page. Without a model (no report) it says so and shows no figure and no area. */
export function homePage(model: ViewerModel | undefined, root: string): PageSpec {
  const missing = `<h2>The figures</h2><p class="req-missing">The requirements report was not generated, so there are no figures or areas to show. Run <code>just requirements-report</code> and rebuild the site.</p>`;
  const body = `
<h1>Requirements of Markdown OKF-Schema Studio</h1>
<p class="lead">Every feature of Studio is written down at three levels, each one linked to the next.</p>
${model ? layersAndAreas(model) : ""}
<h2>What the requirements are</h2>
<p class="hint">A <strong>StRS</strong> is a use case: something a writer, reviewer or maintainer can do and see in VS Code. A <strong>SwRS</strong> is one observable behaviour of the extension, written with its scenarios (given, when, then); a rule many behaviours share is written once and cited by the others. They say what Studio does today, never what we would like it to do.</p>
<h2>Why we keep them</h2>
<p class="hint">The documented behaviour stays equal to the code, a behaviour that looks wrong is written down as a known issue, we know which test checks which behaviour, and a change is reviewed against the requirement, the code and the test together.</p>
<h2>How it works</h2>
<p class="hint">A use case is refined into behaviours, and each behaviour is anchored by a one-line comment holding its identifier: <code>@implements_req</code> where the code produces it, <code>@tests_req</code> in the test that checks it.</p>
<div class="req-diagram">${diagram()}</div>
${model?.example ? renderExample(model, model.example, root) : ""}
<h3>What keeps it in sync</h3>
<p class="hint">CI runs <code>okfreq validate</code> on the files and links, <code>okfreq lint --check</code> on the navigation and <code>okfreq update-coverage --check</code> on the markers, so a change that moves marked code or tests moves the markers in the same commit.</p>
${model ? renderStats(model) : missing}
`;
  return {
    dir: VIEWER_DIR, level: "areas", body,
    title: "Requirements of Markdown OKF-Schema Studio",
    description: HOME_DESCRIPTION,
    crumbs: [{ text: "Areas" }],
  };
}
