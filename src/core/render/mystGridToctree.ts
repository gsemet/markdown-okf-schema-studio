/**
 * MyST `{grid}`, `{card}`, `{tab-set}` and `{toctree}` directives for the active-file preview.
 *
 * The parser leaves `{grid}` (and its `grid-item` / `grid-item-card` children), the standalone
 * `{card}` and `{tab-set}` (with its `{tab-item}` children) as unknown directives that only carry
 * their raw body, and gives `{toctree}` an empty project node. All are rewritten here into nodes
 * the HTML writer can emit, with classes only (the stylesheet owns every colour and size). Pure
 * apart from the callbacks it is given.
 */

import { advanceFence, frontmatterRange } from "../syntax/markdownSyntax";
import { BoundedCache } from "./boundedCache";
import { isCommentHtml } from "./commentMarkers";

export interface GridNode {
  type: string;
  children?: GridNode[];
  position?: { start?: { line?: number }; end?: { line?: number } };
  data?: Record<string, unknown>;
  name?: string;
  args?: string;
  value?: string;
  options?: Record<string, unknown>;
  url?: string;
}

/** Parses a MyST fragment with the renderer's parser options. */
export type GridParse = (source: string) => GridNode;

/** The breakpoint names of a `{grid}` argument, in order: extra small, small, medium, large. */
export const GRID_BREAKPOINTS = ["xs", "sm", "md", "lg"] as const;
/** Smallest container width in px at which each breakpoint applies (the pane, not the window). */
export const GRID_BREAKPOINT_WIDTHS: Readonly<Record<(typeof GRID_BREAKPOINTS)[number], number>> = {
  xs: 0,
  sm: 480,
  md: 640,
  lg: 800,
};
export const GRID_MAX_COLUMNS = 12;

const OPTION_LINE = /^:([\w-]+):[ \t]*(.*)$/u;
const FENCE_LINE = /^[ \t]*(`{3,}|~{3,}|:{3,})(.*)$/u;
const MAX_GRID_DEPTH = 8;

function lineOf(node: GridNode): number {
  return node.position?.start?.line ?? 0;
}

function setHast(node: GridNode, name: string, properties: Record<string, unknown>): void {
  node.data = {
    ...(node.data ?? {}),
    hName: name,
    hProperties: { ...(node.data?.hProperties as object ?? {}), ...properties },
  };
}

function sourceProperties(node: GridNode): Record<string, number> {
  const line = node.position?.start?.line;
  const end = node.position?.end?.line;
  if (line === undefined) return {};
  return { "data-line": line, ...(end !== undefined && end >= line ? { "data-end-line": end } : {}) };
}

function element(
  tagName: string,
  className: string,
  children: unknown[] = [],
  properties: Record<string, unknown> = {},
): unknown {
  return { type: "element", tagName, properties: { className: [className], ...properties }, children };
}

function text(value: string): unknown {
  return { type: "text", value };
}

/** The source lines of a text and the number of its first line in the document. */
export interface GridSource {
  lines: string[];
  firstLine: number;
}

const CLOSING_FENCE = /^[ \t]*(?:`{3,}|~{3,}|:{3,})[ \t]*$/u;

/**
 * The raw lines between a directive's fences. The parser's own `value` collapses blank lines, which
 * would shift every line number inside the grid, so the body is cut from the source text; `value`
 * is only the fallback when the fences cannot be located.
 */
function directiveBody(node: GridNode, source: GridSource): GridSource {
  const start = node.position?.start?.line;
  const end = node.position?.end?.line;
  if (start !== undefined && end !== undefined) {
    const open = start - source.firstLine;
    const close = end - source.firstLine;
    if (open >= 0 && close > open && close < source.lines.length
      && FENCE_LINE.test(source.lines[open]) && CLOSING_FENCE.test(source.lines[close])) {
      return { lines: source.lines.slice(open + 1, close), firstLine: start + 1 };
    }
  }
  return { lines: (node.value ?? "").split("\n"), firstLine: lineOf(node) + 1 };
}

/** Leading `:name: value` lines of a directive body; the lines are blanked so line numbers hold. */
function splitOptions(lines: readonly string[]): { options: Map<string, string>; body: string[] } {
  const options = new Map<string, string>();
  const body = [...lines];
  for (let index = 0; index < body.length; index += 1) {
    const match = OPTION_LINE.exec(body[index]);
    if (!match) break;
    options.set(match[1], match[2].trim());
    body[index] = "";
  }
  return { options, body };
}

interface CardSection {
  kind: "header" | "body" | "footer";
  start: number;
  lines: string[];
}

/** Splits a card body at its top-level `^^^` (header end) and `+++` (footer start) lines. */
function splitCardSections(lines: readonly string[]): CardSection[] {
  const stack: Array<{ char: string; length: number }> = [];
  const cuts: Array<{ index: number; marker: "^^^" | "+++" }> = [];
  lines.forEach((line, index) => {
    const fence = FENCE_LINE.exec(line);
    if (fence) {
      const char = fence[1][0];
      const open = stack[stack.length - 1];
      if (open && open.char === char && fence[1].length >= open.length && fence[2].trim() === "") {
        stack.pop();
      } else if (char !== ":" || /^\s*\{/u.test(fence[2]) || !open) {
        stack.push({ char, length: fence[1].length });
      }
      return;
    }
    if (stack.length > 0) return;
    if (/^\^\^\^\s*$/u.test(line)) cuts.push({ index, marker: "^^^" });
    else if (/^\+\+\+\s*$/u.test(line)) cuts.push({ index, marker: "+++" });
  });
  const headerCut = cuts.find((cut) => cut.marker === "^^^");
  const footerCut = cuts.find((cut) => cut.marker === "+++" && (!headerCut || cut.index > headerCut.index));
  const sections: CardSection[] = [];
  let cursor = 0;
  if (headerCut) {
    sections.push({ kind: "header", start: 0, lines: lines.slice(0, headerCut.index) });
    cursor = headerCut.index + 1;
  }
  const bodyEnd = footerCut ? footerCut.index : lines.length;
  sections.push({ kind: "body", start: cursor, lines: lines.slice(cursor, bodyEnd) });
  if (footerCut) {
    sections.push({ kind: "footer", start: footerCut.index + 1, lines: lines.slice(footerCut.index + 1) });
  }
  return sections;
}

function offsetLines(node: GridNode, offset: number): void {
  if (node.position?.start?.line !== undefined) node.position.start.line += offset;
  if (node.position?.end?.line !== undefined) node.position.end.line += offset;
  for (const child of node.children ?? []) offsetLines(child, offset);
}

/** Parses a body whose first line is source line `firstLine`, expanding nested grids inside it. */
function parseBody(lines: readonly string[], firstLine: number, parse: GridParse, depth: number): GridNode[] {
  if (lines.every((line) => line.trim() === "")) return [];
  const parsed = parse(lines.join("\n"));
  offsetLines(parsed, firstLine - 1);
  expandGrids(parsed, parse, { lines: [...lines], firstLine }, depth + 1);
  return parsed.children ?? [];
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-053
/** The per-breakpoint column counts of a `{grid}` argument; missing breakpoints inherit. */
export function gridColumns(args: string | undefined): string[] {
  const given = (args ?? "").trim().split(/\s+/u).filter(Boolean).slice(0, GRID_BREAKPOINTS.length);
  const valid = given.map((value) => {
    if (value === "auto") return "auto";
    const count = Number.parseInt(value, 10);
    return /^\d+$/u.test(value) && count >= 1 && count <= GRID_MAX_COLUMNS ? String(count) : "1";
  });
  const columns: string[] = [];
  for (let index = 0; index < GRID_BREAKPOINTS.length; index += 1) {
    columns.push(valid[index] ?? columns[index - 1] ?? valid[0] ?? "1");
  }
  return columns;
}

function cardLinkTarget(options: Map<string, string>): string | undefined {
  const link = options.get("link");
  if (!link) return undefined;
  const type = options.get("link-type") ?? "url";
  if (type === "ref") return `#${link}`;
  if (type === "doc") return /\.[A-Za-z0-9]+$/u.test(link) ? link : `${link}.md`;
  return link;
}

function plainText(nodes: readonly GridNode[]): string {
  return nodes.map((node) => node.value ?? plainText(node.children ?? [])).join("");
}

/** Class names a document may add to a card: plain names, none of the preview's own prefixes. */
const RESERVED_CLASS_PREFIX = /^(?:okf|sphinx|myst|vscode|studio)-/iu;
const SAFE_CLASS_NAME = /^[A-Za-z_][\w-]{0,63}$/u;

function userClasses(value: string | undefined): string[] {
  return (value ?? "").split(/\s+/u)
    .filter((name) => SAFE_CLASS_NAME.test(name) && !RESERVED_CLASS_PREFIX.test(name))
    .slice(0, 8);
}

/**
 * An option text as inline content in a plain `div`: it has no source line of its own, so it must
 * not become a mapped paragraph (a click would edit a line that does not hold it).
 */
function optionLine(text: string, parse: GridParse): GridNode {
  const line: GridNode = {
    type: "mystGridCardOption",
    children: parse(text).children?.[0]?.children ?? [{ type: "text", value: text }],
  };
  setHast(line, "div", { class: "myst-grid-card-option" });
  return line;
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-100
function buildCard(node: GridNode, source: GridSource, parse: GridParse, depth: number, standalone = false): void {
  const raw = directiveBody(node, source);
  const { options, body } = splitOptions(raw.lines);
  const parts: GridNode[] = [];
  const addPart = (kind: string, children: GridNode[]): void => {
    const part: GridNode = { type: "mystGridCardPart", children };
    setHast(part, "div", { class: `myst-grid-card-${kind}` });
    parts.push(part);
  };

  const title = (node.args ?? "").trim();
  const target = cardLinkTarget(options);
  const alt = options.get("link-alt");
  const titleChildren = title
    ? (parse(title).children?.[0]?.children ?? [{ type: "text", value: title }])
    : [];
  if (title || target) {
    const inner: GridNode[] = target
      ? [{
        type: "mystGridCardLink",
        // A link cannot contain a link: the title is flattened to text inside the card link.
        children: [{ type: "text", value: plainText(titleChildren) || target }],
        data: {
          hName: "a",
          hProperties: { class: "myst-grid-card-link", href: target, ...(alt ? { title: alt } : {}) },
        },
      }]
      : titleChildren;
    addPart("title", inner);
  }

  // The `:header:` and `:footer:` options come before the blocks the `^^^` and `+++` separators cut.
  const optionHeader = standalone ? options.get("header") : undefined;
  const optionFooter = standalone ? options.get("footer") : undefined;
  const extra: Record<string, GridNode[]> = {
    header: optionHeader ? [optionLine(optionHeader, parse)] : [],
    footer: optionFooter ? [optionLine(optionFooter, parse)] : [],
  };
  for (const section of splitCardSections(body)) {
    const children = parseBody(section.lines, raw.firstLine + section.start, parse, depth);
    if (section.kind === "body") {
      if (children.length > 0 || parts.length === 0) addPart("body", children);
    } else {
      extra[section.kind].push(...children);
    }
  }
  for (const kind of ["header", "footer"] as const) {
    if (extra[kind].length > 0) addPart(kind, extra[kind]);
  }
  // A standalone card leads with its header, like MyST; the title leads a grid card.
  const order = standalone ? ["header", "title", "body", "footer"] : ["title", "header", "body", "footer"];
  const rank = (part: GridNode): number => order.findIndex((kind) =>
    (part.data?.hProperties as { class?: string } | undefined)?.class === `myst-grid-card-${kind}`);
  parts.sort((a, b) => rank(a) - rank(b));

  node.type = "mystGridCard";
  node.children = parts;
  const classes = [standalone ? "myst-card" : "myst-grid-item", "myst-grid-card", ...userClasses(options.get("class-card"))];
  setHast(node, "div", { class: classes.join(" "), ...sourceProperties(node) });
}

function buildItem(node: GridNode, source: GridSource, parse: GridParse, depth: number): void {
  const raw = directiveBody(node, source);
  const { body } = splitOptions(raw.lines);
  node.type = "mystGridItem";
  node.children = parseBody(body, raw.firstLine, parse, depth);
  setHast(node, "div", { class: "myst-grid-item", ...sourceProperties(node) });
}

function buildGrid(node: GridNode, source: GridSource, parse: GridParse, depth: number): void {
  const raw = directiveBody(node, source);
  const { body } = splitOptions(raw.lines);
  const bodySource = { lines: body, firstLine: raw.firstLine };
  const content = parseBody(body, raw.firstLine, parse, depth);
  for (const child of content) {
    if (child.type !== "mystDirective") continue;
    const name = child.name?.toLowerCase();
    if (name === "grid-item-card") buildCard(child, bodySource, parse, depth);
    else if (name === "grid-item") buildItem(child, bodySource, parse, depth);
  }
  const columns = gridColumns(node.args);
  const row: GridNode = { type: "mystGridRow", children: content };
  setHast(row, "div", {
    class: ["myst-grid-row", ...GRID_BREAKPOINTS.map((bp, index) => `myst-grid-${bp}-${columns[index]}`)].join(" "),
  });
  node.type = "mystGrid";
  node.children = [row];
  setHast(node, "div", { class: "myst-grid", ...sourceProperties(node) });
}

/** A tab set keeps its tabs in `data-myst-tab-group`; the group of sets that follow each other. */
const DEFAULT_TAB_GROUP = "tab";

function tabLabel(node: GridNode, parse: GridParse, index: number): string {
  const title = (node.args ?? "").trim();
  if (!title) return `Tab ${index + 1}`;
  return plainText(parse(title).children?.[0]?.children ?? [{ type: "text", value: title }]).trim() || title;
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-098
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-133
// @implements_req SwRS-MDOKFSTUDIO-REVIEW-167
/**
 * Drops the source line attributes under a tab item, so that only the item itself is a mapped block
 * (a table, code block, grid, card or nested tab set in the item is no block of its own). The node
 * positions stay, for the stages that read them. A comment or thread keeps its own lines, as the
 * review actions (reply, delete) and the comment anchors need them.
 */
function unmapPlainBlocks(nodes: readonly GridNode[]): void {
  for (const node of nodes) {
    if (node.type === "html" && isCommentHtml(node.value)) continue;
    const properties = node.data?.hProperties as Record<string, unknown> | undefined;
    if (properties) {
      delete properties["data-line"];
      delete properties["data-end-line"];
    }
    node.data = { ...(node.data ?? {}), noSourceLine: true };
    unmapPlainBlocks(node.children ?? []);
  }
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-098
function buildTabSet(node: GridNode, source: GridSource, parse: GridParse, depth: number): void {
  const raw = directiveBody(node, source);
  const { options, body } = splitOptions(raw.lines);
  const bodySource = { lines: body, firstLine: raw.firstLine };
  const content = parseBody(body, raw.firstLine, parse, depth);
  const setLine = lineOf(node);
  const items = content.filter((child) => child.type === "mystDirective" && child.name?.toLowerCase() === "tab-item");
  const raws = items.map((item) => {
    const itemRaw = directiveBody(item, bodySource);
    return { firstLine: itemRaw.firstLine, ...splitOptions(itemRaw.lines) };
  });
  // The first `:selected:` item shows; without one, the first item.
  const selected = Math.max(0, raws.findIndex((entry) => entry.options.has("selected")));

  const buttons: GridNode[] = [];
  items.forEach((item, index) => {
    const itemOptions = raws[index];
    const tabId = `myst-tab-${setLine}-${index}`;
    const panelId = `myst-tabpanel-${setLine}-${index}`;
    const sync = itemOptions.options.get("sync");
    const button: GridNode = { type: "mystTab", children: [{ type: "text", value: tabLabel(item, parse, index) }] };
    setHast(button, "button", {
      class: "myst-tab",
      type: "button",
      role: "tab",
      id: tabId,
      "aria-controls": panelId,
      "aria-selected": index === selected ? "true" : "false",
      tabindex: index === selected ? "0" : "-1",
      ...(sync ? { "data-myst-tab-sync": sync } : {}),
    });
    buttons.push(button);

    item.type = "mystTabPanel";
    item.children = parseBody(itemOptions.body, itemOptions.firstLine, parse, depth);
    // A tab item is one block: a click in its panel edits the whole item, not the paragraph inside.
    unmapPlainBlocks(item.children);
    setHast(item, "div", {
      class: "myst-tab-panel",
      role: "tabpanel",
      id: panelId,
      "aria-labelledby": tabId,
      ...(index === selected ? {} : { hidden: true }),
      ...sourceProperties(item),
    });
  });

  const list: GridNode = { type: "mystTabList", children: buttons };
  setHast(list, "div", { class: "myst-tab-list", role: "tablist" });
  node.type = "mystTabSet";
  node.children = [list, ...content];
  const group = (options.get("sync-group") ?? "").trim() || DEFAULT_TAB_GROUP;
  const classes = ["myst-tab-set", ...userClasses(options.get("class"))];
  setHast(node, "div", {
    class: classes.join(" "),
    "data-myst-tab-group": group,
    ...sourceProperties(node),
  });
}

/** Rewrites every `{grid}`, `{card}` and `{tab-set}` directive under `node` (recursively, nested ones included). */
export function expandGrids(node: GridNode, parse: GridParse, source: GridSource, depth = 0): void {
  for (const child of node.children ?? []) {
    const name = child.type === "mystDirective" && depth < MAX_GRID_DEPTH ? child.name?.toLowerCase() : undefined;
    if (name === "grid") {
      buildGrid(child, source, parse, depth);
    } else if (name === "card") {
      buildCard(child, source, parse, depth, true);
    } else if (name === "tab-set") {
      buildTabSet(child, source, parse, depth);
    } else {
      expandGrids(child, parse, source, depth);
    }
  }
}

/* ---- toctree ---- */

export interface ToctreeContext {
  sourcePath: string;
  /** Reads a target document, as an include does; undefined when it is missing or unreadable. */
  read: (request: string) => { path: string; source: string } | undefined;
  /** Relative requests of the documents matching a glob pattern; undefined: globs are unsupported. */
  list?: (pattern: string) => string[];
  dependencies: Set<string>;
}

const MAX_TOCTREE_ENTRIES = 500;
const DOCUMENT_EXTENSIONS = /\.(?:md|markdown|myst|rst)$/iu;
const EXPLICIT_TITLE = /^(.+?)\s*<([^<>]+)>$/u;
const EXTERNAL_URL = /^[a-z][a-z0-9+.-]*:\/\//iu;

function cleanHeading(raw: string): string {
  return raw
    .replace(/\s+\{#[^}]*\}\s*$/u, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/`([^`]*)`/gu, "$1")
    .replace(/[*_~]/gu, "")
    .trim();
}

// The first heading depends only on the text of the document. A target that did not change
// between two renders is served from here. Bounded: 500 documents and about 2 M characters.
const headingCache = new BoundedCache<string | null>(500, 2_000_000, (key, heading) => key.length + (heading?.length ?? 0));

/** Empties the first-heading cache (the tests count scans). */
export function clearHeadingCache(): void {
  headingCache.clear();
}

/** The text of the first level-1 heading (ATX or setext) outside code fences, else undefined. */
export function firstHeading(source: string): string | undefined {
  const cached = headingCache.get(source);
  if (cached !== undefined) return cached ?? undefined;
  const heading = scanFirstHeading(source);
  headingCache.set(source, heading ?? null);
  return heading;
}

function scanFirstHeading(source: string): string | undefined {
  const lines = source.replace(/\r\n?/gu, "\n").split("\n");
  let fence: string | undefined;
  for (let index = frontmatterRange(lines); index < lines.length; index += 1) {
    const line = lines[index];
    // Colon fences (MyST directives) hide their content too, like code fences.
    const wasInFence = fence !== undefined;
    fence = advanceFence(line, fence, true);
    if (wasInFence || fence !== undefined) continue;
    const atx = /^ {0,3}#[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/u.exec(line);
    if (atx) {
      const heading = cleanHeading(atx[1]);
      if (heading) return heading;
      continue;
    }
    if (line.trim() !== "" && /^ {0,3}=+[ \t]*$/u.test(lines[index + 1] ?? "")) {
      const heading = cleanHeading(line);
      if (heading) return heading;
    }
  }
  return undefined;
}

function baseName(request: string): string {
  const name = request.split("/").pop() ?? request;
  return name.replace(DOCUMENT_EXTENSIONS, "");
}

function candidatesFor(name: string): string[] {
  return DOCUMENT_EXTENSIONS.test(name) ? [name] : [`${name}.md`, `${name}.myst`, `${name}.markdown`, name];
}

function link(href: string, label: string, extra = ""): unknown {
  return element("a", `myst-toctree-link${extra}`, [text(label)], { href });
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-057
function toctreeEntry(name: string, title: string | undefined, context: ToctreeContext): unknown {
  if (EXTERNAL_URL.test(name)) {
    return element("li", "myst-toctree-entry", [link(name, title ?? name, " myst-toctree-external")]);
  }
  for (const candidate of candidatesFor(name)) {
    const target = context.read(candidate);
    if (!target) continue;
    context.dependencies.add(target.path);
    const label = title ?? firstHeading(target.source) ?? baseName(candidate);
    return element("li", "myst-toctree-entry", [link(encodeURI(candidate), label)]);
  }
  return element("li", "myst-toctree-entry", [
    element("span", "myst-toctree-missing", [text(title ?? name)], { title: `Document not found: ${name}` }),
  ]);
}

function toctreeEntries(node: GridNode, context: ToctreeContext): unknown[] {
  const glob = node.options?.glob === true || node.options?.glob === "";
  const names = (node.value ?? "").split(/\r?\n/u).map((line) => line.trim()).filter((line) => line && !line.startsWith(":"));
  const entries: unknown[] = [];
  for (const raw of names) {
    if (entries.length >= MAX_TOCTREE_ENTRIES) break;
    const explicit = EXPLICIT_TITLE.exec(raw);
    const name = explicit ? explicit[2].trim() : raw;
    const title = explicit ? explicit[1].trim() : undefined;
    if (glob && /[*?[]/u.test(name) && !EXTERNAL_URL.test(name)) {
      const matches = [...new Set(context.list?.(name) ?? [])].sort();
      if (matches.length === 0) {
        entries.push(toctreeEntry(name, title, { ...context, read: () => undefined }));
      }
      for (const match of matches.slice(0, MAX_TOCTREE_ENTRIES - entries.length)) {
        entries.push(toctreeEntry(match, undefined, context));
      }
      continue;
    }
    entries.push(toctreeEntry(name, title, context));
  }
  return node.options?.reversed === true ? entries.reverse() : entries;
}

/** Rewrites every `{toctree}` directive under `node` into a list of links to its documents. */
export function expandToctrees(node: GridNode, context: ToctreeContext): void {
  // A target listed by several toctrees (or twice) is read once per render.
  const reads = new Map<string, ReturnType<ToctreeContext["read"]>>();
  const read = context.read;
  expandToctreesOnce(node, {
    ...context,
    read: (request) => {
      if (!reads.has(request)) reads.set(request, read(request));
      return reads.get(request);
    },
  });
}

function expandToctreesOnce(node: GridNode, context: ToctreeContext): void {
  for (const child of node.children ?? []) {
    if (child.type === "mystDirective" && child.name?.toLowerCase() === "toctree") {
      const hidden = child.options?.hidden === true || child.options?.hidden === "";
      const caption = typeof child.options?.caption === "string" ? child.options.caption.trim() : "";
      const hChildren: unknown[] = [];
      if (!hidden) {
        if (caption) {
          hChildren.push(element("p", "myst-toctree-caption", [text(caption)], { role: "heading", ariaLevel: "2" }));
        }
        hChildren.push(element("ul", "myst-toctree-list", toctreeEntries(child, context)));
      }
      child.type = "mystToctree";
      child.children = [];
      setHast(child, "div", {
        class: hidden ? "myst-toctree myst-toctree-hidden" : "myst-toctree",
        ...sourceProperties(child),
      });
      child.data = { ...child.data, hChildren };
    } else {
      expandToctreesOnce(child, context);
    }
  }
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-257
/**
 * The stylesheet rules that choose the column count of each `{grid}` breakpoint. The tracks read
 * `--myst-grid-track-min` (0 by default; `auto` while a card of the row is edited) so the card
 * being edited keeps its minimum width and pushes the others aside.
 */
export function gridColumnCss(): string {
  const track = (columns: string): string =>
    columns === "auto"
      ? "repeat(auto-fit, minmax(14em, 1fr))"
      : `repeat(${columns}, minmax(var(--myst-grid-track-min, 0px), 1fr))`;
  const counts = [...Array.from({ length: GRID_MAX_COLUMNS }, (_, index) => String(index + 1)), "auto"];
  return GRID_BREAKPOINTS.map((bp) => {
    const rules = counts.map((count) =>
      `  #sphinx-myst-preview-content .myst-grid-row.myst-grid-${bp}-${count} {\n    grid-template-columns: ${track(count)};\n  }`)
      .join("\n");
    const width = GRID_BREAKPOINT_WIDTHS[bp];
    return width === 0
      ? rules.replace(/^ {2}/gmu, "")
      : `@container (min-width: ${width}px) {\n${rules}\n}`;
  }).join("\n");
}
