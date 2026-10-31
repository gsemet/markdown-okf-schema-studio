/**
 * Inline tree passes of the MyST renderer: `(label)=` anchors and their ids, wiki links, bare URLs
 * and task-list checkboxes.
 */

import {
  type CheckboxMarker,
  hasCheckboxPlaceholder,
  restoreCheckboxPlaceholders,
  splitCheckboxPlaceholders,
} from "./checkboxMarkers";
import { LABEL_NAME } from "../mapping/labelRename";
import { mergeProperties, type MystNode, setHast } from "./mystNode";

// `(name)=` labels. MyST drops the target and gives its id to the next heading or figure; the
// preview also shows a small anchor icon there, which is the target for every other block.
const NATIVE_TARGET_TYPES = new Set(["heading", "container", "math"]);
const ANCHOR_INLINE_HOSTS = new Set(["paragraph", "heading"]);

// No `data-line`: the sanitizer would make the span a focusable mapped block of its own.
// `data-okf-label-line` is the source line of `(name)=` for the rename field: not a mapping attribute.
function anchorProperties(label: string, line: number | undefined): Record<string, unknown> {
  return {
    class: "okf-anchor",
    "data-okf-anchor-id": label,
    "data-okf-label": label,
    ...(line === undefined ? {} : { "data-okf-label-line": String(line) }),
    title: `Anchor: ${label}`,
    role: "img",
    "aria-label": `Anchor: ${label}`,
  };
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-019
// @implements_req SwRS-MDOKFSTUDIO-MYST-036
/**
 * Adds the anchor icon for each `(name)=` target: the first child of the following paragraph or
 * heading, else a zero-height row of its own before the block (or alone at the end). Returns the
 * labels, for `resolveAnchorIds`. A `{ref}` to a label whose block MyST cannot resolve (any block
 * but a heading, figure, table or equation) becomes a link to `#name`.
 */
export function normalizeAnchors(root: MystNode): ReadonlySet<string> {
  const plain = new Set<string>();
  const labels = new Set<string>();
  const headingText = new Map<string, string>();
  const textOf = (node: MystNode): string =>
    node.value ?? (node.children ?? []).map(textOf).join("");
  const visit = (node: MystNode): void => {
    const children = node.children;
    if (!children) return;
    for (let index = 0; index < children.length; index += 1) {
      const target = children[index];
      if (target.type === "mystTarget" && target.label && LABEL_NAME.test(target.label)) {
        let next = index + 1;
        while (children[next]?.type === "mystTarget") next += 1;
        const following = children[next];
        const properties = anchorProperties(target.label, target.position?.start?.line);
        labels.add(target.label);
        if (!following || !NATIVE_TARGET_TYPES.has(following.type)) plain.add(target.label);
        if (following?.type === "heading") headingText.set(target.label, textOf(following));
        if (following && ANCHOR_INLINE_HOSTS.has(following.type)) {
          const anchor: MystNode = { type: "okfAnchor" };
          setHast(anchor, "span", properties, []);
          following.children = [anchor, ...(following.children ?? [])];
        } else {
          const row: MystNode = { type: "okfAnchorRow", children: [] };
          setHast(row, "div", { class: "okf-anchor-row" }, [
            { type: "element", tagName: "span", properties, children: [] },
          ]);
          children.splice(index, 0, row);
          index += 1;
        }
      }
    }
    children.forEach(visit);
  };
  visit(root);
  const linkRefs = (node: MystNode): void => {
    for (const child of node.children ?? []) {
      const reference = child.type === "mystRole" && child.name === "ref" ? child.children?.[0] : undefined;
      if (reference?.type === "crossReference" && reference.identifier && plain.has(reference.identifier)) {
        child.type = "link";
        child.url = `#${reference.identifier}`;
        child.children = reference.children?.length
          ? reference.children
          : [{ type: "text", value: reference.identifier }];
        delete child.name;
        delete child.value;
      } else {
        // MyST copies the heading's content into a bare `{ref}`; that must not include the icon.
        if (reference?.type === "crossReference" && !reference.children?.length
          && reference.identifier && headingText.has(reference.identifier)) {
          reference.children = [{ type: "text", value: headingText.get(reference.identifier) }];
        }
        linkRefs(child);
      }
    }
  };
  linkRefs(root);
  return labels;
}

/** Turns each anchor's id placeholder into `id`, unless a heading or figure already carries it. */
export function resolveAnchorIds(html: string, labels: ReadonlySet<string>): string {
  if (!html.includes("data-okf-anchor-id=")) return html;
  return html.replace(/ data-okf-anchor-id="([^"]*)"/gu, (_match, label: string) =>
    labels.has(label) && html.includes(` id="${label}"`) ? "" : ` id="${label}"`);
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-010
/**
 * Turns `[[target]]` and `[[target|text]]` in text into links (not in code, math, links or HTML).
 */
export function expandWikiLinks(node: MystNode): void {
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

// @implements_req SwRS-MDOKFSTUDIO-GFM-001
/**
 * Links bare `http(s)://` and `www.` URLs in text, except inside links, references, code, math,
 * HTML and roles.
 */
export function autolinkBareUrls(node: MystNode): void {
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

// @implements_req SwRS-MDOKFSTUDIO-GFM-016
/**
 * Turns marker placeholders in prose into checkbox inputs and restores the literal marker
 * everywhere else (code, math, raw HTML, link text, URLs, directive arguments and options).
 */
export function convertCheckboxPlaceholders(
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
      // A radio marker still here is not part of a radio group: it stays literal text.
      return splitCheckboxPlaceholders(child.value, markers).map((segment) => "marker" in segment
        ? markers[segment.marker].kind === "radio"
          ? { ...child, value: markers[segment.marker].text }
          : checkboxNode(markers[segment.marker])
        : { ...child, value: segment.text });
    }
    convertCheckboxPlaceholders(child, markers, childrenInert);
    return [child];
  });
  markTaskList(node);
}

const DOLLAR_PLACEHOLDER = "\uE002";
const DOLLAR_WHITESPACE = /\s/u;

function isEscapedDollar(source: string, index: number): boolean {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function isDollarDigit(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "" && !Number.isNaN(Number(value));
}

function nextDollar(source: string, start: number): number {
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "$" && !isEscapedDollar(source, index)) return index;
  }
  return -1;
}

function nextDoubleDollar(source: string, start: number): number {
  for (let index = start; index < source.length - 1; index += 1) {
    if (source[index] === "$" && source[index + 1] === "$" && !isEscapedDollar(source, index)) {
      return index;
    }
  }
  return -1;
}

function closingFence(source: string, index: number): number | undefined {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  if (!/^ {0,3}$/u.test(source.slice(lineStart, index))) return undefined;
  const marker = source[index];
  if (marker !== "`" && marker !== "~") return undefined;
  let markerEnd = index;
  while (source[markerEnd] === marker) markerEnd += 1;
  const markerLength = markerEnd - index;
  if (markerLength < 3) return undefined;
  const openingLineEnd = source.indexOf("\n", markerEnd);
  if (openingLineEnd < 0) return source.length;
  for (let lineStart = openingLineEnd + 1; lineStart < source.length; ) {
    const lineEnd = source.indexOf("\n", lineStart);
    const end = lineEnd < 0 ? source.length : lineEnd;
    const line = source.slice(lineStart, end).replace(/\r$/u, "");
    const match = /^( {0,3})([`~]+)/u.exec(line);
    if (match && match[2][0] === marker && match[2].length >= markerLength
      && /^[ \t]*$/u.test(line.slice(match[0].length))) {
      return lineEnd < 0 ? end : lineEnd + 1;
    }
    if (lineEnd < 0) break;
    lineStart = lineEnd + 1;
  }
  return source.length;
}

function protectedRegionEnd(source: string, index: number): number | undefined {
  if (source[index] === "`" && !isEscapedDollar(source, index)) {
    const fenceEnd = closingFence(source, index);
    if (fenceEnd !== undefined) return fenceEnd;
    let markerEnd = index;
    while (source[markerEnd] === "`") markerEnd += 1;
    const marker = source.slice(index, markerEnd);
    const end = source.indexOf(marker, markerEnd);
    if (end >= 0) return end + marker.length;
  }
  if (source.startsWith("<!--", index)) {
    const end = source.indexOf("-->", index + 4);
    return end < 0 ? source.length : end + 3;
  }
  if (source[index] === "<" && /[A-Za-z/!?]/u.test(source[index + 1] ?? "")) {
    const end = source.indexOf(">", index + 1);
    if (end >= 0) return end + 1;
  }
  return undefined;
}

/** Masks only dollar delimiters that the MyST dollarmath rules reject. */
// @implements_req SwRS-MDOKFSTUDIO-MYST-024
export function prepareDollarAmounts(source: string): string {
  if (!source.includes("$")) return source;
  let prepared = "";
  for (let index = 0; index < source.length; ) {
    const protectedEnd = protectedRegionEnd(source, index);
    if (protectedEnd !== undefined) {
      prepared += source.slice(index, protectedEnd);
      index = protectedEnd;
      continue;
    }
    if (source[index] !== "$" || isEscapedDollar(source, index)) {
      prepared += source[index];
      index += 1;
      continue;
    }
    const doubleEnd = source[index + 1] === "$" ? nextDoubleDollar(source, index + 2) : -1;
    if (doubleEnd >= 0) {
      prepared += source.slice(index, doubleEnd + 2);
      index = doubleEnd + 2;
      continue;
    }
    const end = nextDollar(source, index + 1);
    const openingAllowed = !DOLLAR_WHITESPACE.test(source[index + 1] ?? "")
      && !isDollarDigit(source[index - 1]);
    const closingAllowed = end > index + 1
      && !DOLLAR_WHITESPACE.test(source[end - 1] ?? "")
      && !isDollarDigit(source[end + 1]);
    if (openingAllowed && closingAllowed) {
      prepared += source.slice(index, end + 1);
      index = end + 1;
    } else {
      prepared += DOLLAR_PLACEHOLDER;
      index += 1;
    }
  }
  return prepared;
}

function restoreDollarValue(value: unknown): unknown {
  if (typeof value === "string") return value.replaceAll(DOLLAR_PLACEHOLDER, "$");
  if (Array.isArray(value)) return value.map(restoreDollarValue);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) record[key] = restoreDollarValue(record[key]);
  }
  return value;
}

/** Restores the dollar placeholders in every parsed node value before HTML writing. */
// @implements_req SwRS-MDOKFSTUDIO-MYST-024
export function restoreDollarPlaceholders(node: MystNode): void {
  const record = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "children") record[key] = restoreDollarValue(record[key]);
  }
  node.children?.forEach(restoreDollarPlaceholders);
}

// @implements_req SwRS-MDOKFSTUDIO-MYST-024
/**
 * Gives dollar amounts back to the text, as markdown-it dollarmath does: the parser reads the text
 * between $5 and $6 as inline maths, but a $...$ span is maths only when the opening $ is
 * not followed by whitespace and the closing $ neither follows whitespace nor precedes a digit.
 * A span that fails these rules becomes text again, its dollar signs included.
 */
export function restoreDollarAmounts(node: MystNode): void {
  const children = node.children;
  if (!children) return;
  let changed = false;
  children.forEach((child, index) => {
    if (child.type !== "inlineMath") {
      restoreDollarAmounts(child);
      return;
    }
    const value = child.value ?? "";
    const next = children[index + 1];
    const followedByDigit = next?.type === "text" && /^\d/u.test(next.value ?? "");
    if (/^\s/u.test(value) || /\s$/u.test(value) || followedByDigit) {
      Object.assign(child, { type: "text", value: "$" + value + "$" });
      changed = true;
    }
  });
  if (!changed) return;
  node.children = children.reduce<MystNode[]>((merged, child) => {
    const last = merged[merged.length - 1];
    if (child.type === "text" && last?.type === "text") {
      last.value = (last.value ?? "") + (child.value ?? "");
    } else {
      merged.push(child);
    }
    return merged;
  }, []);
}
