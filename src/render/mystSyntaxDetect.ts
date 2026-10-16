/**
 * Finds MyST syntax in a parsed document that only works when a given MyST extension is on.
 *
 * Runs on the document's own tree (before include expansion). Code, inline code and raw HTML
 * are never searched for text patterns. Pure: no I/O.
 */

export interface DetectNode {
  type: string;
  children?: DetectNode[];
  position?: { start?: { line?: number }; end?: { line?: number } };
  value?: string;
  name?: string;
}

export interface MystSyntaxUse {
  /** The MyST extension name, as written in `myst_enable_extensions`. */
  ext: string;
  /** The syntax as shown to the user. */
  syntax: string;
  /** One-based line of the first use in the document. */
  line: number;
}

const AMS_ENVIRONMENT = /^\\begin\{(align|alignat|equation|gather|flalign|multline|eqnarray)\*?\}/u;
const TASK_ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])\s+\[[ xX]\](?:\s|$)/u;
const FIELD_START = /^:[^\s:][^:\n]*:(?:\s|$)/u;
const SKIPPED_CONTAINERS = new Set(["code", "inlineCode", "mystRole", "mystComment", "comment"]);

const INLINE_TYPES = new Set([
  "text", "delete", "inlineMath", "emphasis", "strong", "link", "linkReference", "image",
  "imageReference", "footnoteReference", "break",
]);

function lineOf(node: DetectNode): number | undefined {
  return node.position?.start?.line;
}

/** The first line in [start, end] matching the pattern, else the block's first line. */
function refine(lines: readonly string[], start: number, end: number, pattern: RegExp): number {
  for (let line = start; line <= Math.min(end, lines.length); line += 1) {
    if (pattern.test(lines[line - 1])) {
      return line;
    }
  }
  return start;
}

/**
 * The line of a real `$...$` span with this content, or undefined. The parser also makes math
 * from currency such as `$19 ... ($200)`; markdown-it-dollarmath does not: the opening `$` must
 * not be followed by whitespace, the closing `$` must not follow whitespace or precede a digit.
 */
function inlineDollarLine(
  lines: readonly string[],
  start: number,
  end: number,
  value: string,
): number | undefined {
  if (value === "") return undefined;
  const text = lines.slice(start - 1, end).join("\n");
  const normalized = value.replace(/\s+/gu, " ");
  for (const match of text.matchAll(/\$(?![\s$])([^$]*?)(?<![\s$])\$(?!\d)/gu)) {
    if (match[1].replace(/\s+/gu, " ") === normalized) {
      return start + (text.slice(0, match.index).match(/\n/gu)?.length ?? 0);
    }
  }
  return undefined;
}

function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.trim() !== "---") return 0;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---" || lines[index].trim() === "...") return index + 1;
  }
  return 0;
}

export function detectMystSyntax(root: DetectNode, source: string): MystSyntaxUse[] {
  const lines = source.split(/\r\n|\r|\n/u);
  const first = new Map<string, MystSyntaxUse>();
  const codeRanges: Array<[number, number]> = [];

  const record = (ext: string, syntax: string, line: number): void => {
    const known = first.get(ext);
    if (!known || line < known.line) {
      first.set(ext, { ext, syntax, line });
    }
  };

  // `block` is the enclosing block-level node, whose line range inline nodes are refined in.
  const visit = (node: DetectNode, block: DetectNode): void => {
    const start = lineOf(node);
    if (node.type === "code") {
      if (start !== undefined) {
        codeRanges.push([start, node.position?.end?.line ?? start]);
      }
      return;
    }
    if (SKIPPED_CONTAINERS.has(node.type)) {
      return;
    }
    if (node.type === "mystDirective" && node.name === "math") {
      return;
    }
    const here = !INLINE_TYPES.has(node.type) && start !== undefined
      && node.position?.end?.line !== undefined ? node : block;
    const blockStart = lineOf(here) ?? 1;
    const blockEnd = here.position?.end?.line ?? blockStart;

    switch (node.type) {
      case "mystDirective": {
        if (start !== undefined && /^\s*:{3,}/u.test(lines[start - 1] ?? "")) {
          record("colon_fence", ":::", start);
        }
        break;
      }
      case "inlineMath": {
        const line = inlineDollarLine(lines, blockStart, blockEnd, node.value ?? "");
        if (line !== undefined) {
          record("dollarmath", "$...$", line);
        }
        break;
      }
      case "math": {
        const value = node.value ?? "";
        const opening = lines[(start ?? 1) - 1] ?? "";
        if (AMS_ENVIRONMENT.test(opening.trim()) && AMS_ENVIRONMENT.test(value.trim())) {
          const environment = AMS_ENVIRONMENT.exec(value.trim())?.[0] ?? "\\begin{align}";
          record("amsmath", environment, start ?? blockStart);
        } else {
          record("dollarmath", "$$", refine(lines, blockStart, blockEnd, /\$\$/u));
        }
        break;
      }
      case "definitionList":
        record("deflist", ": definition", start ?? blockStart);
        break;
      case "delete":
        record("strikethrough", "~~", refine(lines, blockStart, blockEnd, /~~/u));
        break;
      case "paragraph": {
        const text = node.children?.[0];
        if (text?.type === "text" && FIELD_START.test(text.value ?? "")) {
          record("fieldlist", ":name: value", start ?? blockStart);
        }
        break;
      }
      case "text": {
        const value = node.value ?? "";
        if (/\{\{[^{}\n]+\}\}/u.test(value)) {
          record("substitution", "{{ name }}", refine(lines, blockStart, blockEnd, /\{\{[^{}]+\}\}/u));
        }
        const attrs = /\]\{([.#])/u.exec(value);
        if (attrs) {
          record("attrs_inline", `]{${attrs[1]}`, refine(lines, blockStart, blockEnd, /\]\{[.#]/u));
        }
        break;
      }
      case "html": {
        const value = node.value ?? "";
        if (/<img\b/iu.test(value)) {
          record("html_image", "<img>", start ?? blockStart);
        }
        if (/<div\b[^>]*\bclass\s*=\s*["'][^"']*\badmonition\b/iu.test(value)) {
          record("html_admonition", "<div class=\"admonition\">", start ?? blockStart);
        }
        return;
      }
      default:
        break;
    }
    for (const child of node.children ?? []) {
      visit(child, here);
    }
  };
  visit(root, root);

  // Task list items: the renderer swaps the checkbox markers out before parsing, so the
  // marker text in the source is the reliable signal. Lines inside code and frontmatter do not count.
  const skipUntil = frontmatterEnd(lines);
  for (let line = skipUntil + 1; line <= lines.length; line += 1) {
    if (TASK_ITEM.test(lines[line - 1]) && !codeRanges.some(([from, to]) => line >= from && line <= to)) {
      record("tasklist", "- [ ]", line);
      break;
    }
  }

  return [...first.values()].sort((a, b) => a.line - b.line || a.ext.localeCompare(b.ext));
}

/** The warning text for one syntax whose extension is not enabled (wording fixed by U17). */
export function mystExtensionWarning(use: Pick<MystSyntaxUse, "ext" | "syntax">): string {
  return `Warning: \`${use.syntax}\` is used but this needs the MyST extension \`${use.ext}\`, `
    + `which is not enabled in your conf.py. Add "${use.ext}" to \`myst_enable_extensions\`.`;
}

/** At most this many extension warnings are reported for one document. */
export const MAX_EXTENSION_WARNINGS = 10;
