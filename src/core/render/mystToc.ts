/**
 * The table of contents: a paragraph made only of `[TOC]` or `[[_TOC_]]` (GitLab, Markdown
 * Preview Enhanced, Typora; case-insensitive), or a MyST `{contents}` directive (`:depth:`,
 * `:local:`), becomes a `nav` with the headings as a nested list of links. The list is generated at
 * render time and never written to the file; only the marker is saved. In edit mode the stylesheet
 * shows the block as an admonition-like box titled with the literal marker instead of the list.
 */

import { contentsTagTitle, tocTagTitle } from "./blockTagTitle";
import { type MystNode, sourcePositionProperties } from "./mystNode";

const MARKER = /^(?:\[TOC\]|\[\[_TOC_\]\])$/iu;
const SKIP = new Set(["code", "inlineCode", "html", "math", "inlineMath"]);

interface HastText { type: "text"; value: string }
interface HastElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: Array<HastElement | HastText>;
}

interface TocEntry {
  text: string;
  id: string;
  children: TocEntry[];
  level: number;
  line: number;
}

function textOf(node: MystNode): string {
  return node.value ?? (node.children ?? []).map(textOf).join("");
}

/** The paragraph's text as written, an emphasis keeping its `_` (`[[_TOC_]]` parses as one). */
function writtenText(node: MystNode): string | undefined {
  let out = "";
  for (const child of node.children ?? []) {
    if (child.type === "text") out += child.value ?? "";
    else if (child.type === "emphasis") out += `_${textOf(child)}_`;
    else return undefined;
  }
  return out;
}

/** The marker text of a `[TOC]` / `[[_TOC_]]` paragraph, or undefined when it is not one. */
function bracketMarker(node: MystNode): string | undefined {
  if (node.type !== "paragraph") return undefined;
  const written = writtenText(node)?.trim();
  return written !== undefined && MARKER.test(written) ? written : undefined;
}

/** A positive integer option value (`:depth: 2`), or undefined (absent or invalid: no limit). */
function depthOption(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

/** GitHub-style slug of a heading text; the host resolves `#slug` links with the same rule. */
function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s+/gu, "-");
}

function walkNodes(node: MystNode, visit: (node: MystNode) => void): void {
  if (SKIP.has(node.type)) return;
  visit(node);
  node.children?.forEach((child) => walkNodes(child, visit));
}

/** The headings of the document, in order, with the id each one gets (its own, else a unique slug). */
function collectHeadings(root: MystNode): TocEntry[] {
  const headings: MystNode[] = [];
  const taken = new Set<string>();
  walkNodes(root, (node) => {
    if (node.type !== "heading" || node.data?.included === true) return;
    headings.push(node);
    if (node.identifier) taken.add(node.identifier);
  });
  const counts = new Map<string, number>();
  const flat: TocEntry[] = [];
  for (const heading of headings) {
    const text = textOf(heading).replace(/\s+/gu, " ").trim();
    if (text === "") continue;
    let id = heading.identifier;
    if (!id) {
      const base = slug(text) || "section";
      let seen = counts.get(base) ?? 0;
      id = seen === 0 ? base : `${base}-${seen}`;
      while (taken.has(id)) {
        seen += 1;
        id = `${base}-${seen}`;
      }
      counts.set(base, seen + 1);
      taken.add(id);
      heading.data = {
        ...(heading.data ?? {}),
        hProperties: { ...((heading.data?.hProperties as Record<string, unknown> | undefined) ?? {}), id },
      };
    }
    flat.push({ text, id, children: [], level: (heading as { depth?: number }).depth ?? 1, line: heading.position?.start?.line ?? 0 });
  }
  return flat;
}

/** Nests by heading level: a heading goes under the nearest previous heading of a lower level. */
function nest(flat: TocEntry[]): TocEntry[] {
  const top: TocEntry[] = [];
  const stack: TocEntry[] = [];
  for (const original of flat) {
    const entry = { ...original, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) stack.pop();
    (stack.length > 0 ? stack[stack.length - 1].children : top).push(entry);
    stack.push(entry);
  }
  return top;
}

/**
 * The headings of the section the directive sits in (`:local:`): those after it, up to the next
 * heading as high as the one before it; the whole rest of the document when no heading precedes it.
 */
function localEntries(flat: TocEntry[], line: number): TocEntry[] {
  const before = flat.filter((entry) => entry.line < line);
  const level = before.length > 0 ? before[before.length - 1].level : 0;
  const after = flat.filter((entry) => entry.line > line);
  const end = level === 0 ? -1 : after.findIndex((entry) => entry.level <= level);
  return end < 0 ? after : after.slice(0, end);
}

function list(entries: TocEntry[], depth: number | undefined, level: number): HastElement {
  return {
    type: "element",
    tagName: "ul",
    properties: {},
    children: entries.map((entry): HastElement => ({
      type: "element",
      tagName: "li",
      properties: {},
      children: [
        {
          type: "element",
          tagName: "a",
          properties: { href: `#${encodeURIComponent(entry.id)}` },
          children: [{ type: "text", value: entry.text }],
        },
        ...(entry.children.length > 0 && (depth === undefined || level < depth)
          ? [list(entry.children, depth, level + 1)]
          : []),
      ],
    })),
  };
}

// @implements_req SwRS-MDOKFSTUDIO-CORE-072
/**
 * Replaces each `[TOC]` / `[[_TOC_]]` paragraph and each `{contents}` directive by the table of
 * contents of the document. `:depth:` counts the levels of the generated list (1 = the top
 * headings only); `:local:` lists only the section the directive is in. Headings brought in by
 * `{include}` are left out; every listed heading gets an `id` for the link to land on.
 */
export function expandTocMarkers(root: MystNode): void {
  const markers: Array<{ node: MystNode; title: string; depth?: number; local: boolean }> = [];
  walkNodes(root, (node) => {
    const bracket = bracketMarker(node);
    if (bracket !== undefined) {
      markers.push({ node, title: tocTagTitle(bracket), local: false });
    } else if (node.type === "mystDirective" && node.name?.toLowerCase() === "contents") {
      const local = node.options?.local === true || node.options?.local === "";
      markers.push({ node, title: contentsTagTitle(node.args), depth: depthOption(node.options?.depth), local });
    }
  });
  if (markers.length === 0) return;
  // A directive's own title is parsed as a heading; it is not one of the document.
  for (const { node } of markers) node.children = [];
  const flat = collectHeadings(root);
  for (const { node, title, depth, local } of markers) {
    const line = node.position?.start?.line;
    const entries = nest(local ? localEntries(flat, line ?? 0) : flat);
    node.type = "okfToc";
    node.children = [];
    node.data = {
      ...(node.data ?? {}),
      hName: "nav",
      hProperties: {
        class: entries.length === 0 ? "okf-toc okf-toc--empty" : "okf-toc",
        "aria-label": "Table of contents",
        "data-okf-tag": title,
        ...sourcePositionProperties(node, line),
      },
      hChildren: entries.length === 0 ? [] : [list(entries, depth, 1)],
    };
  }
}
