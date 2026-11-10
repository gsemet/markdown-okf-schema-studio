/**
 * SVG pictures: an `svg` fence and a raw `<svg>` that fills a whole block (it starts a block after
 * a blank line and ends its last line) are drawn inline, themed, after the sanitizer of
 * `../security/svgSanitizer.ts` has rebuilt them. A `<svg>` inside a sentence stays dropped with
 * its content, like any raw HTML the preview does not keep.
 *
 * Three steps. The source pass sets a raw block aside before the parser reads the text: the parser
 * would cut a one-line `<svg>` into a paragraph of inline HTML, and Markdown inside the picture
 * would be read as Markdown. A placeholder comment and blank lines take its lines, so every line
 * number stays. A first tree pass turns each placeholder back into a `svg` code node; a later one (after the
 * passes that re-read fragments) renders every `svg` code node (fence or raw block, in document
 * order) as a figure holding the sanitized picture; a picture that cannot be sanitized stays a code block and the render warns.
 *
 * Pure module: no host API, no DOM, no Node built-ins.
 */

import { sanitizeSvg, type SvgElement } from "../security/svgSanitizer";
import { type MystNode, setHast, sourcePositionProperties } from "./mystNode";
import type { RenderDiagnostic } from "./mystTypes";

const BLOCK_START = /^ {0,3}<svg(?=[\s>/])/iu;
const SVG_TAG = /<svg(?=[\s>/])|<\/svg\s*>/giu;
const TABLE_OPEN = /<table(?=[\s>/])/giu;
const TABLE_CLOSE = /<\/table\s*>/giu;
const FENCE = /^ {0,3}(`{3,}|~{3,})/u;
/** A comment block (CommonMark HTML block type 2) and a `$$` math block open only at the start of a line. */
const COMMENT_START = /^ {0,3}<!--/u;
const MATH_START = /^ {0,3}\$\$/u;
/** The farthest a raw `<svg>` may be closed: a longer one is not a picture (and the scan stays linear enough). */
const MAX_BLOCK_LINES = 2000;

/** The text the parser reads with the raw `<svg>` blocks set aside, and those blocks in order. */
export interface RawSvgBlocks {
  readonly text: string;
  readonly sources: readonly string[];
  /** The unguessable word of this render's placeholders: a document cannot write one. */
  readonly token: string;
}

function randomToken(text: string): string {
  for (;;) {
    const bytes = new Uint8Array(12);
    globalThis.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (!text.includes(token)) return token;
  }
}

/** The index of the line where the `<svg>` that starts at `start` is closed, or undefined. */
function closingLine(lines: readonly string[], start: number): number | undefined {
  let depth = 0;
  const last = Math.min(lines.length, start + MAX_BLOCK_LINES);
  for (let index = start; index < last; index += 1) {
    const line = lines[index] ?? "";
    // A fence line inside the candidate: the picture is not closed before the next code block.
    if (index > start && FENCE.test(line)) return undefined;
    for (const tag of line.matchAll(SVG_TAG)) {
      depth += tag[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        return line.slice((tag.index ?? 0) + tag[0].length).trim() === "" ? index : undefined;
      }
    }
  }
  return undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-125
/** Sets aside each raw `<svg>` block (see the module comment): same lines, placeholder in the first. */
export function prepareRawSvg(text: string): RawSvgBlocks {
  if (!/<svg/iu.test(text)) return { text, sources: [], token: "" };
  const token = randomToken(text);
  const lines = text.split(/(?<=\r\n|\r|\n)/u);
  const bare = lines.map((line) => line.replace(/[\r\n]+$/u, ""));
  const endings = lines.map((line) => /[\r\n]+$/u.exec(line)?.[0] ?? "");
  const sources: string[] = [];
  let fence: { marker: string; length: number } | undefined;
  let inComment = false;
  let inMath = false;
  let tableDepth = 0;
  for (let index = 0; index < bare.length; index += 1) {
    const line = bare[index] ?? "";
    // A comment or a `$$` math block holds its lines as they are: an svg inside is not a picture.
    if (inComment) {
      if (line.includes("-->")) inComment = false;
      continue;
    }
    if (inMath) {
      if (line.includes("$$")) inMath = false;
      continue;
    }
    const opening = FENCE.exec(line);
    if (fence) {
      const closing = opening?.[1];
      if (closing && closing.startsWith(fence.marker) && closing.length >= fence.length && line.trim() === closing) fence = undefined;
      continue;
    }
    if (opening) {
      fence = { marker: opening[1]?.[0] ?? "`", length: opening[1]?.length ?? 3 };
      continue;
    }
    // A raw HTML table drops an svg in a cell (SwRS-MDOKFSTUDIO-GFM-031): its lines are not blocks.
    if (!BLOCK_START.test(line)) {
      tableDepth = Math.max(0, tableDepth + (line.match(TABLE_OPEN)?.length ?? 0) - (line.match(TABLE_CLOSE)?.length ?? 0));
    }
    if (tableDepth > 0) continue;
    if (!BLOCK_START.test(line)) {
      // A `<!--` or `$$` inside a sentence or a code span opens nothing; a block closed on its
      // first line holds no other line.
      const comment = COMMENT_START.exec(line);
      const math = MATH_START.exec(line);
      if (comment) inComment = !line.includes("-->", comment[0].length);
      else if (math) inMath = !line.includes("$$", math[0].length);
      continue;
    }
    if (index > 0 && (bare[index - 1] ?? "").trim() !== "") continue;
    const end = closingLine(bare, index);
    if (end === undefined) continue;
    sources.push(bare.slice(index, end + 1).join("\n"));
    bare[index] = `<!--okf-svg:${token}:${sources.length - 1}-->`;
    for (let blank = index + 1; blank <= end; blank += 1) bare[blank] = "";
    index = end;
  }
  return { text: bare.map((line, index) => line + (endings[index] ?? "")).join(""), sources, token };
}

/** Puts each placeholder back as a `svg` code node: the source and the lines of the original block. */
function restoreRawBlocks(node: MystNode, sources: readonly string[], lineCounts: readonly number[], placeholder: RegExp): void {
  for (const child of node.children ?? []) {
    const match = child.type === "html" ? placeholder.exec((child.value ?? "").trim()) : null;
    const source = match ? sources[Number(match[1])] : undefined;
    if (source !== undefined && match) {
      const start = child.position?.start?.line;
      child.type = "code";
      child.lang = "svg";
      child.value = source;
      if (start !== undefined && child.position) {
        child.position = {
          ...child.position,
          end: { ...child.position.end, line: start + (lineCounts[Number(match[1])] ?? 1) - 1 },
        };
      }
      continue;
    }
    restoreRawBlocks(child, sources, lineCounts, placeholder);
  }
}

function textOf(element: SvgElement, tagName: string): string | undefined {
  for (const child of element.children) {
    if (child.type !== "element") continue;
    if (child.tagName === tagName) return child.children.map((part) => (part.type === "text" ? part.value : "")).join("").trim();
  }
  return undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-125
// @implements_req SwRS-MDOKFSTUDIO-DIAG-127
/** Turns the code nodes of language `svg` into pictures (see the module comment). */
function renderSvgNodes(node: MystNode, state: { count: number }, diagnostics: RenderDiagnostic[]): void {
  if (node.type === "code" && node.lang?.toLowerCase() === "svg") {
    const line = node.position?.start?.line;
    const picture = sanitizeSvg(node.value ?? "", `okf-svg-${state.count + 1}-`);
    if (!picture) {
      diagnostics.push({
        code: "svg-unreadable",
        message: "The svg block holds no <svg> element the preview can draw; it is shown as code.",
        severity: "warning",
        ...(line === undefined ? {} : { line }),
      });
      return;
    }
    state.count += 1;
    if (picture.removed.length > 0) {
      diagnostics.push({
        code: "svg-sanitized",
        message: `The preview removed from the SVG: ${picture.removed.join(", ")}.`,
        severity: "warning",
        ...(line === undefined ? {} : { line }),
      });
    }
    const root = picture.element;
    root.properties.role ??= "img";
    root.properties["aria-label"] ??= textOf(root, "title") || "SVG picture";
    setHast(node, "figure", { class: "myst-svg-figure", ...sourcePositionProperties(node, line) }, [root]);
    node.children = [];
    node.type = "svgPicture";
    return;
  }
  for (const child of node.children ?? []) renderSvgNodes(child, state, diagnostics);
}

/** The first tree pass: restores the raw blocks that the source pass set aside, as `svg` code nodes. */
export function restoreRawSvgBlocks(ast: MystNode, blocks: readonly string[], token: string): void {
  if (blocks.length > 0) {
    const placeholder = new RegExp(`^<!--okf-svg:${token}:(\\d+)-->$`, "u");
    restoreRawBlocks(ast, blocks, blocks.map((source) => source.split("\n").length), placeholder);
  }
}

// @implements_req SwRS-MDOKFSTUDIO-DIAG-125
/** The second tree pass: renders every `svg` code node (fence or raw block) as a picture. */
export function expandSvgPictures(ast: MystNode, diagnostics: RenderDiagnostic[]): void {
  renderSvgNodes(ast, { count: 0 }, diagnostics);
}
