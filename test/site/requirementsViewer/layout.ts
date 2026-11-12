import { escapeHtml } from "../socialCard";
import { citedIds, type MainPath, type PathTransition } from "./mainPaths";
import type { Requirement, Scenario, ViewerModel } from "./model";
import { pageLink, shortId } from "./urls";

/** Port of the metro layout of prototype 02 (`gen.py`): the graph, the SVG, the phone list and the walk count. */

const KIND_CLASS: Readonly<Record<string, string>> = { nominal: "nom", boundary: "bnd", refusal: "ref", failure: "ref" };

export function kindClass(kind: string): string {
  return KIND_CLASS[kind] ?? "nom";
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function testCount(count: number): string {
  return plural(count, "test");
}

/** One coloured dot per scenario. */
export function scenarioDots(scenarios: readonly Scenario[]): string {
  const dots = scenarios.map((scenario) => `<i class="${kindClass(scenario.kind)}" title="${escapeHtml(scenario.kind)}: ${escapeHtml(scenario.name)}"></i>`).join("");
  return `<span class="dots">${dots}</span>`;
}

interface StateNode {
  key: string;
  label?: string;
  col: number;
  track: number;
  goal: boolean;
  alt: boolean;
  paths: Set<number>;
}

interface Edge {
  a: StateNode;
  b: StateNode;
  via: PathTransition;
  path: number;
  step: number;
  option: boolean;
}

interface Graph {
  states: Map<string, StateNode>;
  edges: Edge[];
}

/** States shared by the paths (same text), main-path edges on tracks 0 and 1, option branches above and below. */
export function buildGraph(paths: readonly MainPath[]): Graph {
  const states = new Map<string, StateNode>();
  const edges: Edge[] = [];
  let alternative = 0;
  paths.forEach((path, pathIndex) => {
    let previous: StateNode | undefined;
    path.steps.forEach((step, index) => {
      let node = states.get(step.state);
      if (!node) {
        node = { key: step.state, col: previous ? previous.col + 1 : index, track: pathIndex === 0 ? 0 : 1, goal: index === path.steps.length - 1, alt: false, paths: new Set() };
        states.set(step.state, node);
      }
      node.paths.add(pathIndex);
      const before = path.steps[index - 1]?.via;
      if (previous && before) edges.push({ a: previous, b: node, via: before, path: pathIndex, step: index - 1, option: false });
      for (const option of step.options) {
        const target: StateNode = { key: `opt${alternative}`, label: option.label, col: node.col + 0.5, track: node.track === 0 ? -1 : 2, goal: false, alt: true, paths: new Set() };
        alternative += 1;
        edges.push({ a: node, b: target, via: option, path: pathIndex, step: index, option: true });
      }
      previous = node;
    });
  });
  const seen = new Map<string, number>();
  for (const edge of edges) {
    if (!edge.option) continue;
    const key = `${edge.b.col}/${edge.b.track}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) edge.b.track += (edge.b.track < 0 ? -1 : 1) * 0.8 * (count - 1);
  }
  return { states, edges };
}

function scenariosOf(model: ViewerModel, via: PathTransition): Scenario[] {
  const requirement = model.byId.get(via.id);
  return (requirement?.scenarios ?? []).filter((scenario) => !via.kind || scenario.kind === via.kind);
}

/**
 * The number of ways through the map in `limit` transitions or fewer: walks from the first state of
 * path 1, each transition counted once per scenario it covers (at least once).
 */
export function walkCount(model: ViewerModel, paths: readonly MainPath[], limit = 8): number {
  const first = paths[0]?.steps[0];
  if (!first) return 0;
  const graph = buildGraph(paths);
  const out = new Map<StateNode, StateNode[]>();
  for (const edge of graph.edges) {
    const copies = Math.max(1, scenariosOf(model, edge.via).length);
    const list = out.get(edge.a) ?? [];
    for (let i = 0; i < copies; i += 1) list.push(edge.b);
    out.set(edge.a, list);
  }
  const start = graph.states.get(first.state);
  if (!start) return 0;
  let current = new Map<StateNode, number>([[start, 1]]);
  let total = 0;
  for (let i = 0; i < limit; i += 1) {
    const next = new Map<StateNode, number>();
    for (const [node, count] of current) {
      for (const target of out.get(node) ?? []) {
        total += count;
        next.set(target, (next.get(target) ?? 0) + count);
      }
    }
    current = next;
  }
  return total;
}

function wrap(value: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/u).filter(Boolean)) {
    if (current && current.length + 1 + word.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  return current ? [...lines, current] : lines;
}

function tspans(x: number, y: number, value: string, width: number, up = false, lineHeight = 15): string {
  const lines = wrap(value, width);
  const first = up ? y - (lines.length - 1) * lineHeight : y;
  return lines.map((line, index) => `<tspan x="${x.toFixed(0)}" y="${(first + index * lineHeight).toFixed(0)}">${escapeHtml(line)}</tspan>`).join("");
}

const pathColour = (index: number): string => (index === 0 ? "var(--p1)" : "var(--p2)");

function describe(requirement: Requirement | undefined, via: PathTransition): string {
  return requirement ? `${requirement.id}: ${requirement.title}` : `${via.id}: ${via.label}`;
}

/** The map as an SVG: states are circles, behaviours the lines between them, every line a link. */
export function metroSvg(model: ViewerModel, paths: readonly MainPath[], fromDir: string): string {
  const { states, edges } = buildGraph(paths);
  const nodes = [...states.values(), ...edges.filter((edge) => edge.option).map((edge) => edge.b)];
  const columns = Math.max(...nodes.map((node) => node.col)) + 1;
  const columnWidth = 220, padX = 90, trackHeight = 165;
  const minTrack = Math.min(...nodes.map((node) => node.track));
  const maxTrack = Math.max(...nodes.map((node) => node.track));
  const top = 70 - minTrack * trackHeight;
  const width = padX * 2 + (columns - 1) * columnWidth;
  const height = top + maxTrack * trackHeight + 100;
  const point = (node: StateNode): [number, number] => [padX + node.col * columnWidth, top + node.track * trackHeight];
  const out = [`<svg class="metro" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" role="img" aria-label="Map of the use case: states joined by behaviours">`];
  for (const edge of edges) {
    const [x1, y1] = point(edge.a);
    const [x2, y2] = point(edge.b);
    const d = y1 === y2
      ? `M${x1.toFixed(0)},${y1.toFixed(0)} L${x2.toFixed(0)},${y2.toFixed(0)}`
      : `M${x1.toFixed(0)},${y1.toFixed(0)} C${(x1 + (x2 - x1) * 0.55).toFixed(0)},${y1.toFixed(0)} ${(x2 - (x2 - x1) * 0.55).toFixed(0)},${y2.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}`;
    const requirement = model.byId.get(edge.via.id);
    const scenarios = scenariosOf(model, edge.via);
    let mx: number, my: number;
    if (y1 === y2) {
      mx = (x1 + x2) / 2;
      my = y1;
    } else {
      const u = edge.option ? 0.72 : 0.5;
      const c1x = x1 + (x2 - x1) * 0.55, c2x = x2 - (x2 - x1) * 0.55;
      mx = (1 - u) ** 3 * x1 + 3 * (1 - u) ** 2 * u * c1x + 3 * (1 - u) * u * u * c2x + u ** 3 * x2;
      my = (1 - u) ** 3 * y1 + 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3 * y2;
    }
    const label = `${shortId(edge.via.id)} · ${testCount(requirement?.testedIn.length ?? 0)}`;
    const pillWidth = label.length * 7 + 18;
    const stroke = edge.option ? "var(--alt)" : pathColour(edge.path);
    const attributes = edge.option ? 'data-option=""' : `data-path="${edge.path}" data-step="${edge.step}"`;
    const shared = !edge.option && edge.a.paths.size > 1 && edge.b.paths.size > 1;
    const href = pageLink(model, fromDir, edge.via.id);
    const tag = href ? "a" : "g";
    const group = [`<${tag} class="tr"${href ? ` href="${href}"` : ""} ${attributes}><title>${escapeHtml(describe(requirement, edge.via))}</title>`];
    if (shared) group.push(`<path d="${d}" stroke="var(--p2)" stroke-width="13" stroke-linecap="round" fill="none" opacity=".4"/>`);
    group.push(`<path class="ln" d="${d}" stroke="${stroke}" stroke-width="${edge.option ? 2.5 : 7}" stroke-linecap="round" fill="none"${edge.option ? ' stroke-dasharray="6 6"' : ""}/>`);
    group.push(`<path class="hit" d="${d}"/>`);
    group.push(`<g transform="translate(${mx.toFixed(0)},${my.toFixed(0)})"><rect class="pill" x="${(-pillWidth / 2).toFixed(0)}" y="-12" width="${pillWidth}" height="24" rx="12" stroke="${stroke}"/><text class="pt" y="4" text-anchor="middle">${escapeHtml(label)}</text>`);
    scenarios.forEach((scenario, index) => {
      group.push(`<circle cx="${((index - (scenarios.length - 1) / 2) * 12).toFixed(0)}" cy="20" r="4.2" class="${kindClass(scenario.kind)}"/>`);
    });
    group.push("</g>");
    if (!edge.option) {
      group.push(y1 === y2
        ? `<text class="verb" text-anchor="middle">${tspans(mx, my - 24, edge.via.label, 30, true)}</text>`
        : `<text class="verb">${tspans(mx + pillWidth / 2 + 10, my + 4, edge.via.label, 26)}</text>`);
    }
    group.push(`</${tag}>`);
    out.push(group.join(""));
  }
  for (const node of nodes) {
    const [x, y] = point(node);
    const cls = `st${node.goal ? " goal" : ""}${node.alt ? " alt" : ""}`;
    const radius = node.alt ? 7 : node.goal ? 15 : 12;
    const value = node.alt ? node.label ?? "" : node.key;
    const label = node.alt && node.track < 0
      ? `<text text-anchor="middle">${tspans(x, y - 16, value, 30, true)}</text>`
      : `<text text-anchor="middle">${tspans(x, y + (node.alt ? 24 : 34), value, node.alt ? 30 : 24)}</text>`;
    out.push(`<g class="${cls}" data-state="${escapeHtml(node.key)}"><circle cx="${x}" cy="${y}" r="${radius}"/>${label}</g>`);
  }
  out.push("</svg>");
  return out.join("");
}

/** The same map for narrow screens: one vertical line per path. */
export function metroList(model: ViewerModel, paths: readonly MainPath[], fromDir: string): string {
  const parts = paths.map((path, pathIndex) => {
    const colour = `style="--pc:var(--${pathIndex === 0 ? "p1" : "p2"})"`;
    const rows = path.steps.map((step, index) => {
      const last = index === path.steps.length - 1;
      const option = (item: PathTransition): string => {
        const href = pageLink(model, fromDir, item.id);
        return `<${href ? "a" : "span"} class="vopt"${href ? ` href="${href}"` : ""}><b>${escapeHtml(shortId(item.id))}</b> ${escapeHtml(item.label)}</${href ? "a" : "span"}>`;
      };
      let via = "";
      if (step.via) {
        const requirement = model.byId.get(step.via.id);
        const href = pageLink(model, fromDir, step.via.id);
        const tag = href ? "a" : "span";
        via = `<${tag} class="vvia"${href ? ` href="${href}"` : ""}><b>${escapeHtml(shortId(step.via.id))}</b> · ${testCount(requirement?.testedIn.length ?? 0)} ${scenarioDots(requirement?.scenarios ?? [])}<span>${escapeHtml(step.via.label)}</span></${tag}>`;
      }
      return `<li class="${last ? "goal" : ""}"><span class="vstate">${escapeHtml(step.state)}</span>${step.options.map(option).join("")}${via}</li>`;
    });
    return `<h3 class="pname" ${colour}>Path ${pathIndex + 1}: ${escapeHtml(path.title)}</h3><ol class="vline" ${colour}>${rows.join("")}</ol>`;
  });
  return `<div class="metro-list">${parts.join("")}</div>`;
}

export interface MapSummary {
  /** The sentence under the map, as HTML. */
  readonly html: string;
  /** The same figures as plain text, for the description of the page. */
  readonly description: string;
}

/** The combinatorics of a map: the walks through it against the behaviours and scenarios tested one by one. */
export function mapSummary(model: ViewerModel, paths: readonly MainPath[]): MapSummary {
  const ids = citedIds(paths);
  const scenarios = ids.reduce((sum, id) => sum + (model.byId.get(id)?.scenarios.length ?? 0), 0);
  const ways = walkCount(model, paths).toLocaleString("en-US");
  return {
    html: `This map has ${ways} different ways through it in 8 steps or fewer. Instead of testing each one end to end, the <b>${ids.length}</b> behaviours on the map are tested one by one, with <b>${scenarios}</b> scenarios.`,
    description: `${ways} ways through this use case; its ${ids.length} behaviours are tested one by one, with ${scenarios} scenarios.`,
  };
}
