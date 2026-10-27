/**
 * The MyST renderer: one Markdown buffer to HTML, in-process. `renderMyst` runs three ordered lists
 * of named passes: source passes on the text before parsing, tree passes on the parsed tree (the
 * include expansion of this file among them, then the node normalization of `mystNormalize.ts`),
 * and HTML passes on the writer's output. Each pass lives in the module of its subject.
 */

import * as path from "node:path";

import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";
import { type CheckboxMarker, prepareCheckboxMarkers } from "./checkboxMarkers";
import { convertCommentMarkers } from "./commentMarkers";
import {
  expandVersionAdmonitions,
  labelLinkRoles,
  normalizeCaptionlessReferences,
  normalizeFigureCaptions,
  normalizeRawDetailsAndKbd,
  shiftSourcePositions,
  wrapBareBlockImages,
} from "./mystBlockTransforms";
import { normalizeContextTagContainers, repairGroupedContextTagHtml } from "./mystContextTags";
import { expandRawHtmlElements } from "./mystRawHtml";
import { expandTocMarkers } from "./mystToc";
import { loadEngine, MYST_PARSE_OPTIONS, type MystEngine } from "./mystEngine";
import { neutralizeDirectiveErrors } from "./mystDirectiveErrors";
import { splitUnclosedFences } from "./mystUnclosedFences";
import { expandGithubAlerts } from "./mystGithubAlerts";
import { expandGrids, expandToctrees } from "./mystGridToctree";
import {
  autolinkBareUrls,
  convertCheckboxPlaceholders,
  expandWikiLinks,
  prepareDollarAmounts,
  normalizeAnchors,
  resolveAnchorIds,
  restoreDollarPlaceholders,
  restoreDollarAmounts,
} from "./mystInlineTransforms";
import { findNode, type MystNode, sourcePositionProperties } from "./mystNode";
import { isPlantUmlNode, plantUmlFileRequest, walk } from "./mystNormalize";
import { detectMystSyntax, MAX_EXTENSION_WARNINGS, mystExtensionWarning } from "./mystSyntaxDetect";
import {
  applyTableAlignments,
  applyTableAlignmentsToTree,
  collectTableAlignments,
  needsHtmlTablePass,
  type TableAlignmentSpec,
} from "./mystTables";
import type { BoundedTextRead } from "../security/resource-policy";
import type { MystIncludeSource, MystRenderContext, MystRenderResult, RenderDiagnostic } from "./mystTypes";
import { describePlantUmlFileRefusal } from "./plantUmlIncludes";

// @implements_req SwRS-MDOKFSTUDIO-CODE-001
/**
 * Shiki and its grammars are about 2.3 MB of the bundle and only a document with a code block needs
 * them. The extension bundle (esbuild.mjs) points this `require` at `lazy/highlight.js`, which loads
 * on the first highlighted document; in the unit tests it is the module itself.
 */
function highlightCodeBlocks(html: string): string {
  if (!html.includes("<code")) return html;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("./highlight") as typeof import("./highlight")).highlightCodeBlocks(html);
}

export { parseMystSource, preloadMystEngine } from "./mystEngine";
export type { MystIncludeSource, MystRenderContext, MystRenderResult, RenderDiagnostic } from "./mystTypes";

const MAX_INCLUDE_DEPTH = 8;
/** Per-render ceilings on include expansion; beyond them includes stay placeholders. */
export const INCLUDE_BUDGET_MAX_EXPANSIONS = 2000;
/** Counts UTF-16 code units of included source text (`string.length`), not encoded bytes. */
export const INCLUDE_BUDGET_MAX_CHARS = 10 * 1024 * 1024;

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-014
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

function includeBudgetDiagnostic(line: number | undefined): RenderDiagnostic {
  return {
    message: "Include budget exhausted: "
      + `at most ${INCLUDE_BUDGET_MAX_EXPANSIONS} includes or `
      + `${Math.round(INCLUDE_BUDGET_MAX_CHARS / (1024 * 1024))} Mi characters of included text are `
      + "expanded per render; the remaining includes are shown as placeholders.",
    severity: "warning",
    ...(line === undefined ? {} : { line }),
  };
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-068
/**
 * Reads the diagram file of a `{uml}` / `{plantuml}` directive into its body, charged to the
 * include budget and recorded as a dependency (a missing file inside the roots too, so the preview
 * renders again once it appears). A refusal is kept for `normalizeNode` to show.
 */
function resolvePlantUmlFile(
  node: MystNode,
  request: string,
  sourcePath: string,
  context: MystRenderContext,
  diagnostics: RenderDiagnostic[],
  dependencies: Set<string>,
  budget: IncludeBudget,
): void {
  const line = node.position?.start?.line;
  const refuse = (message: string, report = true): void => {
    node.data = { ...node.data, plantUmlFileError: message };
    if (report) {
      diagnostics.push({ message, severity: "warning", ...(line === undefined ? {} : { line }) });
    }
  };
  if (budget.exhausted) {
    refuse(`PlantUML file ${request} was not read: the include budget of this render is exhausted.`, false);
    return;
  }
  const read: BoundedTextRead = context.readDiagramFile
    ? context.readDiagramFile(request, sourcePath)
    : (() => {
      const included = context.resolveInclude(request, sourcePath);
      return included
        ? { ok: true as const, path: included.path, source: included.source }
        : { ok: false as const, refusal: "missing-resource" as const };
    })();
  if (!read.ok) {
    if (read.candidate) {
      dependencies.add(read.candidate);
    }
    refuse(describePlantUmlFileRefusal(request, read.refusal));
    return;
  }
  dependencies.add(read.path);
  if (
    budget.expansions >= INCLUDE_BUDGET_MAX_EXPANSIONS
    || budget.bytes + read.source.length > INCLUDE_BUDGET_MAX_CHARS
  ) {
    budget.exhausted = true;
    diagnostics.push(includeBudgetDiagnostic(line));
    refuse(`PlantUML file ${request} was not read: the include budget of this render is exhausted.`, false);
    return;
  }
  budget.expansions += 1;
  budget.bytes += read.source.length;
  node.value = read.source;
  node.data = { ...node.data, plantUmlFile: request, plantUmlBase: read.path };
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-012
// @implements_req SwRS-MDOKFSTUDIO-CORE-013
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
    const plantUmlFile = plantUmlFileRequest(child);
    if (plantUmlFile) {
      resolvePlantUmlFile(child, plantUmlFile, sourcePath, context, diagnostics, dependencies, budget);
      expandedChildren.push(child);
      continue;
    }
    if (isPlantUmlNode(child) && includeStack.size > 1) {
      // A diagram of an included document: its `!include` lines are relative to that document.
      child.data = { ...child.data, plantUmlBase: sourcePath };
    }
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
        diagnostics.push(includeBudgetDiagnostic(child.position?.start?.line));
        child.data = { ...child.data, includeBudgetExhausted: true };
        expandedChildren.push(child);
        continue;
      }
      budget.expansions += 1;
      budget.bytes += included.source.length;

      dependencies.add(included.path);
      let parsedAst = budget.parsed.get(included.path);
      if (!parsedAst) {
        parsedAst = mystParse(
          prepareDollarAmounts(expandGithubAlerts(stripFrontmatter(included.source))),
          MYST_PARSE_OPTIONS,
        );
        restoreDollarPlaceholders(parsedAst);
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

/** What the passes of one render share: the inputs, the parsed tree and what the passes collect. */
interface RenderState {
  readonly source: string;
  readonly context: MystRenderContext | undefined;
  readonly mystParse: MystEngine["mystParse"];
  readonly diagnostics: RenderDiagnostic[];
  readonly dependencies: Set<string>;
  /**
   * Lines of frontmatter removed before parsing: the tree's lines are shifted back by this much.
   */
  readonly lineOffset: number;
  /** The text the parser read (after the source passes). */
  readonly parsedText: string;
  readonly checkboxMarkers: readonly CheckboxMarker[];
  readonly ast: MystNode;
  anchorLabels: ReadonlySet<string>;
  readonly tableAlignments: Array<TableAlignmentSpec | undefined>;
}

/** A named step of a render, run in list order. */
interface RenderPass<Input> {
  readonly name: string;
  readonly run: (input: Input) => void;
}

/** The tree passes, in order, from the parsed tree to the tree the HTML writer reads. */
const TREE_PASSES: ReadonlyArray<RenderPass<RenderState>> = [
  { name: "shift source lines", run: (state) => shiftSourcePositions(state.ast, state.lineOffset) },
  {
    name: "unclosed fences",
    run: (state) => splitUnclosedFences(state.ast, {
      sourceLines: state.source.split(/\r\n|\r|\n/u),
      parsedLines: state.parsedText.split(/\r\n|\r|\n/u),
      lineOffset: state.lineOffset,
      parse: (fragment) => state.mystParse(fragment, MYST_PARSE_OPTIONS),
      diagnostics: state.diagnostics,
    }),
  },
  {
    name: "grids",
    run: (state) => expandGrids(
      state.ast,
      (fragment) => state.mystParse(fragment, MYST_PARSE_OPTIONS),
      { lines: state.parsedText.split(/\r\n|\r|\n/u), firstLine: state.lineOffset + 1 },
    ),
  },
  { name: "context tags", run: (state) => repairGroupedContextTagHtml(state.ast, state.mystParse) },
  {
    // @implements_req SwRS-MDOKFSTUDIO-MYST-072
    name: "MyST extension check",
    run: (state) => {
      if (!state.context?.enabledMystExtensions) return;
      const enabled = state.context.enabledMystExtensions;
      detectMystSyntax(state.ast, state.source)
        .filter((use) => !enabled.has(use.ext))
        .slice(0, MAX_EXTENSION_WARNINGS)
        .forEach((use) => state.diagnostics.push({
          code: "myst-extension",
          severity: "warning",
          line: use.line,
          message: mystExtensionWarning(use),
        }));
    },
  },
  {
    name: "includes",
    run: (state) => {
      const { context } = state;
      if (!context?.sourcePath) return;
      const includeBudget = createIncludeBudget();
      expandIncludes(
        state.ast,
        context.sourcePath,
        context,
        state.mystParse,
        state.diagnostics,
        state.dependencies,
        new Set([context.sourcePath]),
        includeBudget,
      );
    },
  },
  {
    name: "toctrees",
    run: (state) => {
      const { context } = state;
      const sourcePath = context?.sourcePath ?? "";
      expandToctrees(state.ast, {
        sourcePath,
        read: (request) => (context && sourcePath ? context.resolveInclude(request, sourcePath) : undefined),
        ...(context?.listDocuments ? { list: (pattern) => context.listDocuments?.(pattern, sourcePath) ?? [] } : {}),
        dependencies: state.dependencies,
      });
    },
  },
  { name: "figure captions", run: (state) => normalizeFigureCaptions(state.ast) },
  { name: "caption-less references", run: (state) => normalizeCaptionlessReferences(state.ast) },
  { name: "doc and download labels", run: (state) => labelLinkRoles(state.ast) },
  { name: "version admonitions", run: (state) => expandVersionAdmonitions(state.ast, state.mystParse) },
  { name: "dollar placeholders", run: (state) => restoreDollarPlaceholders(state.ast) },
  { name: "dollar amounts", run: (state) => restoreDollarAmounts(state.ast) },
  { name: "toc markers", run: (state) => expandTocMarkers(state.ast) },
  { name: "wiki links", run: (state) => expandWikiLinks(state.ast) },
  {
    name: "checkboxes",
    run: (state) => {
      if (state.checkboxMarkers.length > 0) {
        convertCheckboxPlaceholders(state.ast, state.checkboxMarkers);
      }
    },
  },
  { name: "bare URLs", run: (state) => autolinkBareUrls(state.ast) },
  {
    name: "comment markers",
    run: (state) => convertCommentMarkers(
      state.ast,
      (comment) => sourcePositionProperties(comment, comment.position?.start?.line),
    ),
  },
  { name: "raw details and kbd", run: (state) => normalizeRawDetailsAndKbd(state.ast, state.mystParse) },
  { name: "raw html elements", run: (state) => expandRawHtmlElements(state.ast) },
  { name: "context tag containers", run: (state) => normalizeContextTagContainers(state.ast) },
  { name: "bare block images", run: (state) => wrapBareBlockImages(state.ast) },
  { name: "anchors", run: (state) => { state.anchorLabels = normalizeAnchors(state.ast); } },
  {
    name: "directive errors",
    run: (state) => neutralizeDirectiveErrors(state.ast, state.source.split(/\r\n|\r|\n/u)),
  },
  { name: "normalize nodes", run: (state) => walk(state.ast, state.diagnostics) },
  {
    name: "table alignments",
    run: (state) => {
      collectTableAlignments(state.ast, state.tableAlignments);
      if (!needsHtmlTablePass(state.tableAlignments)) {
        // Pipe tables only: the writer emits the attributes, and the HTML needs no second parse.
        applyTableAlignmentsToTree(state.ast);
        state.tableAlignments.length = 0;
      }
    },
  },
];

/** The HTML passes, in order, on the writer's output. */
const HTML_PASSES: ReadonlyArray<{ readonly name: string; readonly run: (html: string, state: RenderState) => string }> = [
  { name: "table alignments", run: (html, state) => applyTableAlignments(html, state.tableAlignments) },
  { name: "code highlighting", run: (html) => highlightCodeBlocks(html) },
  { name: "anchor ids", run: (html, state) => resolveAnchorIds(html, state.anchorLabels) },
];

// @implements_req SwRS-MDOKFSTUDIO-CORE-001
// @implements_req SwRS-MDOKFSTUDIO-GFM-029
// @implements_req SwRS-MDOKFSTUDIO-GFM-008
// @implements_req SwRS-MDOKFSTUDIO-MYST-017
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
  // The source passes: frontmatter removed, checkbox markers set aside, GitHub alerts rewritten.
  const markdown = stripFrontmatter(source);
  const removedPrefix = source.slice(0, source.length - markdown.length);
  const lineOffset = removedPrefix.match(/\r\n|\r|\n/gu)?.length ?? 0;
  const checkboxes = prepareCheckboxMarkers(markdown, lineOffset + 1);
  const parsedText = prepareDollarAmounts(expandGithubAlerts(checkboxes.text));
  const state: RenderState = {
    source,
    context,
    mystParse,
    diagnostics: [],
    dependencies: new Set<string>(),
    lineOffset,
    parsedText,
    checkboxMarkers: checkboxes.markers,
    ast: mystParse(parsedText, MYST_PARSE_OPTIONS),
    anchorLabels: new Set<string>(),
    tableAlignments: [],
  };
  for (const pass of TREE_PASSES) {
    pass.run(state);
  }
  let html = mystToHtml(state.ast);
  for (const pass of HTML_PASSES) {
    html = pass.run(html, state);
  }
  return {
    html,
    diagnostics: state.diagnostics,
    dependencies: [...state.dependencies],
  };
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-003
// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-001
/**
 * Removes a leading YAML frontmatter block; MyST would otherwise emit it as a
 * `language-yaml` code block, duplicating the properties table above the body.
 */
function stripFrontmatter(source: string): string {
  // The fence alone decides: no YAML parse here (the analysis parses the block once).
  const match = matchFrontmatterBlock(source);
  return match?.body ? source.slice(match.length) : source;
}
