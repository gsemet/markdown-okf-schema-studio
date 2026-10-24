/**
 * Block-level tree passes of the MyST renderer: figure captions and caption-less references, raw
 * `<details>` and `<kbd>` HTML, version admonitions, bare block images, and the source line shift
 * of a document that starts with frontmatter.
 */

import { parseFragment } from "parse5";

import { MYST_PARSE_OPTIONS, type MystEngine } from "./mystEngine";
import type { MystNode, RawHtmlNode } from "./mystNode";

const VERSION_ADMONITION_TITLES: Record<string, string> = {
  versionadded: "Added in version",
  versionchanged: "Changed in version",
  deprecated: "Deprecated since version",
};

/** Turns the trailing paragraph the MyST writer leaves in a figure into its caption. */
export function normalizeFigureCaptions(node: MystNode): void {
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

/** A reference to a caption-less figure or table shows its label instead of nothing. */
export function normalizeCaptionlessReferences(root: MystNode): void {
  const targets = new Set<string>();
  collectCaptionlessTargets(root, targets);
  preserveCaptionlessReferences(root, targets);
}

const RAW_DETAILS_HEAD = /^<details((?:\s+open(?:=(?:""|"open"))?)?)\s*>\s*(?:<summary>([^<]*)<\/summary>)?\s*$/iu;
const RAW_DETAILS_WHOLE = /^<details((?:\s+open(?:=(?:""|"open"))?)?)\s*>\s*(?:<summary>([^<]*)<\/summary>)?([\s\S]*?)<\/details>\s*$/iu;

function rawDetailsNode(
  open: boolean,
  summary: string | undefined,
  body: MystNode[],
  position: MystNode["position"],
): MystNode {
  const summaryText = (summary ?? "").trim() || "Details";
  const node: MystNode = {
    type: "rawDetails",
    position,
    children: [
      { type: "rawSummary", data: { hName: "summary" }, children: [{ type: "text", value: summaryText }] },
      ...body,
    ],
  };
  node.data = { hName: "details", hProperties: open ? { open: true } : {} };
  return node;
}

/**
 * Renders the raw HTML a Markdown author writes for a collapsible section and a keyboard key.
 * `<details>` (optionally `open`, with a plain `<summary>`) becomes a details element: either a
 * head block, the Markdown between, and a closing `</details>` block (the form the edition
 * palette writes), or one block holding all of it. `<kbd>` without attributes wraps the inline
 * content up to its `</kbd>`. `<span style="…">` keeps its style for the sanitizer, which retains
 * only restricted colours. Any other raw HTML stays dropped, as before.
 */
export function normalizeRawDetailsAndKbd(node: MystNode, mystParse: MystEngine["mystParse"]): void {
  if (!node.children) {
    return;
  }
  const source = node.children;
  const output: MystNode[] = [];
  for (let index = 0; index < source.length; index += 1) {
    const child = source[index];
    const value = child.type === "html" ? (child.value ?? "").trim() : "";
    const head = RAW_DETAILS_HEAD.exec(value);
    if (head) {
      let depth = 1;
      let close = -1;
      for (let scan = index + 1; scan < source.length && close === -1; scan += 1) {
        if (source[scan].type !== "html") {
          continue;
        }
        const text = (source[scan].value ?? "").trim();
        if (RAW_DETAILS_HEAD.test(text)) {
          depth += 1;
        } else if (/^<\/details>$/iu.test(text)) {
          depth -= 1;
          if (depth === 0) {
            close = scan;
          }
        }
      }
      if (close !== -1) {
        const body = source.slice(index + 1, close);
        const closeEnd = source[close].position?.end;
        const wrapper = rawDetailsNode(head[1] !== "", head[2], body, {
          ...(child.position?.start ? { start: { ...child.position.start } } : {}),
          ...(closeEnd ? { end: { ...closeEnd } } : {}),
        });
        normalizeRawDetailsAndKbd(wrapper, mystParse);
        output.push(wrapper);
        index = close;
        continue;
      }
    }
    const whole = RAW_DETAILS_WHOLE.exec(value);
    if (whole && !/<details/iu.test(whole[3])) {
      const body = mystParse(whole[3].trim(), MYST_PARSE_OPTIONS);
      const line = child.position?.start?.line;
      if (line !== undefined) {
        offsetNodeLines(body, line);
      }
      output.push(rawDetailsNode(whole[1] !== "", whole[2], body.children ?? [], child.position));
      continue;
    }
    if (child.type === "html" && /^<kbd>$/iu.test(value)) {
      const close = source.findIndex((candidate, at) =>
        at > index && candidate.type === "html" && /^<\/kbd>$/iu.test((candidate.value ?? "").trim()));
      if (close !== -1) {
        const key: MystNode = {
          type: "rawKbd",
          data: { hName: "kbd" },
          children: source.slice(index + 1, close),
        };
        output.push(key);
        index = close;
        continue;
      }
    }
    const colourSpan = /^<span\s+style\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')\s*>$/iu.exec(value);
    if (colourSpan) {
      let depth = 1;
      let close = -1;
      for (let scan = index + 1; scan < source.length && close === -1; scan += 1) {
        const text = source[scan].type === "html" ? (source[scan].value ?? "").trim() : "";
        if (/^<span(?:\s[^<>]*)?>$/iu.test(text)) {
          depth += 1;
        } else if (/^<\/span>$/iu.test(text)) {
          depth -= 1;
          if (depth === 0) {
            close = scan;
          }
        }
      }
      if (close !== -1) {
        // The sanitizer keeps only restricted colours from the style (data-okf-color/-background).
        const colours: MystNode = {
          type: "rawColourSpan",
          data: { hName: "span", hProperties: { style: colourSpan[1] ?? colourSpan[2] ?? "" } },
          children: source.slice(index + 1, close),
        };
        normalizeRawDetailsAndKbd(colours, mystParse);
        output.push(colours);
        index = close;
        continue;
      }
    }
    normalizeRawDetailsAndKbd(child, mystParse);
    output.push(child);
  }
  node.children = output;
}

/** Shifts every source line of a subtree by `offset` (a fragment parsed on its own). */
export function offsetNodeLines(node: MystNode, offset: number): void {
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

/**
 * Renders `{versionadded}`, `{versionchanged}` and `{deprecated}` as admonitions titled with the
 * version, their body parsed.
 */
export function expandVersionAdmonitions(
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

/** The image node of a value holding only `<img …>` (optionally inside `<p>`), else undefined. */
function rawImageNode(value: string): MystNode | undefined {
  const match = /^\s*(?:<p(?:\s[^>]*)?>\s*)?(<img\s[^>]*>)\s*(?:<\/p>\s*)?$/iu.exec(value);
  if (!match) return undefined;
  const fragment = parseFragment(match[1]) as unknown as RawHtmlNode;
  const element = (fragment.childNodes ?? []).find((child) => child.tagName?.toLowerCase() === "img");
  const attr = (name: string): string | undefined =>
    element?.attrs?.find((candidate) => candidate.name.toLowerCase() === name)?.value;
  const src = attr("src")?.trim();
  if (!src) return undefined;
  const title = attr("title");
  return { type: "image", url: src, alt: attr("alt") ?? "", ...(title ? { title } : {}) } as MystNode;
}

/**
 * MyST lifts a paragraph that holds only an image to a bare block-level image (as does an `{image}`
 * directive), which would render as an unmapped `<img>`; wrapping it back keeps its source lines for editing and insertion.
 */
export function wrapBareBlockImages(root: MystNode): void {
  const wrap = (image: MystNode, position: MystNode["position"]): MystNode =>
    ({ type: "paragraph", position, children: [image] });
  root.children = root.children?.map((child): MystNode => {
    if (child.type === "image" && child.position) {
      return wrap(child, child.position);
    }
    // A raw `<img …>` block is dropped by the HTML writer; it becomes a regular image block.
    const rawImage = child.type === "html" && child.position ? rawImageNode(child.value ?? "") : undefined;
    if (rawImage) {
      return wrap(rawImage, child.position);
    }
    // An `{image}` directive holds a position-less image; it takes the directive's line range.
    if (child.type === "mystDirective" && child.name === "image" && child.position
      && child.children?.length === 1 && child.children[0].type === "image") {
      child.children = [wrap(child.children[0], child.position)];
    }
    return child;
  });
}

/** Shifts the source lines of the tree by the lines of frontmatter removed before parsing. */
export function shiftSourcePositions(node: MystNode, lineOffset: number): void {
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
