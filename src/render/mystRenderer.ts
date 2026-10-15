import * as path from "node:path";
import { html as parse5Html, parseFragment, serialize } from "parse5";

import { extractFrontmatter, matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { sanitizeTableStyle } from "../security/html-sanitizer";
import {
  type CheckboxMarker,
  hasCheckboxPlaceholder,
  prepareCheckboxMarkers,
  restoreCheckboxPlaceholders,
  splitCheckboxPlaceholders,
} from "./checkboxMarkers";
import { highlightCodeBlocks } from "./highlight";

export interface RenderDiagnostic {
  message: string;
  line?: number;
  severity: "warning" | "error";
}

export interface MystRenderResult {
  html: string;
  diagnostics: RenderDiagnostic[];
  dependencies: string[];
}

export interface MystIncludeSource {
  path: string;
  source: string;
}

export interface MystRenderContext {
  sourcePath?: string;
  resolveInclude: (request: string, sourcePath: string) => MystIncludeSource | undefined;
}

interface MystNode {
  type: string;
  children?: MystNode[];
  position?: { start?: { line?: number }; end?: { line?: number } };
  data?: Record<string, unknown>;
  name?: string;
  args?: string;
  label?: string;
  identifier?: string;
  value?: string;
  kind?: string;
  lang?: string;
  class?: string;
  icon?: boolean;
  open?: boolean;
  align?: string;
  options?: Record<string, unknown>;
  emphasizeLines?: number[];
  showLineNumbers?: boolean;
  startingLineNumber?: number | string;
  filename?: string;
  file?: string;
  literal?: boolean;
  url?: string;
}

/** Parser options shared by every `mystParse` call so all parse sites agree. */
const MYST_PARSE_OPTIONS = { extensions: { strikethrough: true } };

interface MystEngine {
  mystParse: (source: string, options?: typeof MYST_PARSE_OPTIONS) => MystNode;
  mystToHtml: (ast: MystNode) => string;
}

// myst-parser and myst-to-html are ESM-only, so they are pulled in through a cached
// dynamic import rather than a top-level require.
let enginePromise: Promise<MystEngine> | undefined;

async function loadEngine(): Promise<MystEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [parser, writer] = await Promise.all([
        import("myst-parser"),
        import("myst-to-html"),
      ]);
      return { mystParse: parser.mystParse, mystToHtml: writer.mystToHtml } as MystEngine;
    })();
  }
  return enginePromise;
}

/** Warms the engine so the first keystroke does not pay the module-load cost. */
export function preloadMystEngine(): void {
  void loadEngine().catch(() => undefined);
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "list",
  "listItem",
  "code",
  "table",
  "math",
  "thematicBreak",
  "definitionList",
]);

const ADMONITION_TITLES: Record<string, string> = {
  attention: "Attention",
  caution: "Caution",
  danger: "Danger",
  error: "Error",
  hint: "Hint",
  important: "Important",
  note: "Note",
  seealso: "See Also",
  tip: "Tip",
  warning: "Warning",
};

const VERSION_ADMONITION_TITLES: Record<string, string> = {
  versionadded: "Added in version",
  versionchanged: "Changed in version",
  deprecated: "Deprecated since version",
};

const GITHUB_ALERT_TYPES = new Map([
  ["NOTE", "note"],
  ["TIP", "tip"],
  ["IMPORTANT", "important"],
  ["WARNING", "warning"],
  ["CAUTION", "caution"],
]);

const ALERT_MARKER = /^(\s*)>\s*\[!([A-Za-z]+)\](?:[ \t]+(\S(?:.*?\S)?))?[ \t]*$/u;
const GITHUB_BOLD_ALERT_MARKER = /^(\s*)>\s*\*\*(Note|Important|Warning)\*\*[ \t]*$/iu;
const TABLE_ALIGNMENTS = new Set(["left", "center", "right"]);
const MAX_INCLUDE_DEPTH = 8;
/** Per-render ceilings on include expansion; beyond them includes stay placeholders. */
export const INCLUDE_BUDGET_MAX_EXPANSIONS = 2000;
/** Counts UTF-16 code units of included source text (`string.length`), not encoded bytes. */
export const INCLUDE_BUDGET_MAX_CHARS = 10 * 1024 * 1024;
const SAFE_HTML_TABLE_TAGS = new Set([
  "b", "br", "caption", "code", "col", "colgroup", "div", "em", "i", "li", "ol", "p",
  "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul",
]);
const BLOCKED_HTML_TABLE_TAGS = new Set([
  "embed", "form", "iframe", "object", "script", "style", "svg",
]);

interface RawHtmlNode {
  nodeName: string;
  tagName?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: RawHtmlNode[];
  value?: string;
}

interface TableAlignmentSpec {
  table?: string;
  columns: Array<string | undefined>;
  sourceLine?: number;
  sourceEndLine?: number;
}

function stripQuote(line: string): string {
  return line.replace(/^\s*>\s?/u, "");
}

interface MarkdownFence {
  marker: "`" | "~";
  length: number;
}

interface ContextTagBoundary {
  kind: "open" | "close" | "unsupported";
  name?: string;
}

const HTML_TAG_NAMES = new Set(Object.values(parse5Html.TAG_NAMES).map((name) => name.toLowerCase()));
const CONTEXT_TAG_NAME = "[a-z][a-z0-9_-]*";
const CONTEXT_TAG_OPEN = new RegExp(`^<(${CONTEXT_TAG_NAME})>$`, "u");
const CONTEXT_TAG_CLOSE = new RegExp(`^</(${CONTEXT_TAG_NAME})>$`, "u");
const UNSUPPORTED_CONTEXT_TAG = new RegExp(
  `^</?(${CONTEXT_TAG_NAME})(?:\\s+[^>]*|\\s*/|/)>$`,
  "u",
);

function openingFence(line: string): MarkdownFence | undefined {
  const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
  return marker ? { marker: marker[0] as "`" | "~", length: marker.length } : undefined;
}

function closesFence(line: string, fence: MarkdownFence): boolean {
  const marker = /^(`+|~+)[ \t]*$/u.exec(line.trimStart())?.[1];
  return Boolean(marker && marker[0] === fence.marker && marker.length >= fence.length);
}

function standaloneContextTagValue(node: MystNode): string | undefined {
  if (node.type === "html" && node.value !== undefined && node.value.trim() === node.value) {
    return node.value;
  }
  if (
    node.type === "paragraph"
    && node.children?.length === 1
    && node.children[0].type === "text"
    && node.children[0].value !== undefined
    && node.children[0].value.trim() === node.children[0].value
  ) {
    return node.children[0].value;
  }
  return undefined;
}

function contextTagBoundary(node: MystNode): ContextTagBoundary | undefined {
  const value = standaloneContextTagValue(node);
  if (value === undefined) {
    return undefined;
  }
  const opening = CONTEXT_TAG_OPEN.exec(value);
  if (opening) {
    if (HTML_TAG_NAMES.has(opening[1])) {
      return undefined;
    }
    return { kind: "open", name: opening[1] };
  }
  const closing = CONTEXT_TAG_CLOSE.exec(value);
  if (closing) {
    if (HTML_TAG_NAMES.has(closing[1])) {
      return undefined;
    }
    return { kind: "close", name: closing[1] };
  }
  const unsupported = UNSUPPORTED_CONTEXT_TAG.exec(value);
  return unsupported && !HTML_TAG_NAMES.has(unsupported[1]) ? { kind: "unsupported" } : undefined;
}

function literalizeContextTag(node: MystNode): MystNode {
  return {
    type: "paragraph",
    position: node.position,
    children: [{ type: "text", value: standaloneContextTagValue(node) ?? "" }],
  };
}

function findContextTagClose(
  children: MystNode[],
  openingIndex: number,
  name: string,
): number | undefined {
  const stack = [name];
  for (let index = openingIndex + 1; index < children.length; index += 1) {
    const boundary = contextTagBoundary(children[index]);
    if (!boundary || boundary.kind === "unsupported" || !boundary.name) {
      continue;
    }
    if (boundary.kind === "open") {
      stack.push(boundary.name);
      continue;
    }
    if (stack.at(-1) !== boundary.name) {
      return undefined;
    }
    stack.pop();
    if (stack.length === 0) {
      return index;
    }
  }
  return undefined;
}

function createContextAdmonition(
  opening: MystNode,
  closing: MystNode,
  body: MystNode[],
): MystNode {
  return {
    type: "admonition",
    kind: "admonition",
    class: "myst-context-admonition",
    icon: false,
    position: {
      ...(opening.position?.start ? { start: { ...opening.position.start } } : {}),
      ...(closing.position?.end ? { end: { ...closing.position.end } } : {}),
    },
    children: [
      {
        type: "admonitionTitle",
        position: opening.position,
        children: [{ type: "text", value: standaloneContextTagValue(opening) ?? opening.value ?? "" }],
      },
      ...body,
    ],
  };
}

function groupContextTagChildren(children: MystNode[]): MystNode[] {
  const grouped: MystNode[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const boundary = contextTagBoundary(children[index]);
    if (boundary?.kind === "open" && boundary.name) {
      const closingIndex = findContextTagClose(children, index, boundary.name);
      if (closingIndex !== undefined) {
        grouped.push(createContextAdmonition(
          children[index],
          children[closingIndex],
          groupContextTagChildren(children.slice(index + 1, closingIndex)),
        ));
        index = closingIndex;
        continue;
      }
    }
    grouped.push(
      boundary?.kind === "close" || boundary?.kind === "unsupported"
        ? literalizeContextTag(children[index])
        : boundary?.kind === "open" ? literalizeContextTag(children[index]) : children[index],
    );
  }
  return grouped;
}

function splitGroupedContextTagHtml(
  node: MystNode,
  mystParse: MystEngine["mystParse"],
): MystNode[] | undefined {
  if (node.type !== "html" || node.value === undefined) {
    return undefined;
  }
  const lines = node.value.split(/\r?\n/u);
  if (lines.length < 3) {
    return undefined;
  }
  const opening = contextTagBoundary({ type: "html", value: lines[0] });
  const closing = contextTagBoundary({ type: "html", value: lines.at(-1) });
  if (
    opening?.kind !== "open"
    || closing?.kind !== "close"
    || !opening.name
    || opening.name !== closing.name
  ) {
    return undefined;
  }

  const sourceLine = node.position?.start?.line;
  const endLine = node.position?.end?.line
    ?? (sourceLine === undefined ? undefined : sourceLine + lines.length - 1);
  const body = mystParse(expandGithubAlerts(lines.slice(1, -1).join("\n")), MYST_PARSE_OPTIONS);
  repairGroupedContextTagHtml(body, mystParse);
  if (sourceLine !== undefined) {
    offsetNodeLines(body, sourceLine);
  }
  return [
    {
      type: "html",
      value: lines[0],
      position: sourceLine === undefined ? undefined : { start: { line: sourceLine } },
    },
    ...(body.children ?? []),
    {
      type: "html",
      value: lines.at(-1),
      position: endLine === undefined ? undefined : { end: { line: endLine } },
    },
  ];
}

function repairGroupedContextTagHtml(node: MystNode, mystParse: MystEngine["mystParse"]): void {
  if (!node.children) {
    return;
  }
  const children: MystNode[] = [];
  for (const child of node.children) {
    const replacement = splitGroupedContextTagHtml(child, mystParse);
    if (replacement) {
      children.push(...replacement);
    } else {
      repairGroupedContextTagHtml(child, mystParse);
      children.push(child);
    }
  }
  node.children = children;
}

const CONTEXT_TAG_BLOCK_PARENTS = new Set([
  "root",
  "blockquote",
  "container",
  "definitionDescription",
  "definitionList",
  "listItem",
]);

function normalizeContextTagContainers(node: MystNode): void {
  if (node.children && CONTEXT_TAG_BLOCK_PARENTS.has(node.type)) {
    node.children = groupContextTagChildren(node.children);
  }
  for (const child of node.children ?? []) {
    normalizeContextTagContainers(child);
  }
}

/** Rewrites alert blockquotes, including optional titles, into MyST admonitions. */
function expandGithubAlerts(text: string): string {
  const lines = text.split(/\r?\n/u);
  const output: string[] = [];
  let fence: MarkdownFence | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (fence) {
      output.push(line);
      if (closesFence(line, fence)) {
        fence = undefined;
      }
      continue;
    }

    const nextFence = openingFence(line);
    if (nextFence) {
      fence = nextFence;
      output.push(line);
      continue;
    }

    const alertMarker = line.match(ALERT_MARKER);
    const boldMarker = line.match(GITHUB_BOLD_ALERT_MARKER);
    const marker = alertMarker ?? boldMarker;
    const kind = alertMarker
      ? GITHUB_ALERT_TYPES.get(alertMarker[2].toUpperCase())
      : boldMarker ? GITHUB_ALERT_TYPES.get(boldMarker[2].toUpperCase()) : undefined;
    if (!marker || !kind) {
      output.push(line);
      continue;
    }

    const indent = marker[1];
    const title = alertMarker?.[3];
    output.push(`${indent}:::{${kind}}${title ? ` ${title}` : ""}`);
    output.push(`${indent}:class: simple`);
    let cursor = index + 1;
    while (cursor < lines.length && /^\s*>/u.test(lines[cursor])) {
      output.push(indent + stripQuote(lines[cursor]));
      cursor += 1;
    }
    if (cursor < lines.length && lines[cursor].trim() === "") {
      output.push(`${indent}:::`);
    } else {
      output.push(`${indent}:::`, "");
      cursor -= 1;
    }
    index = cursor;
  }

  return output.join("\n");
}

/*
 * Node types the parser produces for directives that only a project-wide build can
 * resolve. The HTML writer has no handler for them, so they silently vanish unless the
 * enclosing directive is turned into a placeholder instead.
 */
const BUILD_ONLY_TYPES = new Set([
  "toc",
  "include",
  "embed",
  "glossary",
  "bibliography",
]);

function setHast(node: MystNode, name: string, properties: Record<string, unknown>, children?: unknown[]): void {
  node.data = {
    ...(node.data ?? {}),
    hName: name,
    hProperties: { ...(node.data?.hProperties as object ?? {}), ...properties },
    ...(children ? { hChildren: children } : {}),
  };
}

function mergeProperties(node: MystNode, properties: Record<string, unknown>): void {
  node.data = {
    ...(node.data ?? {}),
    hProperties: { ...(node.data?.hProperties as object ?? {}), ...properties },
  };
}

function sourcePositionProperties(node: MystNode, line?: number): Record<string, number | string> {
  if (line === undefined) {
    return {};
  }
  const endLine = node.position?.end?.line;
  return {
    "data-line": line,
    ...(node.data?.included === true ? { "data-sphinx-preview-included": "true" } : {}),
    ...(endLine !== undefined && endLine >= line ? { "data-end-line": endLine } : {}),
  };
}

function normalizeDiagram(node: MystNode, line: number | undefined, kind: "mermaid" | "plantuml"): void {
  const source = node.value ?? "";
  const label = kind === "mermaid" ? "Mermaid" : "PlantUML";
  setHast(node, "figure", {
    class: `myst-${kind}-figure`,
    ...sourcePositionProperties(node, line),
  }, [
    {
      type: "element",
      tagName: "div",
      properties: { className: [`myst-${kind}-diagram`], "aria-label": `${label} diagram` },
      children: [{ type: "text", value: source }],
    },
    {
      type: "element", tagName: "details", properties: { className: [`myst-${kind}-source`] },
      children: [
        {
          type: "element",
          tagName: "summary",
          properties: {},
          children: [{ type: "text", value: "Diagram source" }],
        },
        {
          type: "element",
          tagName: "pre",
          properties: {},
          children: [{
            type: "element",
            tagName: "code",
            properties: {},
            children: [{ type: "text", value: source }],
          }],
        },
      ],
    },
  ]);
  node.children = [];
  node.type = `${kind}Diagram`;
}

function findNode(node: MystNode, type: string): MystNode | undefined {
  if (node.type === type) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, type);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function normalizeTableAlignment(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const alignment = value.toLowerCase();
  return TABLE_ALIGNMENTS.has(alignment) ? alignment : undefined;
}

function containsRawTable(node: RawHtmlNode): boolean {
  return node.tagName?.toLowerCase() === "table"
    || (node.childNodes ?? []).some(containsRawTable);
}

function countRawTables(node: RawHtmlNode): number {
  return Number(node.tagName?.toLowerCase() === "table")
    + (node.childNodes ?? []).reduce((count, child) => count + countRawTables(child), 0);
}

function rawHtmlChildren(node: RawHtmlNode): unknown[] {
  if (node.nodeName === "#text") {
    return [{ type: "text", value: node.value ?? "" }];
  }
  if (node.nodeName === "#comment") {
    return [];
  }

  const tagName = node.tagName?.toLowerCase();
  if (!tagName) {
    return (node.childNodes ?? []).flatMap(rawHtmlChildren);
  }
  if (BLOCKED_HTML_TABLE_TAGS.has(tagName)) {
    return [];
  }

  const children = (node.childNodes ?? []).flatMap(rawHtmlChildren);
  if (!SAFE_HTML_TABLE_TAGS.has(tagName)) {
    return children;
  }

  const properties: Record<string, unknown> = {};
  for (const attribute of node.attrs ?? []) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();
    if ((name === "rowspan" || name === "colspan") && /^[1-9]\d{0,2}$/u.test(value)) {
      properties[name === "rowspan" ? "rowSpan" : "colSpan"] = Number(value);
    } else if (name === "align" && normalizeTableAlignment(value)) {
      properties.align = value.toLowerCase();
    } else if (name === "scope" && /^(?:row|col|rowgroup|colgroup)$/u.test(value)) {
      properties.scope = value;
    } else if (name === "class") {
      const classNames = value.split(/\s+/u).filter((className) => /^[-_a-zA-Z][-_a-zA-Z0-9]*$/u.test(className));
      if (classNames.length > 0) {
        properties.className = classNames;
      }
    } else if (name === "title") {
      properties.title = attribute.value;
    } else if (name === "style") {
      const safeStyle = sanitizeTableStyle(tagName, attribute.value);
      if (safeStyle) {
        properties["data-myst-table-style"] = safeStyle;
      }
    }
  }

  return [{ type: "element", tagName, properties, children }];
}

function normalizeRawHtmlTable(node: MystNode, line?: number): void {
  const fragment = parseFragment(node.value ?? "") as unknown as RawHtmlNode;
  if (!containsRawTable(fragment)) {
    return;
  }
  setHast(node, "div", {
    class: "myst-raw-html-table",
    ...sourcePositionProperties(node, line),
  }, rawHtmlChildren(fragment));
  node.type = "rawHtmlTableBlock";
}

function takeAdmonitionTitle(children: MystNode[]): { title: MystNode; body: MystNode[] } | undefined {
  const first = children[0];
  if (first?.type === "heading") {
    return {
      title: { type: "admonitionTitle", children: first.children ?? [] },
      body: children.slice(1),
    };
  }
  if (first?.type === "paragraph") {
    const meaningfulChildren = (first.children ?? []).filter((child) =>
      child.type !== "text" || Boolean(child.value?.trim()));
    if (meaningfulChildren.length === 1 && meaningfulChildren[0].type === "strong") {
      return {
        title: { type: "admonitionTitle", children: meaningfulChildren[0].children ?? [] },
        body: children.slice(1),
      };
    }
  }
  return undefined;
}

/**
 * Maps every node of an included tree to the `{include}` directive's own lines in the host
 * document and flags it as included, so the editor never targets unrelated host lines.
 */
function setIncludedSourceLine(node: MystNode, line: number, endLine: number): void {
  node.position = {
    ...(node.position ?? {}),
    start: { ...(node.position?.start ?? {}), line },
    end: { ...(node.position?.end ?? {}), line: endLine },
  };
  node.data = { ...(node.data ?? {}), included: true };
  for (const child of node.children ?? []) {
    setIncludedSourceLine(child, line, endLine);
  }
}

/** Shared by every `expandIncludes` call of one render. */
interface IncludeBudget {
  expansions: number;
  bytes: number;
  exhausted: boolean;
  /** `resolveInclude` results by directory and request; `null` records an unresolved include. */
  resolved: Map<string, MystIncludeSource | null>;
  /** Parsed, not yet expanded ASTs by canonical path; cloned on every use. */
  parsed: Map<string, MystNode>;
}

function createIncludeBudget(): IncludeBudget {
  return { expansions: 0, bytes: 0, exhausted: false, resolved: new Map(), parsed: new Map() };
}

function resolveIncludeOnce(
  budget: IncludeBudget,
  context: MystRenderContext,
  request: string,
  sourcePath: string,
): MystIncludeSource | undefined {
  const key = `${path.dirname(sourcePath)}\0${request}`;
  let entry = budget.resolved.get(key);
  if (entry === undefined) {
    entry = context.resolveInclude(request, sourcePath) ?? null;
    budget.resolved.set(key, entry);
  }
  return entry ?? undefined;
}

function expandIncludes(
  node: MystNode,
  sourcePath: string,
  context: MystRenderContext,
  mystParse: MystEngine["mystParse"],
  diagnostics: RenderDiagnostic[],
  dependencies: Set<string>,
  includeStack: Set<string>,
  budget: IncludeBudget,
): void {
  if (!node.children) {
    return;
  }

  const expandedChildren: MystNode[] = [];
  for (const child of node.children) {
    if (child.type === "mystDirective" && child.name === "include") {
      const includeNode = findNode(child, "include");
      const request = child.args?.trim() ?? includeNode?.file ?? "";
      const unsupportedOptions = Object.keys(child.options ?? {})
        .some((name) => name !== "class" && name !== "label");
      const expandable = !includeNode?.literal
        && !unsupportedOptions
        && includeStack.size < MAX_INCLUDE_DEPTH
        && Boolean(request);
      if (expandable && budget.exhausted) {
        child.data = { ...child.data, includeBudgetExhausted: true };
        expandedChildren.push(child);
        continue;
      }
      const included = expandable ? resolveIncludeOnce(budget, context, request, sourcePath) : undefined;

      if (!included || includeStack.has(included.path)) {
        expandedChildren.push(child);
        continue;
      }

      if (
        budget.expansions >= INCLUDE_BUDGET_MAX_EXPANSIONS
        || budget.bytes + included.source.length > INCLUDE_BUDGET_MAX_CHARS
      ) {
        budget.exhausted = true;
        diagnostics.push({
          message: "Include budget exhausted: "
            + `at most ${INCLUDE_BUDGET_MAX_EXPANSIONS} includes or `
            + `${Math.round(INCLUDE_BUDGET_MAX_CHARS / (1024 * 1024))} Mi characters of included text are `
            + "expanded per render; the remaining includes are shown as placeholders.",
          severity: "warning",
          ...(child.position?.start?.line === undefined ? {} : { line: child.position.start.line }),
        });
        child.data = { ...child.data, includeBudgetExhausted: true };
        expandedChildren.push(child);
        continue;
      }
      budget.expansions += 1;
      budget.bytes += included.source.length;

      dependencies.add(included.path);
      let parsedAst = budget.parsed.get(included.path);
      if (!parsedAst) {
        parsedAst = mystParse(expandGithubAlerts(stripFrontmatter(included.source)), MYST_PARSE_OPTIONS);
        budget.parsed.set(included.path, parsedAst);
      }
      // The expansion below mutates the tree, so every use works on its own copy.
      const includedAst = structuredClone(parsedAst);
      const includeLine = child.position?.start?.line;
      if (includeLine !== undefined) {
        setIncludedSourceLine(includedAst, includeLine, child.position?.end?.line ?? includeLine);
      }
      const nestedStack = new Set(includeStack);
      nestedStack.add(included.path);
      expandIncludes(
        includedAst,
        included.path,
        context,
        mystParse,
        diagnostics,
        dependencies,
        nestedStack,
        budget,
      );
      expandedChildren.push(...(includedAst.children ?? []));
      continue;
    }

    expandIncludes(
      child,
      sourcePath,
      context,
      mystParse,
      diagnostics,
      dependencies,
      includeStack,
      budget,
    );
    expandedChildren.push(child);
  }
  node.children = expandedChildren;
}

function normalizeFigureCaptions(node: MystNode): void {
  if (node.type === "container" && node.kind === "figure" && node.children) {
    const hasCaption = node.children.some((child) => child.type === "caption");
    const paragraphIndex = node.children.findIndex((child) => child.type === "paragraph");
    if (!hasCaption && paragraphIndex >= 0) {
      const paragraph = node.children[paragraphIndex];
      node.children = [
        ...node.children.slice(0, paragraphIndex),
        { type: "caption", children: [paragraph] },
        ...node.children.slice(paragraphIndex + 1),
      ];
    }
  }
  for (const child of node.children ?? []) {
    normalizeFigureCaptions(child);
  }
}

function collectCaptionlessTargets(node: MystNode, targets: Set<string>): void {
  if (
    node.type === "container"
    && (node.kind === "figure" || node.kind === "table")
    && !node.children?.some((child) => child.type === "caption")
  ) {
    if (node.identifier) targets.add(node.identifier);
    if (node.label) targets.add(node.label);
  }
  for (const child of node.children ?? []) {
    collectCaptionlessTargets(child, targets);
  }
}

function preserveCaptionlessReferences(node: MystNode, targets: ReadonlySet<string>): void {
  if (
    node.type === "crossReference"
    && node.kind === "ref"
    && node.identifier
    && targets.has(node.identifier)
    && !node.children?.length
  ) {
    node.children = [{ type: "text", value: node.identifier }];
  }
  for (const child of node.children ?? []) {
    preserveCaptionlessReferences(child, targets);
  }
}

function normalizeCaptionlessReferences(root: MystNode): void {
  const targets = new Set<string>();
  collectCaptionlessTargets(root, targets);
  preserveCaptionlessReferences(root, targets);
}

function collectTableAlignments(node: MystNode, output: Array<TableAlignmentSpec | undefined>): void {
  if (node.type === "rawHtmlTableBlock") {
    const fragment = parseFragment(node.value ?? "") as unknown as RawHtmlNode;
    const tableAlignment = normalizeTableAlignment(node.data?.mystTableAlignment);
    output.push(...Array.from(
      { length: countRawTables(fragment) },
      () => tableAlignment ? { table: tableAlignment, columns: [] } : undefined,
    ));
    return;
  }
  if (node.type === "table") {
    const headerCells = node.children?.[0]?.children ?? [];
    output.push({
      table: normalizeTableAlignment(node.align),
      columns: headerCells.map((cell) => normalizeTableAlignment(cell.align)),
      ...(node.position?.start?.line === undefined
        ? {}
        : { sourceLine: node.position.start.line }),
      ...(node.position?.end?.line === undefined
        ? {}
        : { sourceEndLine: node.position.end.line }),
    });
  }
  for (const child of node.children ?? []) {
    collectTableAlignments(child, output);
  }
}

function setHtmlAttribute(node: RawHtmlNode, name: string, value: string): void {
  const existing = node.attrs?.find((attribute) => attribute.name === name);
  if (existing) {
    existing.value = value;
    return;
  }
  node.attrs ??= [];
  node.attrs.push({ name, value });
}

function applyTableAlignments(
  html: string,
  alignments: Array<TableAlignmentSpec | undefined>,
): string {
  if (!alignments.some((alignment) =>
    alignment && (alignment.table || alignment.columns.some(Boolean) || alignment.sourceLine !== undefined))) {
    return html;
  }

  const fragment = parseFragment(html);
  let tableIndex = 0;

  const visit = (node: RawHtmlNode): void => {
    if (node.tagName?.toLowerCase() === "table") {
      const alignment = alignments[tableIndex];
      tableIndex += 1;
      if (alignment?.table) {
        setHtmlAttribute(node, "align", alignment.table);
      }
      if (alignment?.sourceLine !== undefined) {
        setHtmlAttribute(node, "data-line", String(alignment.sourceLine));
      }
      if (alignment?.sourceEndLine !== undefined) {
        setHtmlAttribute(node, "data-end-line", String(alignment.sourceEndLine));
      }

      const rows: RawHtmlNode[] = [];
      const collectRows = (parent: RawHtmlNode): void => {
        for (const child of parent.childNodes ?? []) {
          if (child.tagName?.toLowerCase() === "tr") {
            rows.push(child);
          } else if (child.tagName?.toLowerCase() !== "table") {
            collectRows(child);
          }
        }
      };
      collectRows(node);
      for (const row of rows) {
        const cells = (row.childNodes ?? []).filter((child) =>
          ["th", "td"].includes(child.tagName?.toLowerCase() ?? ""));
        cells.forEach((cell, index) => {
          const cellAlignment = alignment?.columns[index];
          if (cellAlignment) {
            setHtmlAttribute(cell, "align", cellAlignment);
          }
        });
      }
    }
    for (const child of node.childNodes ?? []) {
      visit(child);
    }
  };

  visit(fragment as unknown as RawHtmlNode);
  return serialize(fragment);
}

/**
 * Rewrites nodes the HTML writer cannot resolve without a project-wide build.
 *
 * `cite` otherwise emits an empty `<div>` inside a paragraph, which is both invalid and
 * invisible; unresolved references are shown as their raw key instead.
 */
function normalizeNode(node: MystNode, diagnostics: RenderDiagnostic[], inheritedLine?: number): void {
  const line = node.position?.start?.line ?? inheritedLine;

  if (node.type === "mermaid" || (node.type === "code" && node.lang?.toLowerCase() === "mermaid")) {
    normalizeDiagram(node, line, "mermaid");
    return;
  }

  if (
    node.type === "plantuml"
    || (node.type === "mystDirective" && node.name?.toLowerCase() === "plantuml")
    || (node.type === "code" && node.lang?.toLowerCase() === "plantuml")
  ) {
    normalizeDiagram(node, line, "plantuml");
    return;
  }

  if (node.type === "code") {
    const properties: Record<string, string> = {};
    if (node.showLineNumbers) {
      properties["data-myst-line-numbers"] = "true";
    }
    if (node.startingLineNumber !== undefined) {
      properties["data-myst-line-start"] = String(node.startingLineNumber);
    }
    if (node.emphasizeLines?.length) {
      properties["data-myst-emphasize-lines"] = node.emphasizeLines.join(",");
    }
    if (node.filename) {
      properties["data-myst-filename"] = node.filename;
    }
    if (Object.keys(properties).length > 0) {
      mergeProperties(node, properties);
    }
  }

  if (node.type === "outputs" && !node.children?.length) {
    const message = "Code cell output is not executed in the active-file preview; it is available in a full project build.";
    diagnostics.push({
      message,
      severity: "warning",
      ...(line === undefined ? {} : { line }),
    });
    setHast(node, "div", { class: "myst-code-cell-output", role: "note" }, [
      { type: "text", value: message },
    ]);
    node.type = "codeCellOutputPlaceholder";
    return;
  }

  if (node.type === "mystDirective") {
    const isAdmonitionDirective = node.name === "admonition"
      || Boolean(node.name && ADMONITION_TITLES[node.name]);
    const admonition = isAdmonitionDirective ? findNode(node, "admonition") : undefined;
    if (admonition && node.position) {
      admonition.position = {
        ...node.position,
        ...(admonition.position ?? {}),
        end: node.position.end ?? admonition.position?.end,
      };
    }
    if (
      admonition
      && !node.args?.trim()
      && !admonition.children?.some((child) => child.type === "admonitionTitle")
    ) {
      const inferredTitle = takeAdmonitionTitle(admonition.children ?? []);
      if (inferredTitle) {
        admonition.children = [inferredTitle.title, ...inferredTitle.body];
      }
    }
  }

  if (node.type === "div") {
    const classNames = (node.class ?? "").split(/\s+/u).filter(Boolean);
    const calloutClass = classNames.find((className) => className.startsWith("callout-"));
    const kind = calloutClass?.slice("callout-".length);
    if (kind && ADMONITION_TITLES[kind]) {
      const inferredTitle = takeAdmonitionTitle(node.children ?? []);
      const classes = new Set([
        "admonition",
        "simple",
        kind,
        ...classNames.filter((className) => className !== calloutClass),
      ]);
      node.children = [
        inferredTitle?.title ?? {
          type: "admonitionTitle",
          children: [{ type: "text", value: ADMONITION_TITLES[kind] }],
        },
        ...(inferredTitle?.body ?? node.children ?? []),
      ];
      setHast(node, "aside", {
        class: [...classes].join(" "),
        ...sourcePositionProperties(node, line),
      });
      node.type = "admonitionBlock";
      return;
    }
  }

  if (node.type === "html") {
    normalizeRawHtmlTable(node, line);
  }

  if (node.type === "table" && node.align !== undefined) {
    node.align = normalizeTableAlignment(node.align);
  }

  if (node.type === "mystDirective" && node.name === "figure") {
    const figure = node.children?.find((child) =>
      child.type === "container" && child.kind === "figure");
    if (figure && line !== undefined) {
      mergeProperties(figure, sourcePositionProperties(node, line));
    }
  }

  if (
    node.type === "mystDirective"
    && ["table", "list-table", "csv-table"].includes(node.name ?? "")
  ) {
    const alignment = normalizeTableAlignment(node.options?.align);
    const table = findNode(node, "table");
    if (alignment && table) {
      table.align = alignment;
    } else if (alignment) {
      const rawTable = findNode(node, "html");
      if (rawTable && containsRawTable(parseFragment(rawTable.value ?? "") as unknown as RawHtmlNode)) {
        rawTable.data = { ...(rawTable.data ?? {}), mystTableAlignment: alignment };
      }
    }
  }

  // A citeGroup emits a <div>, which the HTML parser hoists out of its enclosing
  // paragraph and splits the surrounding text across two elements.
  if (node.type === "citeGroup") {
    setHast(node, "span", { class: "myst-cite-group" });
    node.type = "citeGroupInline";
    return;
  }

  /*
   * The stock admonition handler prints the kind as a title and then also renders an
   * explicit `admonitionTitle` child, so a titled admonition shows two headings. It also
   * drops `hProperties`, leaving the block without the `data-line` scroll sync needs.
   */
  if (node.type === "admonition") {
    const rawKind = node.kind ?? "";
    const classNames = (node.class ?? "").split(/\s+/u).filter(Boolean);
    const classKind = classNames.find((className) => ADMONITION_TITLES[className]);
    const kind = rawKind === "admonition" ? classKind ?? rawKind : rawKind;
    const classes = new Set([
      "admonition",
      ...(kind === "admonition" ? [] : kind.split(/\s+/u)),
      ...classNames,
    ]);
    classes.delete("");
    if (node.icon === false) {
      classes.add("no-icon");
    }
    const isDropdown = classes.has("dropdown");
    const children = node.children ?? [];
    if (!children.some((child) => child.type === "admonitionTitle")) {
      node.children = [
        {
          type: "admonitionTitle",
          children: [{ type: "text", value: ADMONITION_TITLES[kind] ?? "Admonition" }],
        },
        ...children,
      ];
    }
    const title = node.children?.find((child) => child.type === "admonitionTitle");
    if (isDropdown && title) {
      setHast(title, "summary", { class: "admonition-title" });
      title.type = "admonitionTitleInline";
    }
    setHast(node, isDropdown ? "details" : "aside", {
      class: [...classes].join(" "),
      ...(isDropdown && node.open ? { open: true } : {}),
      ...sourcePositionProperties(node, line),
    });
    node.type = "admonitionBlock";
    return;
  }

  if (node.type === "cite") {
    const key = node.label ?? node.identifier ?? "?";
    node.children = [];
    setHast(node, "span", { class: "myst-unresolved myst-cite", title: `Unresolved citation: ${key}` }, [
      { type: "text", value: `[${key}]` },
    ]);
    return;
  }

  if (node.type === "image" && node.url?.startsWith("#tbl:")) {
    const message = `Notebook output ${node.url} is only available in a full project build.`;
    diagnostics.push({
      message,
      severity: "warning",
      ...(line === undefined ? {} : { line }),
    });
    setHast(node, "span", {
      class: "myst-unresolved myst-notebook-output",
      role: "note",
      title: message,
    }, [{ type: "text", value: message }]);
    node.type = "notebookOutputPlaceholder";
    return;
  }

  if (node.type === "bibliography") {
    node.children = [];
    setHast(node, "div", { class: "myst-unresolved myst-bibliography" }, [
      { type: "text", value: "Bibliography resolves at build time." },
    ]);
    return;
  }

  /*
   * A directive the parser understands is rewritten into real nodes (admonition,
   * container, table...) beneath its `mystDirective` wrapper. One the parser knows but
   * the HTML writer cannot emit leaves a node type that renders to nothing at all, and a
   * directive nobody knows leaves no children. Both become a visible placeholder.
   */
  if (node.type === "mystDirective") {
    const children = node.children ?? [];
    const resolvable = children.length > 0
      && !children.every((child) => BUILD_ONLY_TYPES.has(child.type));
    if (resolvable) {
      return;
    }
    const name = node.name ?? "unknown";
    // `includeBudgetExhausted` is set in expandIncludes. Includes skipped by the budget are covered by the single budget diagnostic.
    if (!node.data?.includeBudgetExhausted) {
      diagnostics.push({
        message: `Directive {${name}} is not available outside a full build.`,
        severity: "warning",
        ...(line === undefined ? {} : { line }),
      });
    }
    const body = (node.value ?? "").trim();
    // The stock writer crashes on a body-less unknown directive, so render the placeholder here.
    setHast(node, "div", { class: "myst-unresolved myst-directive", ...sourcePositionProperties(node, line) }, [
      {
        type: "element",
        tagName: "p",
        properties: { className: ["myst-directive-name"] },
        children: [{ type: "text", value: `{${name}}${node.args ? ` ${node.args}` : ""}` }],
      },
      ...(body
        ? [{
          type: "element",
          tagName: "pre",
          properties: {},
          children: [{ type: "text", value: body }],
        }]
        : []),
    ]);
    node.children = [];
    // The writer's own mystDirective handler ignores hName, so the node is renamed to
    // fall through to the generic handler that honours it.
    node.type = "mystDirectivePlaceholder";
    return;
  }

  if (line !== undefined && BLOCK_TYPES.has(node.type)) {
    mergeProperties(node, sourcePositionProperties(node, line));
  }
}

function offsetNodeLines(node: MystNode, offset: number): void {
  if (node.position?.start?.line !== undefined) {
    node.position.start.line += offset;
  }
  if (node.position?.end?.line !== undefined) {
    node.position.end.line += offset;
  }
  for (const child of node.children ?? []) {
    offsetNodeLines(child, offset);
  }
}

function expandVersionAdmonitions(
  node: MystNode,
  mystParse: MystEngine["mystParse"],
): void {
  for (const child of node.children ?? []) {
    const name = child.name?.toLowerCase();
    const title = name ? VERSION_ADMONITION_TITLES[name] : undefined;
    if (child.type === "mystDirective" && name && title) {
      const body = mystParse(child.value ?? "", MYST_PARSE_OPTIONS);
      offsetNodeLines(body, child.position?.start?.line ?? 0);
      child.type = "admonition";
      child.kind = name;
      child.class = name;
      child.children = body.children ?? [];
      const version = child.args?.trim();
      child.children.unshift({
        type: "admonitionTitle",
        children: [{
          type: "text",
          value: `${title}${version ? ` ${version}` : ""}:`,
        }],
      });
    }
    expandVersionAdmonitions(child, mystParse);
  }
}

/**
 * MyST lifts a paragraph that holds only an image to a bare block-level image (as does an `{image}`
 * directive), which would render as an unmapped `<img>`; wrapping it back keeps its source lines for editing and insertion.
 */
function wrapBareBlockImages(root: MystNode): void {
  const wrap = (image: MystNode, position: MystNode["position"]): MystNode =>
    ({ type: "paragraph", position, children: [image] });
  root.children = root.children?.map((child): MystNode => {
    if (child.type === "image" && child.position) {
      return wrap(child, child.position);
    }
    // An `{image}` directive holds a position-less image; it takes the directive's line range.
    if (child.type === "mystDirective" && child.name === "image" && child.position
      && child.children?.length === 1 && child.children[0].type === "image") {
      child.children = [wrap(child.children[0], child.position)];
    }
    return child;
  });
}

function walk(node: MystNode, diagnostics: RenderDiagnostic[], inheritedLine?: number): void {
  normalizeNode(node, diagnostics, inheritedLine);
  // Directives synthesise their content nodes without positions, so the directive's own
  // line is the only anchor the block children can inherit.
  const childLine = node.position?.start?.line ?? inheritedLine;
  for (const child of node.children ?? []) {
    walk(child, diagnostics, childLine);
  }
}

function shiftSourcePositions(node: MystNode, lineOffset: number): void {
  if (lineOffset === 0) return;
  if (node.position?.start?.line !== undefined) {
    node.position.start.line += lineOffset;
  }
  if (node.position?.end?.line !== undefined) {
    node.position.end.line += lineOffset;
  }
  for (const child of node.children ?? []) {
    shiftSourcePositions(child, lineOffset);
  }
}

function expandWikiLinks(node: MystNode): void {
  if (["link", "image", "code", "inlineCode", "math", "inlineMath", "html"].includes(node.type)) return;
  node.children = node.children?.flatMap((child): MystNode[] => {
    if (child.type !== "text" || !child.value) {
      expandWikiLinks(child);
      return [child];
    }
    const fragments: MystNode[] = [];
    let offset = 0;
    for (const match of child.value.matchAll(/(?<!!)\[\[([^\]\n]+)\]\]/gu)) {
      const [target, ...alias] = match[1].split("|");
      if (!target.trim()) continue;
      if (match.index > offset) fragments.push({ type: "text", value: child.value.slice(offset, match.index) });
      const fragmentIndex = target.indexOf("#");
      const note = (fragmentIndex < 0 ? target : target.slice(0, fragmentIndex)).trim();
      const heading = fragmentIndex < 0 ? "" : target.slice(fragmentIndex + 1).trim();
      const fragment = heading ? `#${encodeURIComponent(heading)}` : "";
      fragments.push({
        type: "link",
        url: note ? `wiki:${note.split("/").map((segment) => encodeURIComponent(segment)).join("/")}${fragment}` : `#${heading.toLowerCase().replace(/\s+/gu, "-")}`,
        children: [{ type: "text", value: alias.length ? alias.join("|").trim() : target.trim() }],
      });
      offset = match.index + match[0].length;
    }
    if (!fragments.length) return [child];
    if (offset < child.value.length) fragments.push({ type: "text", value: child.value.slice(offset) });
    return fragments;
  });
}

// Bare `http(s)://` and `www.` URLs in prose, GFM autolink-literal style. Everything that already
// carries its own meaning stays literal: code, math, raw HTML, existing links, roles and references.
// mystRole and mystTarget are kept as a guard: their content is literal markup, not prose.
const AUTOLINK_SKIP_PARENTS = new Set([
  "link", "linkReference", "image", "imageReference", "crossReference", "cite", "footnoteReference",
  "code", "inlineCode", "math", "inlineMath", "html", "mystRole", "mystTarget",
]);
const BARE_URL = /(?:https?:\/\/|www\.)[^\s<>\uE000-\uF8FF]+/giu;
const BARE_URL_HOST = /^(?:https?:\/\/[\p{L}\p{N}]|www\.[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)+)/iu;

/** Drops trailing sentence punctuation and unbalanced closing parentheses from a URL candidate. */
function trimBareUrl(url: string): string {
  let opens = 0;
  let closes = 0;
  for (let index = 0; index < url.length; index += 1) {
    if (url[index] === "(") opens += 1;
    else if (url[index] === ")") closes += 1;
  }
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    if (last === ")") {
      if (closes <= opens) break;
      closes -= 1;
      end -= 1;
    } else if ("?!.,:;*_~'\"".includes(last)) {
      end -= 1;
    } else {
      break;
    }
  }
  return url.slice(0, end);
}

function autolinkBareUrls(node: MystNode): void {
  if (AUTOLINK_SKIP_PARENTS.has(node.type) || !node.children) return;
  node.children = node.children.flatMap((child): MystNode[] => {
    if (child.type !== "text" || !child.value) {
      autolinkBareUrls(child);
      return [child];
    }
    const value = child.value;
    const fragments: MystNode[] = [];
    let offset = 0;
    for (const match of value.matchAll(BARE_URL)) {
      const before = match.index > 0 ? value[match.index - 1] : "";
      if (before && /[\p{L}\p{N}_@/.-]/u.test(before)) continue;
      const text = trimBareUrl(match[0]);
      if (!BARE_URL_HOST.test(text)) continue;
      if (match.index > offset) fragments.push({ type: "text", value: value.slice(offset, match.index) });
      fragments.push({
        type: "link",
        url: /^www\./iu.test(text) ? `https://${text}` : text,
        children: [{ type: "text", value: text }],
      });
      offset = match.index + text.length;
    }
    if (!fragments.length) return [child];
    if (offset < value.length) fragments.push({ type: "text", value: value.slice(offset) });
    return fragments;
  });
}

// Inside these nodes a marker is literal text: a checkbox inside link text would compete with
// the link for the click.
const INERT_CHECKBOX_PARENTS = new Set([
  "link", "linkReference", "image", "imageReference", "crossReference", "cite", "footnoteReference",
]);

function restoreCheckboxText(value: unknown, markers: readonly CheckboxMarker[]): unknown {
  if (typeof value === "string") return restoreCheckboxPlaceholders(value, markers);
  if (Array.isArray(value)) return value.map((item) => restoreCheckboxText(item, markers));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) record[key] = restoreCheckboxText(record[key], markers);
  }
  return value;
}

function checkboxNode(marker: CheckboxMarker): MystNode {
  return {
    type: "mystCheckbox",
    data: {
      hName: "input",
      hProperties: {
        type: "checkbox",
        class: "myst-checkbox",
        ...(marker.checked ? { checked: true } : {}),
        "data-myst-checkbox-line": marker.line,
        "data-myst-checkbox-column": marker.column,
      },
      hChildren: [],
    },
  };
}

function markTaskList(node: MystNode): void {
  if (node.type === "listItem") {
    const first = node.children?.[0];
    if (first?.type === "paragraph" && first.children?.[0]?.type === "mystCheckbox") {
      mergeProperties(node, { class: "task-list-item" });
    }
  } else if (node.type === "list" && node.children?.some((item) =>
    (item.data?.hProperties as { class?: unknown } | undefined)?.class === "task-list-item")) {
    mergeProperties(node, { class: "contains-task-list" });
  }
}

/**
 * Turns marker placeholders in prose into checkbox inputs and restores the literal marker
 * everywhere else (code, math, raw HTML, link text, URLs, directive arguments and options).
 */
function convertCheckboxPlaceholders(
  node: MystNode,
  markers: readonly CheckboxMarker[],
  inert = false,
): void {
  for (const key of Object.keys(node)) {
    if (key === "children" || key === "position" || key === "type") continue;
    const record = node as unknown as Record<string, unknown>;
    record[key] = restoreCheckboxText(record[key], markers);
  }
  if (!node.children) return;
  const childrenInert = inert || INERT_CHECKBOX_PARENTS.has(node.type);
  node.children = node.children.flatMap((child): MystNode[] => {
    if (child.type === "text" && !childrenInert && child.value && hasCheckboxPlaceholder(child.value)) {
      return splitCheckboxPlaceholders(child.value, markers).map((segment) => "marker" in segment
        ? checkboxNode(markers[segment.marker])
        : { ...child, value: segment.text });
    }
    convertCheckboxPlaceholders(child, markers, childrenInert);
    return [child];
  });
  markTaskList(node);
}

/**
 * Renders one Markdown buffer to HTML entirely in-process.
 *
 * Block elements carry `data-line` so the webview can align scrolling with the editor.
 */
export async function renderMyst(
  source: string,
  context?: MystRenderContext,
): Promise<MystRenderResult> {
  const { mystParse, mystToHtml } = await loadEngine();
  const diagnostics: RenderDiagnostic[] = [];
  const dependencies = new Set<string>();
  const markdown = stripFrontmatter(source);
  const removedPrefix = source.slice(0, source.length - markdown.length);
  const lineOffset = removedPrefix.match(/\r\n|\r|\n/gu)?.length ?? 0;
  const checkboxes = prepareCheckboxMarkers(markdown, lineOffset + 1);
  const ast = mystParse(expandGithubAlerts(checkboxes.text), MYST_PARSE_OPTIONS);
  shiftSourcePositions(ast, lineOffset);
  repairGroupedContextTagHtml(ast, mystParse);
  if (context?.sourcePath) {
    const includeBudget = createIncludeBudget();
    expandIncludes(
      ast,
      context.sourcePath,
      context,
      mystParse,
      diagnostics,
      dependencies,
      new Set([context.sourcePath]),
      includeBudget,
    );
  }
  normalizeFigureCaptions(ast);
  normalizeCaptionlessReferences(ast);
  expandVersionAdmonitions(ast, mystParse);
  expandWikiLinks(ast);
  if (checkboxes.markers.length > 0) {
    convertCheckboxPlaceholders(ast, checkboxes.markers);
  }
  autolinkBareUrls(ast);
  normalizeContextTagContainers(ast);
  wrapBareBlockImages(ast);
  walk(ast, diagnostics);
  const tableAlignments: Array<TableAlignmentSpec | undefined> = [];
  collectTableAlignments(ast, tableAlignments);
  return {
    html: highlightCodeBlocks(applyTableAlignments(mystToHtml(ast), tableAlignments)),
    diagnostics,
    dependencies: [...dependencies],
  };
}

/**
 * Removes a leading YAML frontmatter block; MyST would otherwise emit it as a
 * `language-yaml` code block, duplicating the properties table above the body.
 */
function stripFrontmatter(source: string): string {
  const extraction = extractFrontmatter(source);
  if (!extraction.present || !extraction.text) {
    return source;
  }
  const match = matchFrontmatterBlock(source);
  return match ? source.slice(match.length) : source;
}
