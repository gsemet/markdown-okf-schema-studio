import { parse, serialize, type DefaultTreeAdapterTypes } from "parse5";
import { isSafeOkfColor } from "../webview/spanColors";

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
  ) => { kind: "anchor" | "external" | "deferred" | "blocked"; value?: string } | ResolvedResource;
  processStylesheet?: (stylesheetPath: string) => void;
  allowExternalScripts?: boolean;
}

export interface HtmlRewriteResult {
  html: string;
  diagnostics: SecurityDiagnostic[];
}

const RESOURCE_ATTRIBUTES = new Set(["src", "poster", "data"]);
const REMOVED_ELEMENTS = new Set(["embed", "foreignobject", "form", "iframe", "object"]);
const TABLE_STYLE_ELEMENTS = new Set([
  "caption", "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr",
]);
const SAFE_GRADIENT_COLOR = String.raw`(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|[a-z]{1,32})`;
const SAFE_GRADIENT_STOP = `${SAFE_GRADIENT_COLOR}(?:\\s+(?:\\d+(?:\\.\\d+)?|\\.\\d+)%?)?`;
const SAFE_LINEAR_GRADIENT = new RegExp(
  `^(?:-webkit-)?linear-gradient\\(\\s*(?:(?:-?\\d+(?:\\.\\d+)?(?:deg|grad|rad|turn)|to (?:top|bottom|left|right)(?: (?:top|bottom|left|right))?)\\s*,\\s*)?${SAFE_GRADIENT_STOP}(?:\\s*,\\s*${SAFE_GRADIENT_STOP})+\\s*\\)$`,
  "iu",
);
const SAFE_HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/iu;
const SAFE_FUNCTIONAL_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/-]+\)$/iu;

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
  if (property === "-webkit-background-clip" && value === "text") {
    return value;
  }
  if (
    ["background-color", "color", "-webkit-text-fill-color"].includes(property)
    && (SAFE_HEX_COLOR.test(value) || SAFE_FUNCTIONAL_COLOR.test(value) || /^[a-z]{1,32}$/u.test(value))
  ) {
    return value;
  }
  return undefined;
}

/** The only value the page script applies as a width: a number with an optional unit. */
const SAFE_OKF_WIDTH = /^\d+(?:\.\d+)?(?:px|%|em|rem)?$/u;

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

function removeNode(parent: HtmlNode, child: HtmlNode): void {
  if (parent.childNodes) {
    parent.childNodes = parent.childNodes.filter((candidate) => candidate !== child);
  }
}

function addDiagnostic(
  diagnostics: SecurityDiagnostic[],
  code: string,
  message: string,
  value?: string,
): void {
  diagnostics.push({ code, message, value });
}

function walkChildren(
  node: HtmlNode,
  context: HtmlRewriteContext,
  diagnostics: SecurityDiagnostic[],
  tableStyles: Map<string, string>,
): void {
  for (const child of [...(node.childNodes ?? [])]) {
    rewriteNode(child, node, context, diagnostics, tableStyles);
  }
}

function rewriteNode(
  node: HtmlNode,
  parent: HtmlNode,
  context: HtmlRewriteContext,
  diagnostics: SecurityDiagnostic[],
  tableStyles: Map<string, string>,
): void {
  const tagName = (node.tagName ?? node.nodeName).toLowerCase();
  if (REMOVED_ELEMENTS.has(tagName)) {
    removeNode(parent, node);
    addDiagnostic(diagnostics, "blocked-active-element", `Removed <${tagName}> from preview output.`);
    return;
  }

  if (tagName === "script") {
    if (context.allowExternalScripts === false) {
      removeNode(parent, node);
      addDiagnostic(diagnostics, "blocked-script", "Removed script from reduced preview output.");
      return;
    }
    const source = attr(node, "src");
    if (!source) {
      removeNode(parent, node);
      addDiagnostic(diagnostics, "blocked-inline-script", "Removed inline script from preview output.");
      return;
    }
    const resolved = context.resolveResource(source.value, context.outputRoot);
    if (!resolved) {
      removeNode(parent, node);
      addDiagnostic(diagnostics, "blocked-script-resource", "Removed a script outside staged output.", source.value);
      return;
    }
    setAttr(node, "src", resolved.uri);
    setAttr(node, "nonce", context.nonce);
    walkChildren(node, context, diagnostics, tableStyles);
    return;
  }

  if (tagName === "style") {
    removeNode(parent, node);
    addDiagnostic(diagnostics, "blocked-inline-style", "Removed inline style from preview output.");
    return;
  }

  if (tagName === "img" && !attr(node, "alt")) {
    setAttr(node, "alt", "");
  }

  const refresh = attr(node, "http-equiv");
  if (tagName === "meta" && refresh?.value.trim().toLowerCase() === "refresh") {
    removeNode(parent, node);
    addDiagnostic(diagnostics, "blocked-refresh", "Removed automatic navigation from preview output.");
    return;
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
    if (name === "data-okf-width") {
      if (!SAFE_OKF_WIDTH.test(attribute.value.trim())) {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, "blocked-okf-width", "Removed an unsupported figure width.");
      }
      continue;
    }
    if (name === "data-okf-color" || name === "data-okf-background") {
      if (tagName !== "span" || !isSafeOkfColor(attribute.value)) {
        removeAttr(node, attribute.name);
        addDiagnostic(diagnostics, "blocked-inline-style", "Removed inline style from preview output.");
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
        addDiagnostic(diagnostics, "blocked-event-attribute", `Removed unsafe ${attribute.name} attribute.`);
      }
      continue;
    }
    if (name.startsWith("on") || name === "srcdoc" || name === "style") {
      removeAttr(node, attribute.name);
      addDiagnostic(diagnostics, "blocked-event-attribute", `Removed unsafe ${attribute.name} attribute.`);
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

    const isStylesheetHref =
      tagName === "link" &&
      name === "href" &&
      attr(node, "rel")?.value.toLowerCase().split(/\s+/u).includes("stylesheet");
    if ((name === "href" || name === "xlink:href") && !isStylesheetHref) {
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

  if (tagName === "link" && attr(node, "rel")?.value.toLowerCase().split(/\s+/u).includes("stylesheet")) {
    const stylesheet = attr(node, "href");
    if (stylesheet) {
      const resolved = context.resolveResource(stylesheet.value, context.outputRoot);
      if (resolved) {
        stylesheet.value = resolved.uri;
        context.processStylesheet?.(resolved.path);
      } else {
        removeNode(parent, node);
        addDiagnostic(diagnostics, "blocked-stylesheet", "Removed a stylesheet outside staged output.", stylesheet.value);
        return;
      }
    }
  }

  walkChildren(node, context, diagnostics, tableStyles);
}

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

export function injectContentSecurityPolicy(html: string, contentSecurityPolicy: string): string {
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
