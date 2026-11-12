import { escapeHtml } from "../socialCard";
import { kindClass, mapSummary, metroList, metroSvg, plural, scenarioDots, testCount } from "./layout";
import { citedIds, type MainPath } from "./mainPaths";
import { behavioursOf, replacementsOf, retiredBehavioursOf, type Area, type Requirement, type Scenario, type ViewerModel } from "./model";
import { VIEWER_DIR, areaDir, blobUrl, dirLink, pageLink, requirementDir, shortId } from "./urls";
import type { PageSpec } from "./shell";

/** The area, use case and behaviour pages: the body and the spec of each; the shell draws the frame. */

const e = escapeHtml;

function areaOf(model: ViewerModel, scope: string): Area {
  return model.areas.find((area) => area.id === scope) ?? { id: scope, title: scope, description: "", colour: "#1d4ed8", useCases: 0, behaviours: 0, linkedPercent: undefined };
}

/** "superseded by A, B" with links to the pages of active replacements, and the Markdown file on GitHub. */
function retiredNote(model: ViewerModel, fromDir: string, requirement: Requirement): string {
  const replacements = replacementsOf(model, requirement).map((replacement) => {
    const href = pageLink(model, fromDir, replacement.id);
    return href ? `<a href="${href}">${e(shortId(replacement.id))}</a>` : `<span>${e(shortId(replacement.id))}</span>`;
  });
  const by = replacements.length > 0 ? `superseded by ${replacements.join(", ")}` : requirement.lifecycle;
  return `<span class="tag">${e(requirement.lifecycle)}</span> <span class="by">${by}</span> <a class="src" href="${e(blobUrl(model, requirement.file))}">Markdown file</a>`;
}

function stripLead(need: string): string {
  return need.replace(/^As an? [^,]+, /u, "");
}

// ---------------------------------------------------------------- area

export function areaPage(model: ViewerModel, area: Area): PageSpec {
  const dir = areaDir(area.id);
  const cases = model.active.filter((requirement) => requirement.tier === "StRS" && requirement.scope === area.id);
  const items = cases.map((useCase) => {
    const count = behavioursOf(model, useCase.id).length;
    return `<li><a class="stop" href="${dirLink(dir, requirementDir(useCase))}"><span class="id">${e(shortId(useCase.id))}</span><span class="t">${e(useCase.title)}</span><span class="need">${e(stripLead(useCase.userNeed))}</span><span class="meta">${plural(count, "behaviour")}</span></a></li>`;
  });
  const retired = model.retired.filter((requirement) => requirement.tier === "StRS" && requirement.scope === area.id).map((useCase) =>
    `<li class="retired"><div class="stop"><span class="id">${e(shortId(useCase.id))}</span><span class="t">${e(useCase.title)}</span><span class="need">${retiredNote(model, dir, useCase)}</span></div></li>`);
  const linked = area.linkedPercent === undefined ? "n/a" : `${area.linkedPercent}%`;
  const body = `
<p class="eyebrow"><span class="sw" style="background:${e(area.colour)}"></span>Area</p>
<h1>${e(area.title)}</h1>
${area.description ? `<p class="lead">${e(area.description)}</p>` : ""}
<p class="facts"><b>${area.useCases}</b> use cases · <b>${area.behaviours}</b> behaviours · <b>${e(linked)}</b> linked to code and tests</p>
<h2>Use cases</h2>
<p class="hint">Each stop is a use case; open one to see how it is split into behaviours.</p>
<ol class="line">${items.join("")}${retired.join("")}</ol>
`;
  return {
    dir, level: "area", colour: area.colour, body,
    title: `${area.title}: use cases and behaviours`,
    description: area.description || `The use cases and behaviours of the ${area.title} area of Studio.`,
    crumbs: [{ text: "Areas", dir: VIEWER_DIR }, { text: area.title }],
  };
}

// ---------------------------------------------------------------- use case

function behaviourRow(model: ViewerModel, fromDir: string, behaviour: Requirement, onMap: ReadonlySet<string> | undefined): string {
  const tag = onMap && !onMap.has(behaviour.id) ? '<span class="tag">not on the map</span>' : "";
  return `<a class="brow" href="${pageLink(model, fromDir, behaviour.id) ?? ""}"><span class="id">${e(shortId(behaviour.id))}</span><span class="t">${e(behaviour.title)} ${tag}</span><span class="m">${scenarioDots(behaviour.scenarios)}</span><span class="m">${testCount(behaviour.testedIn.length)}</span></a>`;
}

function mapSection(model: ViewerModel, dir: string, paths: readonly MainPath[]): string {
  const summary = mapSummary(model, paths);
  const plays = paths.map((_, index) => `<button class="btn play" type="button" data-play="${index}">Play path ${index + 1}</button>`).join("");
  const keys = paths.map((_, index) => `<i class="lp${index + 1}"></i>path ${index + 1}`).join(" ");
  return `<h2>How it is split</h2>
<p class="hint">Circles are the states a user goes through; each label between two states is a <b>behaviour</b>, one rule tested on its own, on a thick line for a path and on a dashed line for another outcome at a state.</p>
<div class="map">
  <div class="maptools">${plays}<span class="legend">${keys} <i class="lalt"></i>other outcome <span class="dots"><i class="nom"></i></span>nominal <span class="dots"><i class="bnd"></i></span>boundary <span class="dots"><i class="ref"></i></span>refusal scenario</span></div>
  ${metroSvg(model, paths, dir)}
  ${metroList(model, paths, dir)}
</div>
<p class="facts">${summary.html}</p>`;
}

export function useCasePage(model: ViewerModel, useCase: Requirement): PageSpec {
  const dir = requirementDir(useCase);
  const area = areaOf(model, useCase.scope);
  const behaviours = behavioursOf(model, useCase.id);
  const paths = model.paths.get(useCase.id);
  const onMap = paths ? new Set(citedIds(paths)) : undefined;
  const map = paths
    ? mapSection(model, dir, paths)
    : '<h2>How it is split</h2>\n<p class="hint">The paths of this use case are not written yet, so there is no map: its behaviours are listed below.</p>';
  const retired = retiredBehavioursOf(model, useCase.id).map((behaviour) =>
    `<div class="brow retired"><span class="id">${e(shortId(behaviour.id))}</span><span class="t">${e(behaviour.title)} ${retiredNote(model, dir, behaviour)}</span><span class="m"></span><span class="m"></span></div>`);
  const body = `
<p class="eyebrow"><span class="sw" style="background:${e(area.colour)}"></span>Use case ${e(shortId(useCase.id))}</p>
<h1>${e(useCase.title)}</h1>
<blockquote class="need">${e(useCase.userNeed)}</blockquote>
${map}
<h2>Behaviours of this use case</h2>
<div class="blist">${behaviours.map((behaviour) => behaviourRow(model, dir, behaviour, onMap)).join("")}${retired.join("")}</div>
`;
  const description = paths
    ? mapSummary(model, paths).description
    : `${plural(behaviours.length, "behaviour")} make up this use case of Studio; each is tested on its own.`;
  return {
    dir, level: "use-case", colour: area.colour, body, description,
    title: `Use case ${shortId(useCase.id)}: ${useCase.title}`,
    crumbs: [{ text: "Areas", dir: VIEWER_DIR }, { text: area.title, dir: areaDir(area.id) }, { text: shortId(useCase.id) }],
  };
}

// ---------------------------------------------------------------- behaviour

export function testKind(file: string): string {
  for (const [prefix, kind] of [["test/integration", "integration"], ["test/visual", "visual"], ["sphinx", "sphinx"], ["test/build", "build"]] as const) {
    if (file.startsWith(prefix)) return kind;
  }
  return "unit";
}

function whereSection(model: ViewerModel, dir: string, behaviour: Requirement): string {
  const blocks: string[] = [];
  for (const parentId of behaviour.derivesFrom) {
    const parent = model.byId.get(parentId);
    if (!parent?.active) continue;
    const link = `<a href="${dirLink(dir, requirementDir(parent))}">${e(shortId(parent.id))}</a>`;
    const paths = model.paths.get(parent.id) ?? [];
    let block: string | undefined;
    for (const [pathIndex, path] of paths.entries()) {
      const colour = `var(--${pathIndex === 0 ? "p1" : "p2"})`;
      const index = path.steps.findIndex((step) => step.via?.id === behaviour.id);
      if (index >= 0) {
        const track = path.steps.map((_, j) => `<span class="${j === index ? "cur" : ""}"><i></i>${j < path.steps.length - 1 ? "<b></b>" : ""}</span>`).join("");
        block = `<div class="where" style="--pc:${colour}"><div class="track">${track}</div><p>Step ${index + 1} of path ${pathIndex + 1} in ${link}: from “${e(path.steps[index]?.state ?? "")}” to “${e(path.steps[index + 1]?.state ?? "")}”.</p></div>`;
        break;
      }
      const optionAt = path.steps.findIndex((step) => step.options.some((option) => option.id === behaviour.id));
      if (optionAt >= 0) {
        block = `<div class="where" style="--pc:var(--alt)"><p>Another outcome at step ${optionAt + 1} of path ${pathIndex + 1} in ${link}, in the state “${e(path.steps[optionAt]?.state ?? "")}”.</p></div>`;
        break;
      }
    }
    blocks.push(block ?? `<div class="where"><p>Part of ${link}${paths.length > 0 ? ", outside the paths drawn on its map" : ""}.</p></div>`);
  }
  return blocks.join("\n");
}

function scenarioColumns(scenario: Scenario): string {
  const columns: Record<"GIVEN" | "WHEN" | "THEN", string[]> = { GIVEN: [], WHEN: [], THEN: [] };
  let last: "GIVEN" | "WHEN" | "THEN" = "GIVEN";
  for (const line of scenario.steps) {
    const word = line.split(" ", 1)[0] ?? "";
    if (word === "GIVEN" || word === "WHEN" || word === "THEN") last = word;
    columns[last].push(line.replace(/^(?:GIVEN|WHEN|THEN|AND)\s+/u, ""));
  }
  return (Object.entries(columns) as [string, string[]][]).map(([key, lines]) =>
    `<div><b>${key.charAt(0)}${key.slice(1).toLowerCase()}</b>${lines.map(e).join("<br>")}</div>`).join("");
}

function fileList(model: ViewerModel, files: readonly string[], tests: boolean): string {
  if (files.length === 0) return '<p class="hint">None.</p>';
  const items = files.map((file) => {
    const cut = file.lastIndexOf("/");
    const tag = tests ? `<span class="tag">${testKind(file)}</span>` : "";
    return `<li><a href="${e(blobUrl(model, file))}"><span class="dir">${e(file.slice(0, cut + 1))}</span>${e(file.slice(cut + 1))}</a>${tag}</li>`;
  });
  return `<ul class="files">${items.join("")}</ul>`;
}

export function behaviourPage(model: ViewerModel, behaviour: Requirement): PageSpec {
  const dir = requirementDir(behaviour);
  const area = areaOf(model, behaviour.scope);
  const parent = behaviour.derivesFrom.map((id) => model.byId.get(id)).find((candidate) => candidate?.active && candidate.tier === "StRS");
  const rule = e(behaviour.description).replace(/\bSHALL(?: NOT)?\b/gu, (match) => `<strong>${match}</strong>`);
  const scenarios = behaviour.scenarios.map((scenario) =>
    `<details class="scn"><summary><span class="k ${kindClass(scenario.kind)}">${e(scenario.kind)}</span>${e(scenario.name)}</summary><div class="gwt">${scenarioColumns(scenario)}</div></details>`).join("")
    || '<p class="hint">Stated as one rule, without scenarios.</p>';
  const exempt = behaviour.exempt ? `<p class="exempt">Exempt from code and test markers${behaviour.exemptionReason ? `: ${e(behaviour.exemptionReason)}` : "."}</p>` : "";
  const known = behaviour.knownIssues.length > 0
    ? `<details class="known"><summary>Known limits (${behaviour.knownIssues.length})</summary><ul>${behaviour.knownIssues.map((issue) => `<li>${e(issue.replace(/^Known issue:\s*/u, ""))}</li>`).join("")}</ul></details>`
    : "";
  const siblings = parent ? behavioursOf(model, parent.id) : [];
  const index = siblings.findIndex((candidate) => candidate.id === behaviour.id);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 ? siblings[index + 1] : undefined;
  const pager = parent
    ? `<nav class="pager" aria-label="Behaviours of ${e(shortId(parent.id))}">${previous ? `<a href="${dirLink(dir, requirementDir(previous))}">← ${e(previous.title)}</a>` : "<span></span>"}${next ? `<a class="next" href="${dirLink(dir, requirementDir(next))}">${e(next.title)} →</a>` : ""}</nav>`
    : "";
  const replaced = model.retired.filter((old) => old.tier === "SwRS" && replacementsOf(model, old).some((candidate) => candidate.id === behaviour.id));
  const replaces = replaced.length > 0
    ? `<div class="retired"><h2>Replaces</h2><div class="blist">${replaced.map((old) => `<div class="brow retired"><span class="id">${e(shortId(old.id))}</span><span class="t">${e(old.title)} ${retiredNote(model, dir, old)}</span><span class="m"></span><span class="m"></span></div>`).join("")}</div></div>`
    : "";
  const body = `
<p class="eyebrow"><span class="sw" style="background:${e(area.colour)}"></span>Behaviour ${e(shortId(behaviour.id))}</p>
<h1>${e(behaviour.title)}</h1>
<p class="rule">${rule}</p>
${whereSection(model, dir, behaviour)}
<h2>Scenarios <small>${behaviour.scenarios.length}</small></h2>
<p class="hint">The situations the tests check; open one to read it.</p>
${scenarios}
${exempt}
<div class="cols">
  <section><h2>Implemented in <small>${behaviour.implementedIn.length}</small></h2>${fileList(model, behaviour.implementedIn, false)}</section>
  <section><h2>Tested by <small>${behaviour.testedIn.length}</small></h2>${fileList(model, behaviour.testedIn, true)}</section>
</div>
${known}
${replaces}
${pager}
`;
  return {
    dir, level: "behaviour", colour: area.colour, body,
    title: `Behaviour ${shortId(behaviour.id)}: ${behaviour.title}`,
    description: behaviour.description.replace(/\s+/gu, " ").slice(0, 200),
    crumbs: [
      { text: "Areas", dir: VIEWER_DIR },
      { text: area.title, dir: areaDir(area.id) },
      ...(parent ? [{ text: shortId(parent.id), dir: requirementDir(parent) }] : []),
      { text: shortId(behaviour.id) },
    ],
  };
}
