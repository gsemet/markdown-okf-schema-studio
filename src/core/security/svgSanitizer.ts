/**
 * The SVG a document writes (an `svg` fence or a raw `<svg>` block) is inlined in the page, so it is
 * rebuilt from an allow-list before it gets there: only the drawing elements and the presentation
 * attributes listed here survive. Nothing that can run script, load a resource or restyle the page
 * does: no `script`, `style`, `foreignObject`, `a`, `image` or `animate` element, no `on…` handler,
 * no `class`, no link that leaves the picture (`use` and `textPath` may point at an `#id` of the
 * same picture) and no `url()` but `url(#id)`. A `style` attribute is read declaration by
 * declaration into presentation attributes (only the presentation properties are kept). Every `id`
 * is renamed with the picture's prefix, and the `url(#id)` and `href="#id"` references with it, so
 * two pictures never share an id with each other or with the page.
 *
 * Colours are written as the theme variables of {@link SVG_THEME_VARIABLES} (`fill="var(--surface)"`):
 * a `var()` of another name with no fallback resolves to the text colour. Pure module: no host API,
 * no DOM, no Node built-ins.
 */

import { parseFragment } from "parse5";

/** A text node of a sanitized SVG tree (hast shape: the HTML writer reads it as is). */
export interface SvgText {
  type: "text";
  value: string;
}

/** An element of a sanitized SVG tree (hast shape: the HTML writer reads it as is). */
export interface SvgElement {
  type: "element";
  tagName: string;
  properties: Record<string, string>;
  children: SvgNode[];
}

export type SvgNode = SvgElement | SvgText;

/** A sanitized picture and what the sanitizer removed from the source (for a diagnostic). */
export interface SanitizedSvg {
  readonly element: SvgElement;
  readonly removed: readonly string[];
}

const ELEMENTS = [
  "svg", "g", "defs", "symbol", "use", "path", "circle", "ellipse", "line", "polygon", "polyline",
  "rect", "text", "tspan", "textPath", "title", "desc", "linearGradient", "radialGradient", "stop",
  "pattern", "clipPath", "mask", "marker",
];
const ELEMENT_BY_LOWERCASE = new Map(ELEMENTS.map((name) => [name.toLowerCase(), name]));
/** Elements whose content is only text: an element inside is dropped. */
const TEXT_ONLY = new Set(["title", "desc"]);

/** The CSS properties of the presentation attributes: a `style` attribute may set only these. */
const PRESENTATION_PROPERTIES = [
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "fill-opacity", "fill-rule", "clip-rule",
  "opacity", "stop-color", "stop-opacity", "clip-path", "mask", "marker-start", "marker-mid",
  "marker-end", "text-anchor", "dominant-baseline", "alignment-baseline", "baseline-shift",
  "font-size", "font-family", "font-weight", "font-style", "letter-spacing", "word-spacing",
  "text-decoration", "visibility", "display", "shape-rendering", "vector-effect", "paint-order",
  "color",
];
const GEOMETRY_ATTRIBUTES = [
  "viewBox", "preserveAspectRatio", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy",
  "r", "rx", "ry", "fx", "fy", "d", "points", "transform", "offset", "gradientUnits",
  "gradientTransform", "spreadMethod", "patternUnits", "patternContentUnits", "patternTransform",
  "markerWidth", "markerHeight", "refX", "refY", "orient", "markerUnits", "clipPathUnits",
  "maskUnits", "maskContentUnits", "dx", "dy", "rotate", "textLength", "lengthAdjust", "xml:space",
];
/** Accessibility attributes: their value is text (escaped by the writer), not a CSS value. */
const TEXT_ATTRIBUTES = new Set(["role", "aria-label", "aria-hidden"]);
/** Accessibility attributes that name ids of the picture: renamed with them, a foreign id is dropped. */
const ID_LIST_ATTRIBUTES = new Set(["aria-labelledby", "aria-describedby"]);
const MAX_TEXT_LENGTH = 1000;
/**
 * The geometry and presentation attributes a sanitized SVG keeps, in their SVG spelling (besides
 * `id`, `href` and the accessibility attributes). Their value is a CSS-like value, checked by
 * {@link isSafeSvgPresentationValue} when it reaches the final HTML sanitizer.
 */
export const SVG_ATTRIBUTE_NAMES: readonly string[] = [...GEOMETRY_ATTRIBUTES, ...PRESENTATION_PROPERTIES];
const ATTRIBUTE_BY_LOWERCASE = new Map(SVG_ATTRIBUTE_NAMES.map((name) => [name.toLowerCase(), name]));
const PRESENTATION = new Set(PRESENTATION_PROPERTIES);

/**
 * The theme vocabulary of a picture: the name an author writes, `var(--surface)`, and the theme
 * token it takes (so it follows Cream, White, Dark and the VS Code theme). Each value is a CSS
 * `var()` chain of `--studio-*` tokens.
 */
// @implements_req SwRS-MDOKFSTUDIO-DIAG-126
export const SVG_THEME_VARIABLES: Readonly<Record<string, string>> = {
  surface: "var(--studio-textCodeBlock-background, var(--studio-editorWidget-background, transparent))",
  background: "var(--studio-textCodeBlock-background, var(--studio-editorWidget-background, transparent))",
  bg: "var(--studio-textCodeBlock-background, var(--studio-editorWidget-background, transparent))",
  border: "var(--studio-panel-border, var(--studio-widget-border, currentColor))",
  text: "var(--studio-editor-foreground, currentColor)",
  foreground: "var(--studio-editor-foreground, currentColor)",
  fg: "var(--studio-editor-foreground, currentColor)",
  muted: "var(--studio-descriptionForeground, currentColor)",
  accent: "var(--studio-textLink-foreground, currentColor)",
  primary: "var(--studio-textLink-foreground, currentColor)",
  red: "var(--studio-charts-red, currentColor)",
  green: "var(--studio-charts-green, currentColor)",
  blue: "var(--studio-charts-blue, currentColor)",
  orange: "var(--studio-charts-orange, currentColor)",
};

/** Declarations an inline picture does not need: dropped without a word. */
const SILENT_ATTRIBUTES = new Set(["xmlns", "xmlns:xlink", "version", "baseprofile"]);
const MAX_SOURCE_LENGTH = 400_000;
const SAFE_ID = /^[A-Za-z_][\w.:-]{0,100}$/u;
const LOCAL_REFERENCE = /^#([A-Za-z_][\w.:-]{0,100})$/u;
const URL_FUNCTION = /url\(\s*(['"]?)([^)'"]*)\1\s*\)/giu;
const VAR_WITHOUT_FALLBACK = /var\(\s*--([\w-]+)\s*\)/giu;
const UNSAFE_VALUE = /javascript:|vbscript:|data:|:\/\/|expression\s*\(|@import|[<\\]|\/\*|-moz-binding|behavior\s*:/iu;
/** The only CSS functions a value may use: colours, the theme `var()`, `url(#id)` and the transform list. */
const ALLOWED_FUNCTIONS = new Set([
  "var", "url", "rgb", "rgba", "hsl", "hsla", "translate", "scale", "rotate", "matrix", "skewx", "skewy", "calc",
]);
const FUNCTION_CALL = /([\w-]*)\s*\(/gu;

interface ParsedAttribute {
  name: string;
  value: string;
  prefix?: string;
}

interface ParsedNode {
  nodeName: string;
  tagName?: string;
  attrs?: ParsedAttribute[];
  childNodes?: ParsedNode[];
  content?: ParsedNode;
  value?: string;
}

interface Run {
  readonly prefix: string;
  readonly removed: Set<string>;
}

/** The ids the picture declares: first pass, so a reference that comes before its target is renamed too. */
function collectIds(node: ParsedNode, ids: Set<string>): void {
  for (const attribute of node.attrs ?? []) {
    if (attribute.name.toLowerCase() === "id" && SAFE_ID.test(attribute.value)) ids.add(attribute.value);
  }
  for (const child of node.childNodes ?? []) collectIds(child, ids);
}

/** Resolves the `var()` of a value: an unknown name without fallback takes the text colour. */
function themedValue(value: string): string {
  return value.replace(VAR_WITHOUT_FALLBACK, (whole, name: string) =>
    Object.hasOwn(SVG_THEME_VARIABLES, name) ? whole : "var(--text)");
}

/**
 * A value of a presentation attribute, or undefined when it is unsafe: `url()` only points at an id
 * of the picture (renamed), and no scheme, comment or markup is allowed.
 */
function safeValue(value: string, ids: ReadonlySet<string>, run: Run): string | undefined {
  if (value.length > 4000 || UNSAFE_VALUE.test(value)) return undefined;
  for (const call of value.matchAll(FUNCTION_CALL)) {
    if (!ALLOWED_FUNCTIONS.has((call[1] ?? "").toLowerCase())) return undefined;
  }
  let safe = true;
  const renamed = value.replace(URL_FUNCTION, (_whole, _quote: string, target: string) => {
    const reference = LOCAL_REFERENCE.exec(target.trim());
    if (!reference) {
      safe = false;
      return "";
    }
    const id = reference[1] ?? "";
    // A reference to an id that is not in this picture is refused: nothing leaves the picture.
    if (!ids.has(id)) safe = false;
    return `url(#${run.prefix}${id})`;
  });
  if (!safe || /url\(/iu.test(renamed.replace(/url\(#[^)]*\)/giu, ""))) return undefined;
  return themedValue(renamed);
}

/** The declarations of a `style` attribute that are presentation properties, in order. */
function styleDeclarations(style: string, run: Run): Array<[string, string]> {
  const declarations: Array<[string, string]> = [];
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    if (PRESENTATION.has(property)) {
      declarations.push([property, declaration.slice(separator + 1).trim().replace(/\s*!important$/iu, "")]);
    } else if (property !== "") {
      run.removed.add(`style: ${property}`);
    }
  }
  return declarations;
}

function sanitizeAttributes(
  element: ParsedNode,
  tagName: string,
  ids: ReadonlySet<string>,
  run: Run,
): Record<string, string> {
  const properties: Record<string, string> = {};
  const styled: Array<[string, string]> = [];
  for (const attribute of element.attrs ?? []) {
    const name = (attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name).toLowerCase();
    const value = attribute.value;
    if (name === "id") {
      if (SAFE_ID.test(value)) properties.id = run.prefix + value;
      else run.removed.add("id");
    } else if (name === "href" || name === "xlink:href") {
      const reference = LOCAL_REFERENCE.exec(value.trim());
      const id = reference?.[1] ?? "";
      if ((tagName === "use" || tagName === "textPath") && reference && ids.has(id)) {
        properties.href = `#${run.prefix}${id}`;
      } else {
        run.removed.add(name);
      }
    } else if (name === "style") {
      styled.push(...styleDeclarations(value, run));
    } else if (TEXT_ATTRIBUTES.has(name)) {
      // An author's label is text: kept as written (the writer escapes it), whatever it holds.
      if (value.length <= MAX_TEXT_LENGTH) properties[name] = value;
      else run.removed.add(name);
    } else if (ID_LIST_ATTRIBUTES.has(name)) {
      const kept = value.split(/\s+/u).filter((id) => ids.has(id)).map((id) => run.prefix + id);
      if (kept.length > 0) properties[name] = kept.join(" ");
      else run.removed.add(name);
    } else if (!SILENT_ATTRIBUTES.has(name)) {
      const canonical = ATTRIBUTE_BY_LOWERCASE.get(name);
      const safe = canonical === undefined ? undefined : safeValue(value, ids, run);
      if (canonical !== undefined && safe !== undefined) properties[canonical] = safe;
      else run.removed.add(name);
    }
  }
  for (const [property, value] of styled) {
    const safe = safeValue(value, ids, run);
    if (safe === undefined) run.removed.add(`style: ${property}`);
    else properties[property] = safe;
  }
  return properties;
}

function textOf(node: ParsedNode): string {
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textOf).join("");
}

function sanitizeNode(node: ParsedNode, ids: ReadonlySet<string>, run: Run): SvgNode[] {
  if (node.nodeName === "#text") return node.value ? [{ type: "text", value: node.value }] : [];
  if (!node.tagName) return [];
  const tagName = ELEMENT_BY_LOWERCASE.get(node.tagName.toLowerCase());
  if (tagName === undefined) {
    run.removed.add(`<${node.tagName}>`);
    return [];
  }
  const properties = sanitizeAttributes(node, tagName, ids, run);
  if ((tagName === "use" || tagName === "textPath") && properties.href === undefined) {
    // Without a target in the picture the element draws nothing.
    run.removed.add(`<${node.tagName}> without a local target`);
    return [];
  }
  const children = TEXT_ONLY.has(tagName)
    ? [{ type: "text" as const, value: textOf(node) }]
    : (node.childNodes ?? []).flatMap((child) => sanitizeNode(child, ids, run));
  return [{ type: "element", tagName, properties, children }];
}

function findSvg(node: ParsedNode): ParsedNode | undefined {
  for (const child of node.childNodes ?? []) {
    if (child.tagName?.toLowerCase() === "svg") return child;
  }
  return undefined;
}

/**
 * Whether a value that reaches the final HTML sanitizer on a presentation attribute is safe: the
 * same rules as {@link safeValue} without the picture's ids (a `url()` may only hold a `#id`, no
 * other function than the allowed ones, no scheme).
 */
// @implements_req SwRS-MDOKFSTUDIO-TRUST-036
export function isSafeSvgPresentationValue(value: string): boolean {
  if (value.length > 4000 || UNSAFE_VALUE.test(value)) return false;
  for (const call of value.matchAll(FUNCTION_CALL)) {
    if (!ALLOWED_FUNCTIONS.has((call[1] ?? "").toLowerCase())) return false;
  }
  for (const call of value.matchAll(URL_FUNCTION)) {
    if (!LOCAL_REFERENCE.test((call[2] ?? "").trim())) return false;
  }
  return !/url\(/iu.test(value.replace(/url\(\s*(['"]?)#[^)'"]*\1\s*\)/giu, ""));
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-125
/**
 * Sanitizes the source of one picture. Returns undefined when the source holds no `<svg>` element.
 * `idPrefix` is put in front of every id of the picture (and of its references): it differs from
 * picture to picture.
 */
export function sanitizeSvg(source: string, idPrefix: string): SanitizedSvg | undefined {
  if (source.length > MAX_SOURCE_LENGTH) return undefined;
  const svg = findSvg(parseFragment(source) as unknown as ParsedNode);
  if (!svg) return undefined;
  const ids = new Set<string>();
  collectIds(svg, ids);
  const run: Run = { prefix: idPrefix, removed: new Set() };
  const [element] = sanitizeNode(svg, ids, run);
  return element?.type === "element" ? { element, removed: [...run.removed] } : undefined;
}
