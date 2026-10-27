import { parse, serialize, type DefaultTreeAdapterTypes } from "parse5";
import { directiveAttributeRule } from "../directives/registry";
import { isSafeOkfColor, SAFE_COLOR_NAME_PATTERN } from "./spanColors";

import {
  relativeResourcePath,
  ResourcePolicy,
  rewriteSrcset,
  SecurityDiagnostic,
} from "./resource-policy";

interface HtmlAttribute {
  name: string;
  value: string;
}

interface HtmlNode {
  nodeName: string;
  tagName?: string;
  attrs?: HtmlAttribute[];
  childNodes?: HtmlNode[];
  value?: string;
}

export interface ResolvedResource {
  path: string;
  uri: string;
}

export interface HtmlRewriteContext {
  outputRoot: string;
  policy: ResourcePolicy;
  nonce: string;
  sourceMapping?: { sourceFile: string; documentId: string };
  resolveResource: (request: string, baseDirectory: string) => ResolvedResource | undefined;
  resolveNavigation: (
    request: string,
    baseDirectory: string,
  ) => { kind: "anchor" | "external" | "deferred" | "blocked"; value?: string; reason?: string } | ResolvedResource;
  processStylesheet?: (stylesheetPath: string) => void;
  /** Ignored: the sanitizer removes every document script, whatever the preview mode. */
  allowExternalScripts?: boolean;
}

export interface HtmlRewriteResult {
  html: string;
  diagnostics: SecurityDiagnostic[];
}

/**
 * Elements the preview keeps. Every other element is removed with its content, so a new or exotic
 * element never reaches the page until it is listed here. `script`, `style`, `meta`, `link` and the
 * active elements have their own rules in {@link rewriteNode}.
 */
const ALLOWED_ELEMENTS = new Set([
  "html", "head", "body", "title", "meta", "script", "style", "main", "article", "aside", "section", "nav",
  "header", "footer", "address", "hgroup", "div", "span", "p", "br", "hr", "wbr", "pre", "code",
  "kbd", "samp", "var", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "q", "cite", "dl", "dt",
  "dd", "ol", "ul", "li", "menu", "a", "abbr", "acronym", "b", "bdi", "bdo", "big", "center", "dfn",
  "em", "font", "i", "mark", "s", "small", "strike", "strong", "sub", "sup", "time", "tt", "u",
  "del", "ins", "details", "summary", "figure", "figcaption", "img", "picture", "source", "video",
  "audio", "track", "table", "caption", "col", "colgroup", "tbody", "td", "tfoot", "th", "thead",
  "tr", "button", "input", "label", "select", "option", "optgroup", "textarea", "fieldset",
  "legend", "progress", "meter", "output", "ruby", "rt", "rp", "map", "area", "canvas",
  "svg", "g", "path", "circle", "ellipse", "line", "polygon", "polyline", "rect", "text", "tspan",
  "defs", "desc", "symbol", "use", "marker", "pattern", "clippath", "mask", "lineargradient",
  "radialgradient", "stop", "image",
  "math", "mi", "mn", "mo", "ms", "mtext", "mrow", "mfrac", "msqrt", "mroot", "msub", "msup",
  "msubsup", "munder", "mover", "munderover", "mtable", "mtr", "mtd", "mspace", "mstyle",
  "semantics", "annotation",
]);
const ALLOWED_ATTRIBUTES = new Set([
  "id", "class", "title", "lang", "dir", "role", "tabindex", "hidden", "translate", "name", "href",
  "xlink:href", "src", "srcset", "sizes", "poster", "data", "alt", "width", "height", "colspan",
  "rowspan", "headers", "scope", "span", "align", "valign", "start", "reversed", "type", "value",
  "open", "disabled", "checked", "readonly", "required", "placeholder", "for", "min", "max",
  "low", "high", "optimum", "rel", "target", "download", "hreflang", "cite", "datetime",
  "controls", "loop", "muted", "preload", "autoplay", "loading", "decoding", "media", "usemap",
  "shape", "coords", "charset", "content", "color", "face", "size", "border", "cellpadding",
  "cellspacing", "async", "defer", "crossorigin", "integrity", "referrerpolicy",
  "xmlns", "xmlns:xlink", "xml:space", "viewbox", "preserveaspectratio", "version",
  "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "points", "transform",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "stroke-opacity", "fill-opacity", "opacity", "offset", "stop-color", "stop-opacity", "gradientunits",
  "gradienttransform", "markerwidth", "markerheight", "refx", "refy", "orient", "markerunits",
  "text-anchor", "dominant-baseline", "font-size", "font-family", "font-weight", "dx", "dy",
  "clip-path", "mask", "patternunits", "fill-rule", "clip-rule", "display", "focusable",
  "mathvariant", "mathsize", "mathcolor", "mathbackground", "displaystyle",
  "scriptlevel", "linethickness", "columnalign", "rowalign", "encoding", "close",
  "separators", "fence", "stretchy", "lspace", "rspace", "accent", "accentunder", "movablelimits",
]);
const ALLOWED_ATTRIBUTE_PREFIXES = ["aria-", "data-sphinx-", "data-okf-", "data-myst-", "data-plantuml-", "data-footnote"];
const ALLOWED_DATA_ATTRIBUTES = new Set(["data-line", "data-end-line", "data-line-number", "data-footnotes"]);

function isAllowedAttribute(name: string): boolean {
  return ALLOWED_ATTRIBUTES.has(name)
    || ALLOWED_DATA_ATTRIBUTES.has(name)
    || ALLOWED_ATTRIBUTE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

const RESOURCE_ATTRIBUTES = new Set(["src", "poster", "data"]);
const REMOVED_ELEMENTS = new Set(["embed", "foreignobject", "form", "iframe", "object"]);
const TABLE_STYLE_ELEMENTS = new Set([
  "caption", "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr",
]);
const SAFE_GRADIENT_COLOR = String.raw`(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|${SAFE_COLOR_NAME_PATTERN})`;
const SAFE_GRADIENT_STOP = `${SAFE_GRADIENT_COLOR}(?:\\s+(?:\\d+(?:\\.\\d+)?|\\.\\d+)%?)?`;
const SAFE_LINEAR_GRADIENT = new RegExp(
  `^(?:-webkit-)?linear-gradient\\(\\s*(?:(?:-?\\d+(?:\\.\\d+)?(?:deg|grad|rad|turn)|to (?:top|bottom|left|right)(?: (?:top|bottom|left|right))?)\\s*,\\s*)?${SAFE_GRADIENT_STOP}(?:\\s*,\\s*${SAFE_GRADIENT_STOP})+\\s*\\)$`,
  "iu",
);

/** Block elements that get `dir="auto"` so right-to-left text aligns to the right like GitHub. */
const AUTO_DIRECTION_ELEMENTS = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "td", "th",
]);
/** The only values the `dir` attribute may keep. */
const SAFE_DIR_VALUES = new Set(["ltr", "rtl", "auto"]);

const NATURALLY_FOCUSABLE_ELEMENTS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
]);

// @implements_req SwRS-MDOKFSTUDIO-GFM-031
export function sanitizeTableStyle(tagName: string, style: string): string | undefined {
  if (!TABLE_STYLE_ELEMENTS.has(tagName.toLowerCase())) {
    return undefined;
  }

  const declarations = new Map<string, string>();
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim().toLowerCase();
    const safeValue = safeTableStyleValue(property, value);
    if (safeValue) {
      declarations.set(property, safeValue);
    }
  }

  return declarations.size > 0
    ? Array.from(declarations, ([property, value]) => `${property}: ${value}`).join("; ")
    : undefined;
}

function safeTableStyleValue(property: string, value: string): string | undefined {
  if (property === "background" && SAFE_LINEAR_GRADIENT.test(value)) {
    return value;
  }
  if (property === "width" && /^(?:\d{1,2}(?:\.\d{1,2})?|100)%$/u.test(value)) {
    return value;
  }
  if (property === "-webkit-background-clip" && value === "text") {
    return value;
  }
  if (
    ["background-color", "color", "-webkit-text-fill-color"].includes(property)
    && isSafeOkfColor(value)
  ) {
    return value;
  }
  return undefined;
}

function attr(node: HtmlNode, name: string): HtmlAttribute | undefined {
  return node.attrs?.find((candidate) => candidate.name === name);
}

function setAttr(node: HtmlNode, name: string, value: string): void {
  const existing = attr(node, name);
  if (existing) {
    existing.value = value;
    return;
  }
  node.attrs ??= [];
  node.attrs.push({ name, value });
}

function removeAttr(node: HtmlNode, name: string): void {
  if (node.attrs) {
    node.attrs = node.attrs.filter((candidate) => candidate.name !== name);
  }
}

/**
 * Marks a node for removal. The walk drops all marked children of a parent in one pass when it
 * leaves the parent, so removing n siblings costs O(n) and not O(n^2).
 */
function removeNode(removed: Set<HtmlNode>, child: HtmlNode): void {
  removed.add(child);
}

/** Deepest element nesting the preview keeps; deeper content is cut with a visible marker. */
export const MAX_SANITIZER_DEPTH = 256;
const DEPTH_MARKER_TEXT = "[Content cut: nesting is too deep for the preview.]";

interface WalkFrame {
  node: HtmlNode;
  children: HtmlNode[];
  index: number;
  removed: Set<HtmlNode>;
}

function addDiagnostic(
  diagnostics: SecurityDiagnostic[],
  code: string,
  message: string,
  value?: string,
): void {
  diagnostics.push({ code, message, value });
}

/**
 * Rewrites the descendants of `root` depth first with an explicit stack, so the nesting depth of
 * the input never reaches the call stack. Content below {@link MAX_SANITIZER_DEPTH} is replaced
 * by a visible marker.
 */
function walkChildren(
  root: HtmlNode,
  context: HtmlRewriteContext,
  diagnostics: SecurityDiagnostic[],
  tableStyles: Map<string, string>,
): void {
  const stack: WalkFrame[] = [{ node: root, children: [...(root.childNodes ?? [])], index: 0, removed: new Set() }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.children.length) {
      if (frame.removed.size > 0 && frame.node.childNodes) {
        frame.node.childNodes = frame.node.childNodes.filter((candidate) => !frame.removed.has(candidate));
      }
      stack.pop();
      continue;
    }
    const child = frame.children[frame.index++];
    if (!rewriteNode(child, frame.removed, context, diagnostics, tableStyles)) {
      continue;
    }
    if (stack.length >= MAX_SANITIZER_DEPTH) {
      if (child.childNodes && child.childNodes.length > 0) {
        child.childNodes = [{ nodeName: "#text", value: DEPTH_MARKER_TEXT }];
        addDiagnostic(diagnostics, "truncated-depth", "Cut content nested too deeply for the preview.");
      }
      continue;
    }
    stack.push({ node: child, children: [...(child.childNodes ?? [])], index: 0, removed: new Set() });
  }
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-008
// @implements_req SwRS-MDOKFSTUDIO-CORE-041
// @implements_req SwRS-MDOKFSTUDIO-GFM-016
// @implements_req SwRS-MDOKFSTUDIO-GFM-034
// @implements_req SwRS-MDOKFSTUDIO-TRUST-011
// @implements_req SwRS-MDOKFSTUDIO-TRUST-025
// @implements_req SwRS-MDOKFSTUDIO-TRUST-036
// @implements_req SwRS-MDOKFSTUDIO-TRUST-042
function rewriteNode(
  node: HtmlNode,
  removed: Set<HtmlNode>,
  context: HtmlRewriteContext,
  diagnostics: SecurityDiagnostic[],
  tableStyles: Map<string, string>,
): boolean {
  const tagName = (node.tagName ?? node.nodeName).toLowerCase();
  if (REMOVED_ELEMENTS.has(tagName)) {
    removeNode(removed, node);
    addDiagnostic(diagnostics, "blocked-active-element", `Removed <${tagName}> from preview output.`);
    return false;
  }

  if (tagName === "link") {
    removeNode(removed, node);
    const isStylesheet = attr(node, "rel")?.value.toLowerCase().split(/\s+/u).includes("stylesheet");
    const stylesheet = attr(node, "href");
    if (!isStylesheet || !stylesheet) {
      addDiagnostic(diagnostics, "blocked-element", "Removed <link> from preview output.");
      return false;
    }
    const resolved = context.resolveResource(stylesheet.value, context.outputRoot);
    if (resolved) {
      context.processStylesheet?.(resolved.path);
    } else {
      addDiagnostic(diagnostics, "blocked-stylesheet", "Removed a stylesheet outside staged output.", stylesheet.value);
    }
    return false;
  }

  if (!tagName.startsWith("#") && !ALLOWED_ELEMENTS.has(tagName)) {
    removeNode(removed, node);
    addDiagnostic(diagnostics, "blocked-element", `Removed <${tagName}> from preview output.`);
    return false;
  }

  if (tagName === "script") {
    // No document script reaches the preview. The host adds its own scripts after sanitizing.
    removeNode(removed, node);
    if (attr(node, "src")) {
      addDiagnostic(diagnostics, "blocked-script", "Removed script from preview output.");
    } else {
      addDiagnostic(diagnostics, "blocked-inline-script", "Removed inline script from preview output.");
    }
    return false;
  }

  if (tagName === "style") {
    removeNode(removed, node);
    addDiagnostic(diagnostics, "blocked-inline-style", "Removed inline style from preview output.");
    return false;
  }

  if (tagName === "img" && !attr(node, "alt")) {
    setAttr(node, "alt", "");
  }

  const refresh = attr(node, "http-equiv");
  if (tagName === "meta" && refresh?.value.trim().toLowerCase() === "refresh") {
    removeNode(removed, node);
    addDiagnostic(diagnostics, "blocked-refresh", "Removed automatic navigation from preview output.");
    return false;
  }

  for (const attribute of [...(node.attrs ?? [])]) {
    const name = attribute.name.toLowerCase();
    if (name === "data-myst-table-style") {
      removeAttr(node, attribute.name);
      const safeStyle = sanitizeTableStyle(tagName, attribute.value);
      if (safeStyle) {
        const className = `myst-inline-table-style-${tableStyles.size + 1}`;
        const classNames = (attr(node, "class")?.value ?? "").split(/\s+/u).filter(Boolean);
        if (!classNames.includes(className)) {
          classNames.push(className);
        }
        setAttr(node, "class", classNames.join(" "));
        tableStyles.set(className, safeStyle);
      } else {
        addDiagnostic(
          diagnostics,
          "blocked-inline-table-style",
          "Removed an unsupported inline table style.",
        );
      }
      continue;
    }
    if (name === "dir") {
      const direction = attribute.value.trim().toLowerCase();
      if (SAFE_DIR_VALUES.has(direction)) {
        attribute.value = direction;
      } else {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, "blocked-dir", "Removed an unsupported dir value.", attribute.value);
      }
      continue;
    }
    const directiveRule = directiveAttributeRule(name);
    if (directiveRule) {
      if (!directiveRule.valid(attribute.value, tagName)) {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, directiveRule.diagnostic.code, directiveRule.diagnostic.message);
      }
      continue;
    }
    if (name === "data-okf-color" || name === "data-okf-background") {
      if (tagName !== "span" || !isSafeOkfColor(attribute.value)) {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, "removed-unsafe-style", "Removed unsafe style attribute.");
      }
      continue;
    }
    if (name === "style" && tagName === "span") {
      removeAttr(node, attribute.name);
      let dropped = false;
      const kept = new Map<string, string>();
      for (const declaration of attribute.value.split(";")) {
        if (declaration.trim() === "") continue;
        const separator = declaration.indexOf(":");
        const property = separator < 0 ? "" : declaration.slice(0, separator).trim().toLowerCase();
        const value = separator < 0 ? "" : declaration.slice(separator + 1).trim();
        if ((property === "color" || property === "background-color") && isSafeOkfColor(value)) {
          kept.set(property, value);
        } else {
          dropped = true;
        }
      }
      if (kept.has("color")) setAttr(node, "data-okf-color", kept.get("color") ?? "");
      if (kept.has("background-color")) setAttr(node, "data-okf-background", kept.get("background-color") ?? "");
      if (dropped || kept.size === 0) {
        addDiagnostic(diagnostics, "removed-unsafe-style", "Removed unsafe style attribute.");
      }
      continue;
    }
    if (name.startsWith("on") || name === "srcdoc" || name === "style") {
      removeAttr(node, attribute.name);
      addDiagnostic(diagnostics, "blocked-event-attribute", `Removed unsafe ${attribute.name} attribute.`);
      continue;
    }

    if (!isAllowedAttribute(name)) {
      removeAttr(node, attribute.name);
      addDiagnostic(diagnostics, "blocked-attribute", `Removed unsupported ${attribute.name} attribute.`);
      continue;
    }

    if (name === "srcset") {
      const rewritten = rewriteSrcset(attribute.value, (request) => {
        const resolved = context.resolveResource(request, context.outputRoot);
        return resolved?.uri;
      });
      if (rewritten) {
        attribute.value = rewritten;
      } else {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, "blocked-srcset", "Removed a srcset with no safe local candidates.");
      }
      continue;
    }

    if (RESOURCE_ATTRIBUTES.has(name)) {
      const resolved = context.resolveResource(attribute.value, context.outputRoot);
      if (resolved) {
        attribute.value = resolved.uri;
      } else {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, "blocked-resource", "Removed a resource outside staged output.", attribute.value);
      }
      continue;
    }

    if (name === "href" || name === "xlink:href") {
      const originalRequest = attribute.value;
      const link = context.resolveNavigation(originalRequest, context.outputRoot);
      if ("uri" in link) {
        attribute.value = name === "href" && tagName === "a" ? "#" : link.uri;
        if (name === "href" && tagName === "a") {
          setAttr(node, "data-sphinx-preview-navigation", originalRequest);
        }
      } else if (link.kind === "anchor" || link.kind === "external") {
        attribute.value = link.value ?? "#";
        if (name === "href") {
          setAttr(node, "data-sphinx-preview-navigation", originalRequest);
        }
      } else if (link.kind === "deferred") {
        attribute.value = "#";
        if (name === "href") {
          setAttr(node, "data-sphinx-preview-navigation", originalRequest);
        }
      } else {
        removeAttr(node, attribute.name);
        if (name === "href") {
          setAttr(node, "data-sphinx-preview-navigation", originalRequest);
          // An unsupported link has no click action; its tooltip names the reason.
          if (link.reason && !attr(node, "title")) setAttr(node, "title", link.reason);
        }
        addDiagnostic(diagnostics, "blocked-navigation", "Removed navigation outside the preview policy.", originalRequest);
      }
    }
  }

  if (AUTO_DIRECTION_ELEMENTS.has(tagName) && !attr(node, "dir")) {
    setAttr(node, "dir", "auto");
  }

  if (
    attr(node, "data-sphinx-source-file")
    && attr(node, "data-sphinx-source-line")
    && attr(node, "data-sphinx-preview-block")
    && !NATURALLY_FOCUSABLE_ELEMENTS.has(tagName)
  ) {
    setAttr(node, "tabindex", "0");
  }

  return true;
}

// @implements_req SwRS-MDOKFSTUDIO-LIFE-119
function injectSourceMappings(
  node: HtmlNode,
  sourceMapping: { sourceFile: string; documentId: string },
): void {
  let blockNumber = 0;
  const visit = (current: HtmlNode): void => {
    const line = attr(current, "data-line")?.value;
    if (line && /^[1-9]\d*$/u.test(line) && Number.isSafeInteger(Number(line))) {
      blockNumber += 1;
      setAttr(current, "data-sphinx-source-file", sourceMapping.sourceFile);
      setAttr(current, "data-sphinx-source-line", line);
      const endLine = attr(current, "data-end-line")?.value;
      setAttr(
        current,
        "data-sphinx-source-end-line",
        endLine && /^[1-9]\d*$/u.test(endLine) && Number(endLine) >= Number(line) ? endLine : line,
      );
      setAttr(current, "data-sphinx-preview-document", sourceMapping.documentId);
      setAttr(current, "data-sphinx-preview-block", `source-block-${blockNumber}`);
      const tagName = (current.tagName ?? current.nodeName).toLowerCase();
      if (!NATURALLY_FOCUSABLE_ELEMENTS.has(tagName) && !attr(current, "tabindex")) {
        setAttr(current, "tabindex", "0");
      }
    }
    for (const child of current.childNodes ?? []) {
      visit(child);
    }
  };
  visit(node);
}

export function rewriteSphinxHtml(html: string, context: HtmlRewriteContext): HtmlRewriteResult {
  const document = parse(html) as unknown as HtmlNode;
  const diagnostics: SecurityDiagnostic[] = [];
  const tableStyles = new Map<string, string>();
  walkChildren(document, context, diagnostics, tableStyles);
  if (context.sourceMapping) {
    injectSourceMappings(document, context.sourceMapping);
  }
  const body = findFirst(document, "body");
  if (body) {
    let main = findFirst(body, "main");
    if (!main) {
      main = {
        nodeName: "main",
        tagName: "main",
        attrs: [],
        childNodes: body.childNodes ?? [],
      };
      body.childNodes = [main];
    }
    setAttr(main, "id", "sphinx-myst-preview-content");
    setAttr(main, "tabindex", "-1");
    setAttr(main, "aria-label", "Markdown OKF-Schema Studio preview content");
  }
  appendTableStylesheet(document, tableStyles, context.nonce);
  return {
    html: serialize(document as unknown as DefaultTreeAdapterTypes.Document),
    diagnostics,
  };
}

const HEAD_OPENING = /<head(?:\s[^>]*)?>/iu;
const HEAD_CLOSING = /<\/head\s*>/giu;
const CSP_META = /<meta\s[^>]*?\bhttp-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/giu;

function escapeAttributeValue(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/\u00a0/gu, "&nbsp;");
}

const SERIALIZED_PREFIX =
  /^(?:<!DOCTYPE[^>]*>)?(?:<!--(?:(?!-->)[\s\S])*-->)*<html(?:\s+[^\s"'>/=]+(?:="[^"]*")?)*>$/iu;

// @implements_req SwRS-MDOKFSTUDIO-TRUST-012
/**
 * Puts the policy as the first element of `<head>` and drops any policy meta the head already has.
 * A string splice on the head of a page the sanitizer wrote (one parse of the page is enough); a
 * document without an explicit head goes through the tree instead.
 */
export function injectContentSecurityPolicy(html: string, contentSecurityPolicy: string): string {
  const opening = HEAD_OPENING.exec(html);
  // The splice is safe only when everything before the head is the serializer's own prefix; a head-like
  // text inside an attribute value of the root element would otherwise swallow the policy.
  if (!opening || !SERIALIZED_PREFIX.test(html.slice(0, opening.index))) {
    return injectContentSecurityPolicyInTree(html, contentSecurityPolicy);
  }
  const headStart = opening.index + opening[0].length;
  HEAD_CLOSING.lastIndex = headStart;
  const headEnd = HEAD_CLOSING.exec(html)?.index ?? -1;
  const headContent = headEnd === -1 ? html.slice(headStart) : html.slice(headStart, headEnd);
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttributeValue(contentSecurityPolicy)}">`;
  return `${html.slice(0, headStart)}${meta}${headContent.replace(CSP_META, "")}${headEnd === -1 ? "" : html.slice(headEnd)}`;
}

function injectContentSecurityPolicyInTree(html: string, contentSecurityPolicy: string): string {
  const document = parse(html) as unknown as HtmlNode;
  const head = findFirst(document, "head");
  if (!head) {
    return html;
  }
  head.childNodes = (head.childNodes ?? []).filter((node) => {
    const tagName = (node.tagName ?? node.nodeName).toLowerCase();
    return !(tagName === "meta" && attr(node, "http-equiv")?.value.toLowerCase() === "content-security-policy");
  });
  head.childNodes.unshift({
    nodeName: "meta",
    tagName: "meta",
    attrs: [
      { name: "http-equiv", value: "Content-Security-Policy" },
      { name: "content", value: contentSecurityPolicy },
    ],
    childNodes: [],
  });
  return serialize(document as unknown as DefaultTreeAdapterTypes.Document);
}

function findFirst(node: HtmlNode, tagName: string): HtmlNode | undefined {
  if ((node.tagName ?? node.nodeName).toLowerCase() === tagName) {
    return node;
  }
  for (const child of node.childNodes ?? []) {
    const found = findFirst(child, tagName);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function appendTableStylesheet(
  document: HtmlNode,
  tableStyles: ReadonlyMap<string, string>,
  nonce: string,
): void {
  if (tableStyles.size === 0) {
    return;
  }
  const head = findFirst(document, "head");
  if (!head) {
    return;
  }
  const css = Array.from(tableStyles, ([className, style]) => `.${className} { ${style}; }`).join("\n");
  head.childNodes ??= [];
  head.childNodes.push({
    nodeName: "style",
    tagName: "style",
    attrs: [
      { name: "nonce", value: nonce },
      { name: "data-sphinx-preview-table-styles", value: "" },
    ],
    childNodes: [{ nodeName: "#text", value: css }],
  });
}

export function sanitizeCss(
  css: string,
  resolveResource: (request: string) => string | undefined,
  onBlocked?: (kind: "import" | "url", request: string) => void,
): string {
  let sanitized = css.replace(
    /@import\b[^\n;{}]*(?:;|(?=\n|$))/giu,
    (whole) => {
      const match = whole.match(
        /@import\b\s*(?:url\(\s*)?(?:"([^"]*)"|'([^']*)'|([^\s;)]+))\s*\)?/iu,
      );
      const request = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
      const safe = request.startsWith("#") ? request : resolveResource(request);
      if (!safe && request) {
        onBlocked?.("import", request);
      }
      return safe ? `@import url("${safe}");` : "/* blocked @import */";
    },
  );
  sanitized = sanitized.replace(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/giu,
    (whole, doubleQuoted: string, singleQuoted: string, bare: string) => {
      const request = (doubleQuoted ?? singleQuoted ?? bare ?? "").trim();
      const safe = request.startsWith("#") ? request : resolveResource(request);
      if (!safe && request && !request.startsWith("#")) {
        onBlocked?.("url", request);
      }
      return `url("${safe ?? "about:blank"}")`;
    },
  );
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/giu, "none");
  sanitized = sanitized.replace(/-moz-binding\s*:[^;]+;?/giu, "");
  return sanitized;
}

export function stylesheetRelativePath(stylesheetPath: string, resourcePath: string): string {
  return relativeResourcePath(stylesheetPath, resourcePath);
}
