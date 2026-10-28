/**
 * The node normalization pass of the MyST renderer: a dispatch table of rules per node kind
 * (`node.type`) that rewrites what the HTML writer cannot emit (diagrams, unexecuted outputs,
 * unresolved citations, unknown directives), runs the directive plug-ins, and gives every block
 * node its source line for scroll sync and editing.
 */

import { ADMONITION_TITLES } from "../directives/admonition";
import { chartKindOf, type ChartFiles } from "./chartData";
import { OKF_WIDTH } from "../directives/figure";
import { directiveNamed } from "../directives/registry";
import {
  mergeProperties,
  type MystNode,
  normalizeTableAlignment,
  setHast,
  sourcePositionProperties,
  takeAdmonitionTitle,
} from "./mystNode";
import { normalizeRawHtmlTable } from "./mystTables";
import type { RenderDiagnostic } from "./mystTypes";

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

// @implements_req SwRS-MDOKFSTUDIO-DIAG-001
// @implements_req SwRS-MDOKFSTUDIO-DIAG-023
function normalizeDiagram(
  node: MystNode,
  line: number | undefined,
  kind: "mermaid" | "plantuml" | "vega",
  diagramProperties: Record<string, string> = {},
): void {
  const source = node.value ?? "";
  const label = kind === "mermaid" ? "Mermaid" : kind === "vega" ? "Chart" : "PlantUML";
  setHast(node, "figure", {
    class: `myst-${kind}-figure`,
    ...sourcePositionProperties(node, line),
  }, [
    {
      type: "element",
      tagName: "div",
      properties: { className: [`myst-${kind}-diagram`], "aria-label": `${label} diagram`, ...diagramProperties },
      children: [{ type: "text", value: source }],
    },
    {
      type: "element", tagName: "details", properties: { className: [`myst-${kind}-source`] },
      children: [
        {
          type: "element",
          tagName: "summary",
          properties: {},
          children: [{ type: "text", value: kind === "vega" ? "Chart source" : "Diagram source" }],
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

/** A body made only of directive options (`:caption: ...`) is no diagram source. */
const OPTION_ONLY_BODY = /^(?:[ \t]*:[\w-]+:.*(?:\r\n|\r|\n|$))*\s*$/u;

/** True for a PlantUML diagram: a `{plantuml}`/`{uml}` directive or a `plantuml` code block. */
export function isPlantUmlNode(node: MystNode): boolean {
  return node.type === "plantuml"
    || (node.type === "mystDirective" && ["plantuml", "uml"].includes(node.name?.toLowerCase() ?? ""))
    || (node.type === "code" && node.lang?.toLowerCase() === "plantuml");
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-068
/**
 * `{uml} path.puml` (sphinxcontrib-plantuml) and `{plantuml} path.puml` without a body name the
 * diagram file. Options in the body (`:caption:`) are not rendered.
 */
export function plantUmlFileRequest(node: MystNode): string | undefined {
  if (node.type !== "mystDirective" || !["plantuml", "uml"].includes(node.name?.toLowerCase() ?? "")) {
    return undefined;
  }
  const request = node.args?.trim() ?? "";
  return request && OPTION_ONLY_BODY.test(node.value ?? "") ? request : undefined;
}

/**
 * What a node rule gets besides the node: its source line (own or inherited) and the diagnostics.
 */
interface NodeVisit {
  readonly line: number | undefined;
  readonly diagnostics: RenderDiagnostic[];
}

/**
 * One rule of `normalizeNode`: the node kinds (`node.type`) it applies to and its rewrite. `run`
 * returns true when it has finished the node: no later rule runs and the node gets no block line.
 */
interface NodeRule {
  readonly name: string;
  readonly kinds: readonly string[];
  readonly run: (node: MystNode, visit: NodeVisit) => boolean;
}

/*
 * The rules in the order they run. `cite` otherwise emits an empty `<div>` inside a paragraph,
 * which is both invalid and invisible; unresolved references are shown as their raw key instead.
 */
const NODE_RULES: readonly NodeRule[] = [
  {
    name: "mermaid diagram",
    kinds: ["mermaid", "code"],
    run: (node, { line }) => {
      if (!(node.type === "mermaid" || (node.type === "code" && node.lang?.toLowerCase() === "mermaid"))) {
        return false;
      }
      normalizeDiagram(node, line, "mermaid");
      return true;
    },
  },
  {
    // @implements_req SwRS-MDOKFSTUDIO-DIAG-121
    // @implements_req SwRS-MDOKFSTUDIO-DIAG-122
    name: "vega chart",
    kinds: ["code"],
    run: (node, { line }) => {
      const kind = chartKindOf(node);
      if (!kind) return false;
      const properties: Record<string, string> = { "data-myst-chart-kind": kind };
      const chart = node.data?.chartFiles as ChartFiles | undefined;
      if (chart && Object.keys(chart.files).length > 0) properties["data-myst-chart-files"] = JSON.stringify(chart.files);
      if (chart && Object.keys(chart.errors).length > 0) properties["data-myst-chart-errors"] = JSON.stringify(chart.errors);
      normalizeDiagram(node, line, "vega", properties);
      return true;
    },
  },
  {
    name: "plantuml diagram",
    kinds: ["plantuml", "mystDirective", "code"],
    run: (node, { line, diagnostics }) => {
      if (!isPlantUmlNode(node)) return false;
      const fileRequest = plantUmlFileRequest(node);
      const fileError = typeof node.data?.plantUmlFileError === "string"
        ? node.data.plantUmlFileError
        : fileRequest && typeof node.data?.plantUmlFile !== "string"
          ? `PlantUML file ${fileRequest} could not be read.`
          : node.type === "mystDirective" && node.name?.toLowerCase() === "uml" && !(node.value ?? "").trim()
            ? "The {uml} directive needs a diagram file path or a diagram body."
            : undefined;
      if (fileError !== undefined) {
        if (typeof node.data?.plantUmlFileError !== "string") {
          diagnostics.push({ message: fileError, severity: "warning", ...(line === undefined ? {} : { line }) });
        }
        // Not a `.myst-plantuml-diagram`: neither engine treats the message as diagram source.
        setHast(node, "div", { class: "myst-plantuml-file-error", ...sourcePositionProperties(node, line) }, [{
          type: "element",
          tagName: "p",
          properties: { className: ["myst-plantuml-error"] },
          children: [{ type: "text", value: fileError }],
        }]);
        node.children = [];
        node.type = "plantumlFileError";
        return true;
      }
      const diagramProperties: Record<string, string> = {};
      if (typeof node.data?.plantUmlFile === "string") {
        diagramProperties["data-plantuml-file"] = node.data.plantUmlFile;
      }
      if (typeof node.data?.plantUmlBase === "string") {
        // `!include` lines resolve next to this file instead of the previewed document.
        diagramProperties["data-plantuml-base"] = node.data.plantUmlBase;
      }
      normalizeDiagram(node, line, "plantuml", diagramProperties);
      return true;
    },
  },
  {
    // @implements_req SwRS-MDOKFSTUDIO-CODE-005
    // @implements_req SwRS-MDOKFSTUDIO-CODE-014
    name: "code block options",
    kinds: ["code"],
    run: (node) => {
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
      return false;
    },
  },
  {
    name: "unexecuted cell output",
    kinds: ["outputs"],
    run: (node, { line, diagnostics }) => {
      if (node.children?.length) return false;
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
      return true;
    },
  },
  {
    // The render pass of a registered directive plug-in (src/core/directives/registry.ts).
    name: "directive plug-in",
    kinds: ["mystDirective"],
    run: (node, { line }) => {
      directiveNamed(node.name)?.render?.(node, line);
      return false;
    },
  },
  {
    name: "callout div",
    kinds: ["div"],
    run: (node, { line }) => {
      const classNames = (node.class ?? "").split(/\s+/u).filter(Boolean);
      const calloutClass = classNames.find((className) => className.startsWith("callout-"));
      const kind = calloutClass?.slice("callout-".length);
      if (!(kind && ADMONITION_TITLES[kind])) return false;
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
      return true;
    },
  },
  {
    name: "raw HTML table",
    kinds: ["html"],
    run: (node, { line }) => {
      normalizeRawHtmlTable(node, line);
      return false;
    },
  },
  {
    name: "table alignment",
    kinds: ["table"],
    run: (node) => {
      if (node.align !== undefined) {
        node.align = normalizeTableAlignment(node.align);
      }
      return false;
    },
  },
  {
    // A citeGroup emits a <div>, which the HTML parser hoists out of its enclosing
    // paragraph and splits the surrounding text across two elements.
    name: "citation group",
    kinds: ["citeGroup"],
    run: (node) => {
      setHast(node, "span", { class: "myst-cite-group" });
      node.type = "citeGroupInline";
      return true;
    },
  },
  {
    // @implements_req SwRS-MDOKFSTUDIO-MYST-001
    // @implements_req SwRS-MDOKFSTUDIO-MYST-006
    /*
     * The stock admonition handler prints the kind as a title and then also renders an
     * explicit `admonitionTitle` child, so a titled admonition shows two headings. It also
     * drops `hProperties`, leaving the block without the `data-line` scroll sync needs.
     */
    name: "admonition",
    kinds: ["admonition"],
    run: (node, { line }) => {
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
        // @implements_req SwRS-MDOKFSTUDIO-GFM-009
        // A rewritten GitHub alert: a click in its body opens the whole alert (see mappedBlocks).
        ...(node.data?.githubAlert === true ? { "data-okf-github-alert": "true" } : {}),
        ...sourcePositionProperties(node, line),
      });
      node.type = "admonitionBlock";
      return true;
    },
  },
  {
    name: "unresolved citation",
    kinds: ["cite"],
    run: (node) => {
      const key = node.label ?? node.identifier ?? "?";
      node.children = [];
      setHast(node, "span", { class: "myst-unresolved myst-cite", title: `Unresolved citation: ${key}` }, [
        { type: "text", value: `[${key}]` },
      ]);
      return true;
    },
  },
  {
    name: "notebook output",
    kinds: ["image"],
    run: (node, { line, diagnostics }) => {
      if (!node.url?.startsWith("#tbl:")) return false;
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
      return true;
    },
  },
  {
    name: "bibliography",
    kinds: ["bibliography"],
    run: (node) => {
      node.children = [];
      setHast(node, "div", { class: "myst-unresolved myst-bibliography" }, [
        { type: "text", value: "Bibliography resolves at build time." },
      ]);
      return true;
    },
  },
  {
    // @implements_req SwRS-MDOKFSTUDIO-CORE-012
    // @implements_req SwRS-MDOKFSTUDIO-CORE-022
    /*
     * A directive the parser understands is rewritten into real nodes (admonition,
     * container, table...) beneath its `mystDirective` wrapper. One the parser knows but
     * the HTML writer cannot emit leaves a node type that renders to nothing at all, and a
     * directive nobody knows leaves no children. Both become a visible placeholder.
     */
    name: "directive placeholder",
    kinds: ["mystDirective", "mystDirectiveError"],
    run: (node, { line, diagnostics }) => {
      // The parser reports a directive without its required argument or body as an error node,
      // which the writer cannot emit; `neutralizeDirectiveErrors` has turned those into raw code
      // blocks. Only `{include}` is shown as a placeholder here: it is what a writer types while
      // the preview re-renders.
      if (node.type === "mystDirectiveError" && node.name !== "include") {
        return false;
      }
      const children = node.children ?? [];
      const resolvable = children.length > 0
        && !children.every((child) => BUILD_ONLY_TYPES.has(child.type));
      if (resolvable) {
        return true;
      }
      const name = node.name ?? "unknown";
      // `includeBudgetExhausted` is set in expandIncludes. Includes skipped by the budget are covered by the single budget diagnostic.
      if (!node.data?.includeBudgetExhausted) {
        diagnostics.push({
          message: node.type === "mystDirectiveError"
            ? `Directive {${name}} needs a path.`
            : `Directive {${name}} is not available outside a full build.`,
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
      return true;
    },
  },
  {
    name: "image size",
    kinds: ["image"],
    run: (node) => {
      normalizeImageSize(node);
      return false;
    },
  },
  {
    // @implements_req SwRS-MDOKFSTUDIO-MYST-031
    name: "figure alignment",
    kinds: ["container"],
    run: (node) => {
      if (node.kind !== "figure") return false;
      const align = node.children?.find((child) => child.type === "image")?.align;
      if (isFigureAlignment(align)) {
        node.class = [node.class, `align-${align}`].filter(Boolean).join(" ");
      }
      return false;
    },
  },
];

/** The dispatch table: for each node kind, its rules with their place in `NODE_RULES`. */
const RULES_BY_KIND = new Map<string, Array<{ order: number; rule: NodeRule }>>();
NODE_RULES.forEach((rule, order) => {
  for (const kind of rule.kinds) {
    const rules = RULES_BY_KIND.get(kind) ?? [];
    rules.push({ order, rule });
    RULES_BY_KIND.set(kind, rules);
  }
});

// @implements_req SwRS-MDOKFSTUDIO-CORE-003
/**
 * Rewrites nodes the HTML writer cannot resolve without a project-wide build, and gives block
 * nodes their source line. Runs the rules of the node's kind in order; a rule that changes the
 * kind without finishing the node (a raw HTML table) hands it to the later rules of its new kind.
 */
function normalizeNode(node: MystNode, diagnostics: RenderDiagnostic[], inheritedLine?: number): void {
  const line = node.position?.start?.line ?? inheritedLine;
  const visit: NodeVisit = { line, diagnostics };
  let kind = node.type;
  let rules = RULES_BY_KIND.get(kind) ?? [];
  for (let index = 0; index < rules.length; index += 1) {
    const { order, rule } = rules[index];
    if (rule.run(node, visit)) return;
    if (node.type !== kind) {
      kind = node.type;
      rules = (RULES_BY_KIND.get(kind) ?? []).filter((entry) => entry.order > order);
      index = -1;
    }
  }
  // @implements_req SwRS-MDOKFSTUDIO-MYST-098
  if (line !== undefined && BLOCK_TYPES.has(node.type) && node.data?.noSourceLine !== true) {
    mergeProperties(node, sourcePositionProperties(node, line));
  }
}

const FIGURE_ALIGNMENTS = new Set(["left", "center", "right"]);

function isFigureAlignment(value: unknown): value is "left" | "center" | "right" {
  return typeof value === "string" && FIGURE_ALIGNMENTS.has(value);
}

/**
 * A MyST figure or image size: a plain length becomes `data-okf-width` (the page script applies
 * it, since inline styles are blocked); anything else, and an unknown alignment, is dropped.
 */
function normalizeImageSize(node: MystNode): void {
  const image = node as MystNode & { width?: unknown };
  const width = typeof image.width === "string" ? image.width.trim() : undefined;
  delete image.width;
  if (width && OKF_WIDTH.test(width)) {
    mergeProperties(node, { "data-okf-width": width });
  }
  if (node.align !== undefined && !isFigureAlignment(node.align)) {
    delete node.align;
  }
}

/** Normalizes every node of the tree, depth first; a node without a line inherits its parent's. */
export function walk(node: MystNode, diagnostics: RenderDiagnostic[], inheritedLine?: number): void {
  normalizeNode(node, diagnostics, inheritedLine);
  // Directives synthesise their content nodes without positions, so the directive's own
  // line is the only anchor the block children can inherit.
  const childLine = node.position?.start?.line ?? inheritedLine;
  for (const child of node.children ?? []) {
    walk(child, diagnostics, childLine);
  }
}
