/**
 * README-style raw HTML: the elements GitHub keeps in a README (`<div align>`, `<p align>`, `<br>`,
 * `<img>` with its size, `<a><img></a>`, `<picture>` with colour-scheme sources, `<sub>`, `<sup>`,
 * `<kbd>` and the like) become syntax-tree nodes that the HTML writer renders. The parser keeps
 * raw HTML as `html` nodes, which the writer drops; this pass pairs their opening and closing tags
 * across sibling nodes (so Markdown after a blank line inside `<div>` is rendered as Markdown) and
 * rebuilds every element from an allow-list of tags and, per tag, of attributes. Nothing that can
 * carry script survives: no event handler, no `style`, no `class`, no unknown tag, and the content
 * of `script`, `style`, `iframe` and the like is dropped with its tag. The preview sanitizer still
 * runs on the written HTML afterwards.
 */

import { parseFragment } from "parse5";

import { openingTagTitle } from "./blockTagTitle";
import { type MystNode, type RawHtmlNode, sourcePositionProperties } from "./mystNode";

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const BLOCK_TAGS = new Set([
  "div", "p", "center", "blockquote", "ul", "ol", "li", "dl", "dt", "dd", "details", "summary",
  "figure", "figcaption", "hr", ...HEADINGS,
]);
const PHRASING_TAGS = new Set([
  "span", "br", "img", "a", "picture", "source", "sub", "sup", "b", "i", "em", "strong", "u", "s",
  "del", "ins", "small", "kbd", "code", "mark",
]);
const VOID_TAGS = new Set(["br", "hr", "img", "source"]);
/** Elements whose content goes with the tag: it is never text of the page. */
const DROPPED_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "textarea", "noscript", "template", "svg", "math",
  "title", "xmp", "frameset", "applet",
]);
/** Parents whose children are inline: their raw HTML stays inline, never a block of its own. */
const PHRASING_PARENTS = new Set([
  "paragraph", "heading", "tableCell", "emphasis", "strong", "delete", "link", "linkReference",
  "mystRole", "caption",
]);
/** Elements that are not given an edit-mode title. */
const UNTITLED_TAGS = new Set(["br", "hr", "source", "li", "summary", "dt", "dd"]);
const ALIGN_TAGS = new Set(["div", "p", "center", "hr", ...HEADINGS]);

const TAG = /<!--[\s\S]*?-->|<\/([A-Za-z][\w-]*)\s*>|<([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/gu;
const DIMENSION = /^\d{1,4}(?:px|%)?$/u;
const ALIGNMENT = /^(?:left|center|right|justify)$/iu;
const SAFE_MEDIA = /^[\w\s():,.\-/<>=]{1,200}$/u;
const SAFE_TOKEN = /^[\w.+/-]{1,100}$/u;
const SCHEME = /^\s*(?:javascript|vbscript|data|file):/iu;
const COLOUR_SCHEME_MEDIA = /prefers-color-scheme\s*:\s*(dark|light)/iu;

interface Token {
  kind: "open" | "close" | "text";
  name: string;
  attrs: Array<{ name: string; value: string }>;
  raw: string;
  line: number | undefined;
  endLine: number | undefined;
}

interface Frame {
  tag: string;
  props: Record<string, unknown>;
  kids: MystNode[];
  openTag: string;
  startLine: number | undefined;
}

function isAllowedTag(name: string): boolean {
  return BLOCK_TAGS.has(name) || PHRASING_TAGS.has(name);
}

/** True when the raw value holds a tag this pass rebuilds (and no table, which has its own path). */
function holdsElements(value: string | undefined): boolean {
  if (!value || /<table[\s>]/iu.test(value)) return false;
  for (const match of value.matchAll(TAG)) {
    const name = (match[1] ?? match[2])?.toLowerCase();
    if (name && isAllowedTag(name)) return true;
  }
  return false;
}

function decodeText(text: string): string {
  return (parseFragment(text) as unknown as RawHtmlNode).childNodes
    ?.map((child) => child.value ?? "").join("") ?? text;
}

function openAttributes(raw: string): Array<{ name: string; value: string }> {
  const fragment = parseFragment(raw) as unknown as RawHtmlNode;
  return (fragment.childNodes?.[0]?.attrs ?? []).map((a) => ({ name: a.name.toLowerCase(), value: a.value }));
}

/** The tokens of one raw HTML value: tags and text, with the source line of each. */
function tokenize(value: string, firstLine: number | undefined): Token[] {
  const tokens: Token[] = [];
  const lineAt = (offset: number): number | undefined =>
    firstLine === undefined ? undefined : firstLine + (value.slice(0, offset).match(/\n/gu)?.length ?? 0);
  let offset = 0;
  const text = (end: number): void => {
    const raw = value.slice(offset, end);
    if (raw !== "") {
      tokens.push({ kind: "text", name: "", attrs: [], raw, line: lineAt(offset), endLine: lineAt(end) });
    }
  };
  const scan = new RegExp(TAG.source, "gu");
  for (let match = scan.exec(value); match; match = scan.exec(value)) {
    const index = match.index;
    text(index);
    offset = index + match[0].length;
    const close = match[1]?.toLowerCase();
    const open = match[2]?.toLowerCase();
    if (open && DROPPED_WITH_CONTENT.has(open)) {
      const end = new RegExp(`</${open}\\s*>`, "iu").exec(value.slice(offset));
      offset = end ? offset + end.index + end[0].length : value.length;
      scan.lastIndex = offset;
      continue;
    }
    if (close) {
      tokens.push({ kind: "close", name: close, attrs: [], raw: match[0], line: lineAt(index), endLine: lineAt(offset) });
    } else if (open) {
      tokens.push({
        kind: "open",
        name: open,
        attrs: openAttributes(match[0]),
        raw: match[0],
        line: lineAt(index),
        endLine: lineAt(offset),
      });
    }
  }
  text(value.length);
  return tokens;
}

function safeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" || SCHEME.test(trimmed) || /[\u0000-\u001f]/u.test(trimmed) ? undefined : trimmed;
}

/** The attributes kept for one tag; every other attribute is dropped. */
function safeProperties(tag: string, attrs: Array<{ name: string; value: string }>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const { name, value } of attrs) {
    const trimmed = value.trim();
    if (name === "title") props.title = value.slice(0, 300);
    else if (name === "align" && ALIGN_TAGS.has(tag) && ALIGNMENT.test(trimmed)) props.align = trimmed.toLowerCase();
    else if (tag === "img" && name === "src" && safeUrl(value)) props.src = safeUrl(value);
    else if (tag === "img" && name === "alt") props.alt = value.slice(0, 300);
    else if (tag === "img" && (name === "width" || name === "height") && DIMENSION.test(trimmed)) props[name] = trimmed;
    else if (tag === "a" && name === "href" && safeUrl(value)) props.href = safeUrl(value);
    else if (tag === "source" && name === "srcset" && safeUrl(value) && value.length <= 2000) props.srcSet = value.trim();
    else if (tag === "source" && (name === "media" || name === "sizes") && SAFE_MEDIA.test(trimmed)) props[name] = trimmed;
    else if (tag === "source" && name === "type" && SAFE_TOKEN.test(trimmed)) props.type = trimmed;
    else if (tag === "details" && name === "open") props.open = true;
  }
  return props;
}

function element(tag: string, props: Record<string, unknown>, kids: MystNode[], start: number | undefined, end: number | undefined): MystNode {
  return {
    type: "rawHtmlElement",
    ...(start === undefined ? {} : { position: { start: { line: start }, end: { line: end ?? start } } }),
    data: { hName: tag, hProperties: props },
    children: kids,
  };
}

function tagOf(node: MystNode): string {
  return node.type === "rawHtmlElement" ? String(node.data?.hName) : "";
}

function propsOf(node: MystNode): Record<string, unknown> {
  return (node.data?.hProperties ?? {}) as Record<string, unknown>;
}

/**
 * `<picture>` with `prefers-color-scheme` sources follows the preview theme, not the system: each
 * colour-scheme source becomes an `<img>` shown only in its theme, and the fallback `<img>` is
 * shown when no source of the current theme exists.
 */
function themePicture(picture: MystNode): void {
  const kids = picture.children ?? [];
  const fallback = kids.find((kid) => tagOf(kid) === "img");
  const themes = new Set<string>();
  const out: MystNode[] = [];
  for (const kid of kids) {
    const props = propsOf(kid);
    const scheme = tagOf(kid) === "source" && typeof props.media === "string"
      ? COLOUR_SCHEME_MEDIA.exec(props.media)?.[1]?.toLowerCase() : undefined;
    const url = typeof props.srcSet === "string" ? props.srcSet.split(",")[0].trim().split(/\s+/u)[0] : undefined;
    if (scheme && url) {
      themes.add(scheme);
      const base = fallback ? propsOf(fallback) : {};
      out.push(element("img", { ...base, src: url, className: [`okf-theme-${scheme}`] }, [], undefined, undefined));
    } else if (kid !== fallback) {
      out.push(kid);
    }
  }
  if (themes.size === 0) return;
  if (fallback) out.push(element("img", { ...propsOf(fallback), className: ["okf-theme-fallback"] }, [], undefined, undefined));
  picture.children = out;
  (picture.data as { hProperties: Record<string, unknown> }).hProperties["data-okf-themes"] = [...themes].join(" ");
}

function isRawPhrasing(node: MystNode): boolean {
  return node.data?.rawHtml === true && (node.type === "text" || PHRASING_TAGS.has(tagOf(node)));
}

function blockProperties(node: MystNode, openTag: string | undefined, line: number | undefined): Record<string, unknown> {
  const title = openTag ? openingTagTitle(openTag) : undefined;
  return {
    className: ["okf-html-block"],
    ...(title ? { "data-okf-tag": title } : {}),
    ...sourcePositionProperties(node, line),
  };
}

/** Block elements at the top of a block parent get their source lines; inline runs get a paragraph. */
function finishBlockLevel(kids: MystNode[]): MystNode[] {
  const output: MystNode[] = [];
  let run: MystNode[] = [];
  const flush = (): void => {
    while (run.length > 0 && run[0].type === "text" && (run[0].value ?? "").trim() === "") run.shift();
    while (run.length > 0 && run[run.length - 1].type === "text" && (run[run.length - 1].value ?? "").trim() === "") run.pop();
    if (run.length > 0) {
      const first = run[0].position?.start?.line;
      const last = run[run.length - 1].position?.end?.line ?? first;
      const paragraph: MystNode = {
        type: "paragraph",
        ...(first === undefined ? {} : { position: { start: { line: first }, end: { line: last ?? first } } }),
        children: run,
      };
      const only = run.length === 1 && run[0].type === "rawHtmlElement" ? run[0] : undefined;
      const tag = only ? tagOf(only) : "";
      if (only && !UNTITLED_TAGS.has(tag) && first !== undefined) {
        const open = only.data?.openTag as string | undefined;
        paragraph.data = { hProperties: blockProperties(paragraph, open, first) };
      }
      output.push(paragraph);
    }
    run = [];
  };
  for (const kid of kids) {
    if (isRawPhrasing(kid)) {
      run.push(kid);
      continue;
    }
    flush();
    if (kid.type === "rawHtmlElement" && kid.position?.start?.line !== undefined) {
      const props = propsOf(kid);
      const tag = tagOf(kid);
      kid.data = {
        ...kid.data,
        hProperties: {
          ...props,
          ...blockProperties(kid, UNTITLED_TAGS.has(tag) ? undefined : kid.data?.openTag as string, kid.position.start.line),
        },
      };
    }
    output.push(kid);
  }
  flush();
  return output;
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-071
/**
 * Replaces the raw HTML of README-style elements by element nodes, in the children of `node` and of
 * every descendant. Opening and closing tags are paired across sibling nodes.
 */
export function expandRawHtmlElements(node: MystNode): void {
  const children = node.children;
  if (!children) return;
  if (!children.some((child) => child.type === "html" && holdsElements(child.value))) {
    children.forEach(expandRawHtmlElements);
    return;
  }
  const stack: Frame[] = [];
  const root: MystNode[] = [];
  const target = (): MystNode[] => stack.length > 0 ? stack[stack.length - 1].kids : root;
  let lastLine: number | undefined;
  const closeFrame = (endLine: number | undefined): void => {
    const frame = stack.pop();
    if (!frame) return;
    const built = element(frame.tag, frame.props, frame.kids, frame.startLine, endLine ?? frame.startLine);
    built.data = { ...built.data, openTag: frame.openTag, rawHtml: true };
    if (frame.tag === "picture") themePicture(built);
    target().push(built);
  };
  for (const child of children) {
    if (child.type !== "html" || !holdsElements(child.value)) {
      expandRawHtmlElements(child);
      target().push(child);
      continue;
    }
    lastLine = child.position?.end?.line ?? lastLine;
    for (const token of tokenize(child.value ?? "", child.position?.start?.line)) {
      if (token.kind === "text") {
        const decoded = decodeText(token.raw);
        if (decoded.trim() === "" && decoded.includes("\n")) continue;
        target().push({
          type: "text",
          value: decoded,
          data: { rawHtml: true },
          ...(token.line === undefined ? {} : { position: { start: { line: token.line }, end: { line: token.endLine ?? token.line } } }),
        });
      } else if (!isAllowedTag(token.name)) {
        continue;
      } else if (token.kind === "open") {
        const props = safeProperties(token.name, token.attrs);
        if (VOID_TAGS.has(token.name)) {
          const built = element(token.name, props, [], token.line, token.endLine);
          built.data = { ...built.data, openTag: token.raw, rawHtml: true };
          target().push(built);
        } else {
          stack.push({ tag: token.name, props, kids: [], openTag: token.raw, startLine: token.line });
        }
      } else {
        const at = stack.map((frame) => frame.tag).lastIndexOf(token.name);
        if (at === -1) continue;
        while (stack.length - 1 > at) closeFrame(token.line);
        closeFrame(token.endLine);
      }
    }
  }
  while (stack.length > 0) closeFrame(lastLine);
  node.children = PHRASING_PARENTS.has(node.type) ? root : finishBlockLevel(root);
}
