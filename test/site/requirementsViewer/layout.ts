import { escapeHtml } from "../socialCard";
import { citedIds, type MainPath, type PathTransition } from "./mainPaths";
import type { Requirement, Scenario, ViewerModel } from "./model";
import { pageLink } from "./urls";

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

function describe(requirement: Requirement | undefined, via: PathTransition): string {
  return requirement ? `${requirement.id}: ${requirement.title}` : `${via.id}: ${via.label}`;
}

/** A state of the map: drawn once, whatever the number of paths through it. */
interface MapNode {
  readonly key: string;
  col: number;
  row: number;
  goal: boolean;
  readonly paths: Set<number>;
  readonly options: PathTransition[];
  /** A line leaves this state down to a lower row, under its circle. */
  drop: boolean;
}

/** A behaviour between two states, drawn once with one stroke per path that takes it. */
interface MapEdge {
  readonly a: MapNode;
  readonly b: MapNode;
  readonly via: PathTransition;
  readonly paths: number[];
  /** The step index of this edge on each of its paths. */
  readonly steps: Map<number, number>;
  /** Another behaviour joins the same two states: drawn as an arc under the line. */
  arc: boolean;
}

interface MetroMap {
  readonly nodes: MapNode[];
  readonly edges: MapEdge[];
  readonly rows: number;
}

const COLUMN_MIN = 230, PAD_LEFT = 100, NAME_WRAP = 24, CAPTION_WRAP = 34, LINE = 17, CHAR = 6.4, INLINE_ROOM = 460, BEND = 24, LANE = 26;
/** A pill: two lines (the full ID, then the test count), 6.8 px per character of the longer line, 36 px high. */
const PILL_CHAR = 6.8, PILL_PAD = 20, PILL_HEIGHT = 36;
/** The estimates leave this much more room than the pinned fonts take, so a reader's wider fonts still fit. */
const WIDTH_MARGIN = 1.1, PILL_GAP = 24;
/** How far a pill reaches beyond the 22 px pill of the first design, above and below its centre line. */
const GROW = (PILL_HEIGHT - 22) / 2;
const MAX_PATH_COLOURS = 3;

/**
 * The joined map: a state shared by paths is one node; path 1 runs on row 0 and each later path puts
 * the states it does not share on a row of its own, joining and leaving the other rows at the shared ones.
 */
export function buildMetroMap(paths: readonly MainPath[]): MetroMap {
  const nodes = new Map<string, MapNode>();
  const edges = new Map<string, MapEdge>();
  let rows = 0;
  paths.forEach((path, pathIndex) => {
    let row: number | undefined;
    path.steps.forEach((step, index) => {
      let node = nodes.get(step.state);
      if (!node) {
        row ??= rows++;
        node = { key: step.state, col: 0, row, goal: false, paths: new Set(), options: [], drop: false };
        nodes.set(step.state, node);
      }
      node.paths.add(pathIndex);
      if (index === path.steps.length - 1) node.goal = true;
      for (const option of step.options) {
        if (!node.options.some((known) => known.id === option.id && known.kind === option.kind && known.label === option.label)) node.options.push(option);
      }
      const before = path.steps[index - 1];
      const previous = before ? nodes.get(before.state) : undefined;
      if (previous && before?.via) {
        const key = `${previous.key}>${node.key}>${before.via.id}`;
        const edge = edges.get(key) ?? { a: previous, b: node, via: before.via, paths: [], steps: new Map<number, number>(), arc: false };
        edge.paths.push(pathIndex);
        edge.steps.set(pathIndex, index - 1);
        edges.set(key, edge);
      }
    });
  });
  // Columns: each state one column right of the state before it on every path (longest way from a start).
  for (let pass = 0; pass < nodes.size + 1; pass += 1) {
    let moved = false;
    for (const edge of edges.values()) {
      if (edge.b.col < edge.a.col + 1) {
        edge.b.col = edge.a.col + 1;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const pairs = new Set<string>();
  for (const edge of edges.values()) {
    const pair = `${edge.a.key}>${edge.b.key}`;
    if (pairs.has(pair)) edge.arc = true;
    pairs.add(pair);
    if (edge.a.row < edge.b.row) edge.a.drop = true;
    if (edge.a.row > edge.b.row) edge.b.drop = true;
  }
  // A path that shares nothing goes on the right of an earlier row when it fits in one more column.
  const all = [...nodes.values()];
  const maxCol = Math.max(...all.map((node) => node.col));
  for (let row = 2; row < rows; row += 1) {
    const here = all.filter((node) => node.row === row);
    const alone = here.every((node) => node.paths.size === 1) && ![...edges.values()].some((edge) => edge.a.row !== edge.b.row && (edge.a.row === row || edge.b.row === row));
    if (!alone || here.length === 0) continue;
    const width = Math.max(...here.map((node) => node.col)) + 1;
    for (let target = 1; target < row; target += 1) {
      const used = all.filter((node) => node.row === target);
      // Right of the row's last state, and right of where its path climbs or drops, with a column of space for the climb.
      const turns = [...edges.values()].filter((edge) => edge.a.row !== edge.b.row && (edge.a.row === target || edge.b.row === target)).map((edge) => Math.max(edge.a.col, edge.b.col));
      const shift = Math.max(...used.map((node) => node.col), ...turns) + 1;
      if (used.length === 0 || shift + width - 1 > maxCol + 1) continue;
      for (const node of here) {
        node.row = target;
        node.col += shift;
      }
      break;
    }
  }
  const used = [...new Set(all.map((node) => node.row))].sort((a, b) => a - b);
  for (const node of all) node.row = used.indexOf(node.row);
  return { nodes: all, edges: [...edges.values()], rows: used.length };
}

/** One line of text; `code` spans in monospace, without their backticks. */
function rich(line: string): string {
  return line.split("`").map((part, index) => (index % 2 === 1 ? `<tspan class="code">${escapeHtml(part)}</tspan>` : escapeHtml(part))).join("");
}

function lines(x: number, y: number, value: string, width: number, up = false): string {
  const wrapped = wrap(value, width);
  const firstY = up ? y - (wrapped.length - 1) * LINE : y;
  return wrapped.map((line, index) => `<tspan x="${x.toFixed(0)}" y="${(firstY + index * LINE).toFixed(0)}">${rich(line)}</tspan>`).join("");
}

export const pathColour = (index: number): string => `var(--p${Math.min(index, MAX_PATH_COLOURS - 1) + 1})`;

function pillWidth(id: string, count: string): number {
  return Math.max(id.length, count.length) * PILL_CHAR + PILL_PAD;
}

/** A pill centred on `cy`: the requirement's full ID on its first line, its test count on its second. */
function pill(left: number, cy: number, id: string, count: string, stroke: string, dashed = false): { svg: string; width: number } {
  const width = pillWidth(id, count);
  const x = (left + width / 2).toFixed(0);
  return {
    width,
    svg: `<rect class="pill" x="${left.toFixed(0)}" y="${(cy - PILL_HEIGHT / 2).toFixed(0)}" width="${width.toFixed(0)}" height="${PILL_HEIGHT}" rx="12" stroke="${stroke}"${dashed ? ' stroke-dasharray="4 3"' : ""}/><text class="pt" text-anchor="middle"><tspan x="${x}" y="${(cy - 3).toFixed(0)}">${escapeHtml(id)}</tspan><tspan x="${x}" y="${(cy + 11).toFixed(0)}">${escapeHtml(count)}</tspan></text>`,
  };
}

function dots(scenarios: readonly Scenario[], x: number, cy: number, centred: boolean): string {
  return scenarios.map((scenario, index) => {
    const cx = centred ? x + (index - (scenarios.length - 1) / 2) * 11 : x + index * 11;
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="4.2" class="${kindClass(scenario.kind)}"/>`;
  }).join("");
}

/** The route of an edge: straight on one row; else down (or up) under the state of the upper row, then along the lower row. */
function route(x1: number, y1: number, x2: number, y2: number, depth: number): { d: string; mx: number; my: number } {
  if (y1 === y2) {
    if (depth === 0) return { d: `M${x1},${y1} L${x2},${y2}`, mx: (x1 + x2) / 2, my: y1 };
    // Another behaviour between the same two states: down just right of the first state, along under the first one's caption, and up just left of the second, so no line crosses a caption.
    const a = x1 + 10, b = x2 - 10, bottom = y1 + depth, r = 14;
    return { d: `M${x1},${y1} Q${a},${y1} ${a},${y1 + r} L${a},${bottom - r} Q${a},${bottom} ${a + r},${bottom} L${b - r},${bottom} Q${b},${bottom} ${b},${bottom - r} L${b},${y1 + r} Q${b},${y1} ${x2},${y2}`, mx: (x1 + x2) / 2, my: bottom };
  }
  // The vertical runs in a lane left of the upper state, so its outcomes keep the right side.
  if (y1 < y2) {
    const lx = x1 - LANE;
    return { d: `M${x1},${y1} Q${lx},${y1} ${lx},${y1 + LANE} L${lx},${y2 - BEND} Q${lx},${y2} ${lx + BEND},${y2} L${x2},${y2}`, mx: (lx + x2) / 2 + BEND / 2, my: y2 };
  }
  const lx = x2 - LANE;
  return { d: `M${x1},${y1} L${lx - BEND},${y1} Q${lx},${y1} ${lx},${y1 - BEND} L${lx},${y2 + LANE} Q${lx},${y2} ${x2},${y2}`, mx: (x1 + lx) / 2 - BEND / 2, my: y1 };
}

/**
 * The map as an SVG at its own size: states are circles drawn once, the paths join and leave them; a behaviour
 * is a pill on its line, its scenarios dots and its caption under it; other outcomes are listed under their state.
 */
// @implements_req SwRS-MDOKFSTUDIO-CORE-081
export function metroSvg(model: ViewerModel, paths: readonly MainPath[], fromDir: string): string {
  const map = buildMetroMap(paths);
  const mainIds = new Set(map.edges.map((edge) => edge.via.id));
  const columns = Math.max(...map.nodes.map((node) => node.col)) + 1;
  const countOf = (id: string): string => testCount(model.byId.get(id)?.testedIn.length ?? 0);
  // A column keeps 24 px between neighbouring pills, the widest one's estimate raised by the width margin; an outcome pill clears the lane of a climb in the next column.
  const edgePill = Math.max(0, ...map.edges.map((edge) => pillWidth(edge.via.id, countOf(edge.via.id))));
  const outcomePill = Math.max(0, ...map.nodes.flatMap((node) => node.options.filter((option) => !mainIds.has(option.id)).map((option) => pillWidth(option.id, countOf(option.id)))));
  const laneBeside = map.nodes.some((node) => node.options.some((option) => !mainIds.has(option.id)) && map.nodes.some((other) => other.row === node.row && other.col === node.col + 1 && other.drop));
  const COLUMN = Math.max(COLUMN_MIN, Math.ceil(edgePill * WIDTH_MARGIN) + PILL_GAP, laneBeside ? Math.ceil(outcomePill) + 24 + LANE + 18 : 0);
  const width = PAD_LEFT * 2 + (columns - 1) * COLUMN;
  const xOf = (node: MapNode): number => PAD_LEFT + node.col * COLUMN;
  const lowerRow = (edge: MapEdge): number => Math.max(edge.a.row, edge.b.row);
  const stemOf = (node: MapNode): number => xOf(node);
  const wrapOf = (node: MapNode): number => {
    const blockers = map.nodes.filter((other) => other.row === node.row && other.col > node.col && (other.options.length > 0 || other.drop)).map((other) => other.col);
    const room = (blockers.length > 0 ? (Math.min(...blockers) - node.col) * COLUMN - 16 - (map.nodes.some((other) => other.row === node.row && other.col === Math.min(...blockers) && other.drop) ? LANE + 14 : 0) : INLINE_ROOM) - (stemOf(node) - xOf(node));
    return Math.max(16, Math.floor((room - 24) / (CHAR * WIDTH_MARGIN)));
  };
  const roomOf = (node: MapNode): number => (wrapOf(node) * CHAR * WIDTH_MARGIN) + 24;
  /** Dots of an outcome go under its pill when the row would run past the room of its state. */
  const dotsBelow = (node: MapNode, option: PathTransition): boolean => {
    return !mainIds.has(option.id) && scenariosOf(model, option).length > 0 && roomOf(node) > 0;
  };
  /** A caption stays clear of the lane where the next state's path goes down. */
  const captionWrap = (edge: MapEdge): number => (edge.a.row === edge.b.row && !edge.arc && edge.b.drop ? 24 : CAPTION_WRAP);
  // A second behaviour between the same two states hangs under the first one's caption: its pill depth below the line.
  const depthOf = new Map<MapEdge, number>();
  const hanging = new Map<string, number>();
  for (const edge of map.edges) {
    if (edge.a.row !== edge.b.row) {
      depthOf.set(edge, 0);
      continue;
    }
    const pair = `${edge.a.key}>${edge.b.key}`;
    const prior = hanging.get(pair);
    const depth = prior === undefined ? 0 : prior + 24;
    depthOf.set(edge, depth);
    hanging.set(pair, depth + 48 + GROW + (wrap(edge.via.label, captionWrap(edge)).length - 1) * LINE + 4);
  }
  const rowY: number[] = [];
  const optionsTop: number[] = [];
  let top = 18;
  for (let row = 0; row < map.rows; row += 1) {
    const here = map.nodes.filter((node) => node.row === row);
    const nameLines = Math.max(1, ...here.map((node) => wrap(node.key, NAME_WRAP).length));
    const captionExtent = Math.max(0, ...map.edges.filter((edge) => lowerRow(edge) === row).map((edge) => (depthOf.get(edge) ?? 0) + 34 + wrap(edge.via.label, captionWrap(edge)).length * LINE));
    const y = top + nameLines * LINE + 22;
    rowY.push(y);
    const captionEnd = captionExtent > 0 ? y + GROW + captionExtent : y + 26;
    optionsTop.push(captionEnd + 26 + GROW);
    let bottom = captionEnd;
    for (const node of here) {
      const rowsHeight = node.options.reduce((sum, option) => sum + PILL_HEIGHT + (dotsBelow(node, option) ? 16 : 0) + wrap(option.label, wrapOf(node)).length * LINE + 16, 0);
      if (node.options.length > 0) bottom = Math.max(bottom, captionEnd + GROW + rowsHeight);
    }
    top = bottom + 34;
  }
  const yOf = (node: MapNode): number => rowY[node.row] ?? 0;
  const out: string[] = [];
  let right = 0;
  // Behaviours: one group per edge, one stroke per path, the pill once.
  for (const edge of map.edges) {
    const x1 = xOf(edge.a), x2 = xOf(edge.b), y1 = yOf(edge.a), y2 = yOf(edge.b);
    const { d, mx, my } = route(x1, y1, x2, y2, depthOf.get(edge) ?? 0);
    const requirement = model.byId.get(edge.via.id);
    const href = pageLink(model, fromDir, edge.via.id);
    const tag = href ? "a" : "g";
    const steps = edge.paths.map((path) => ` data-step-${path}="${edge.steps.get(path) ?? 0}"`).join("");
    const group = [`<${tag} class="tr"${href ? ` href="${href}"` : ""} data-paths="${edge.paths.join(" ")}"${steps}><title>${escapeHtml(describe(requirement, edge.via))}${edge.paths.length > 1 ? ` (paths ${edge.paths.map((path) => path + 1).join(" and ")})` : ""}</title>`];
    const strokes = edge.paths.length;
    const strokeWidth = 7;
    edge.paths.forEach((path, index) => {
      const offset = (index - (strokes - 1) / 2) * (strokeWidth + 1);
      const shift = y1 === y2 ? `0,${offset}` : `${offset},${offset}`;
      group.push(`<path class="ln" d="${d}"${offset ? ` transform="translate(${shift})"` : ""} stroke="${pathColour(path)}" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none"/>`);
    });
    group.push(`<path class="hit" d="${d}"/>`);
    const count = countOf(edge.via.id);
    group.push(pill(mx - pillWidth(edge.via.id, count) / 2, my, edge.via.id, count, pathColour(edge.paths[0] ?? 0)).svg);
    group.push(dots(scenariosOf(model, edge.via), mx, my + PILL_HEIGHT / 2 + 10, true));
    group.push(`<text class="verb" text-anchor="middle">${lines(mx, my + 48 + GROW, edge.via.label, captionWrap(edge))}</text>`);
    group.push(`</${tag}>`);
    out.push(group.join(""));
  }
  // Other outcomes: a list under their state, on a dotted stem beside the line that leaves it downwards, if any.
  for (const node of map.nodes) {
    if (node.options.length === 0) continue;
    const x = xOf(node), y = yOf(node);
    const stem = stemOf(node);
    const wrapAt = wrapOf(node);
    let rowAt = optionsTop[node.row] ?? y;
    let lastRow = rowAt;
    const rows: string[] = [];
    for (const option of node.options) {
      const requirement = model.byId.get(option.id);
      const scenarios = scenariosOf(model, option);
      const href = pageLink(model, fromDir, option.id);
      const tag = href ? "a" : "g";
      // Another scenario of a behaviour already on the map needs no second pill: its dots say which.
      const same = mainIds.has(option.id);
      const count = countOf(option.id);
      const drawn = same ? { svg: "", width: 0 } : pill(stem + 24, rowAt, option.id, count, "var(--alt)", true);
      const below = dotsBelow(node, option);
      // The id and test count of a behaviour already on the map, in grey text, so every outcome says which it is.
      const owner = same ? `<text class="oid"><tspan x="${stem + 22}" y="${rowAt - 3}">${escapeHtml(option.id)}</tspan><tspan x="${stem + 22}" y="${rowAt + 11}">${escapeHtml(count)}</tspan></text>` : "";
      const dotsLeft = below ? stem + 34 : stem + 24 + (owner ? Math.max(option.id.length, count.length) * 6.6 + 8 : 0);
      const dotsY = below ? rowAt + PILL_HEIGHT / 2 + 9 : rowAt + 4;
      const captionY = rowAt + 26 + (below ? 16 : 0) + GROW;
      const caption = wrap(option.label, wrapAt);
      right = Math.max(right, stem + 24 + Math.max(...caption.map((line) => line.length * CHAR * WIDTH_MARGIN)), dotsLeft + scenarios.length * 11);
      rows.push(`<${tag} class="tr opt"${href ? ` href="${href}"` : ""} data-option=""><title>${escapeHtml(describe(requirement, option))}</title>`
        + `<path class="ln" d="M${stem},${rowAt} L${stem + (same ? 18 : 12)},${rowAt}" stroke="var(--alt)" stroke-width="2" stroke-dasharray="3 3" fill="none"/>`
        + (same ? "" : `<circle class="end" cx="${stem + 16}" cy="${rowAt}" r="4"/>`)
        + drawn.svg + owner + dots(scenarios, dotsLeft, dotsY, false)
        + `<text class="verb">${lines(stem + 24, captionY, option.label, wrapAt)}</text></${tag}>`);
      lastRow = rowAt;
      rowAt += PILL_HEIGHT + (below ? 16 : 0) + caption.length * LINE + 16;
    }
    out.push(`<path d="M${stem},${y + 14} L${stem},${lastRow}" stroke="var(--alt)" stroke-width="2" stroke-dasharray="3 3" fill="none"/>`);
    out.push(rows.join(""));
  }
  // States last, over the lines: the circle, its name above it, the goal ring in the colour of its first path.
  for (const node of map.nodes) {
    const x = xOf(node), y = yOf(node);
    const first = Math.min(...node.paths);
    const ring = node.goal ? ` style="stroke:${pathColour(first)}"` : "";
    const cls = `st${node.goal ? " goal" : ""}${node.paths.size > 1 ? " join" : ""}`;
    const others = [...node.paths].filter((path) => path !== first);
    const tone = node.goal && others.length > 0 ? others.map((path, index) => `<circle cx="${x}" cy="${y}" r="13" class="tone" style="stroke:${pathColour(path)}" stroke-dasharray="${(Math.PI * 26 / (2 * (others.length + 1))).toFixed(1)} ${(Math.PI * 26 / (others.length + 1)).toFixed(1)}" stroke-dashoffset="${(-index * 6).toFixed(0)}"/>`).join("") : "";
    const starts = paths.map((path, index) => (index > 0 && path.steps[0]?.state === node.key && [...node.paths].some((other) => other < index) ? index : -1)).filter((index) => index > 0);
    const badges = starts.map((index, at) => `<g class="badge"><circle cx="${x - LANE - at * 20}" cy="${y + 40}" r="9" style="fill:${pathColour(index)};stroke:none"/><text style="fill:var(--paper)" x="${x - LANE - at * 20}" y="${y + 44}" text-anchor="middle">${index + 1}</text></g>`).join("");
    out.push(`<g class="${cls}" data-state="${escapeHtml(node.key)}"><title>${escapeHtml(node.key)}${node.paths.size > 1 ? ` (paths ${[...node.paths].map((path) => path + 1).join(", ")})` : ""}</title><circle cx="${x}" cy="${y}" r="${node.goal ? 13 : node.paths.size > 1 ? 12 : 10}"${ring}/>${tone}<text text-anchor="middle">${lines(x, y - 22, node.key, NAME_WRAP, true)}</text>${badges}</g>`);
  }
  const height = top - 16;
  const fullWidth = Math.ceil(Math.max(width, right + 16));
  return `<svg class="metro" width="${fullWidth}" viewBox="0 0 ${fullWidth} ${height}" style="min-width:${Math.round(fullWidth * 0.85)}px" role="group" aria-label="Map of the use case: states joined by behaviours, the paths joining at shared states; each behaviour is a link">${out.join("")}</svg>`;
}

/** The same map for narrow screens: one vertical line per path. */
export function metroList(model: ViewerModel, paths: readonly MainPath[], fromDir: string): string {
  const parts = paths.map((path, pathIndex) => {
    const colour = `style="--pc:${pathColour(pathIndex)}"`;
    const rows = path.steps.map((step, index) => {
      const last = index === path.steps.length - 1;
      const option = (item: PathTransition): string => {
        const href = pageLink(model, fromDir, item.id);
        return `<${href ? "a" : "span"} class="vopt"${href ? ` href="${href}"` : ""}><b>${escapeHtml(item.id)}</b> ${escapeHtml(item.label)}</${href ? "a" : "span"}>`;
      };
      let via = "";
      if (step.via) {
        const requirement = model.byId.get(step.via.id);
        const href = pageLink(model, fromDir, step.via.id);
        const tag = href ? "a" : "span";
        via = `<${tag} class="vvia"${href ? ` href="${href}"` : ""}><b>${escapeHtml(step.via.id)}</b> · ${testCount(requirement?.testedIn.length ?? 0)} ${scenarioDots(requirement?.scenarios ?? [])}<span>${escapeHtml(step.via.label)}</span></${tag}>`;
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
}

/** The combinatorics of a map: the walks through it against the behaviours and scenarios tested one by one. */
export function mapSummary(model: ViewerModel, paths: readonly MainPath[]): MapSummary {
  const ids = citedIds(paths);
  const scenarios = ids.reduce((sum, id) => sum + (model.byId.get(id)?.scenarios.length ?? 0), 0);
  const ways = walkCount(model, paths).toLocaleString("en-US");
  return {
    html: `This map has ${ways} different ways through it in 8 steps or fewer. Instead of testing each one end to end, the <b>${ids.length}</b> behaviours on the map are tested one by one, with <b>${scenarios}</b> scenarios.`,
  };
}
