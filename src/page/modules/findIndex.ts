/**
 * The searchable text of the rendered content, for the find bar. The content is cut into text
 * blocks (a paragraph, a table cell, a list item, a heading...): a match never crosses two blocks.
 * Inside a block the text nodes are joined and runs of white space collapse to one space, as the
 * reader sees them (code blocks keep theirs); every character remembers its text node and offset,
 * so a match turns into a DOM range. Nothing here changes the page.
 */

import { findInText, type FindMatch } from "../../core/find/findMatches";

/** One text node of a block: the characters it adds to the block text, and where they come from. */
export interface TextRun {
  readonly node: Text;
  /** Offset in the block text of the run's first character. */
  readonly start: number;
  /** For each character of the run, its offset in the node (one more entry for the end). */
  readonly rawOffsets: readonly number[];
}

/** The text of one block, with the runs it is made of. */
export interface TextBlock {
  /** The block-level element the text belongs to. */
  readonly element: Element;
  readonly text: string;
  readonly runs: readonly TextRun[];
}

/** A match of the query, positioned in the page. */
export interface PageMatch {
  readonly block: TextBlock;
  readonly match: FindMatch;
  /** The matched text as the block shows it. */
  readonly text: string;
  /** The first and last text node of the match, with the offsets, for a DOM range. */
  readonly startNode: Text;
  readonly startOffset: number;
  readonly endNode: Text;
  readonly endOffset: number;
}

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "CAPTION", "DD", "DETAILS", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER",
  "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "SUMMARY", "TABLE", "TBODY", "TD", "TFOOT",
  "TH", "THEAD", "TR", "UL",
]);
/** Elements whose text is controls, code of the page or the find bar itself. */
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "BUTTON", "INPUT", "TEXTAREA", "SELECT"]);
const SKIPPED_SELECTOR = ".katex-mathml, .okf-comment, .myst-checkbox-refusal, [data-sphinx-preview-find], "
  + "[data-find-ignore], [aria-hidden='true']";

const isSpace = (character: string): boolean => /\s/u.test(character);

/** True for an element whose text the reader does not see. Folded sections stay searchable. */
function isSkipped(element: Element): boolean {
  if (SKIPPED_TAGS.has(element.tagName.toUpperCase())) return true;
  const hidden = element.getAttribute("hidden");
  if (hidden !== null && hidden !== "until-found") return true;
  return element.matches?.(SKIPPED_SELECTOR) === true;
}

/**
 * Cuts the content under `root` into text blocks. A block with no visible character is left out.
 */
export function collectTextBlocks(root: Element): TextBlock[] {
  const blocks: TextBlock[] = [];
  let open: { element: Element; text: string; runs: TextRun[]; pre: boolean; lastSpace: boolean } | undefined;

  const flush = (): void => {
    if (open && open.text.trim() !== "") blocks.push({ element: open.element, text: open.text, runs: open.runs });
    open = undefined;
  };

  const addText = (node: Text, owner: Element, pre: boolean): void => {
    const raw = node.nodeValue ?? "";
    if (raw === "") return;
    if (!open) open = { element: owner, text: "", runs: [], pre, lastSpace: true };
    const rawOffsets: number[] = [];
    let chunk = "";
    for (let index = 0; index < raw.length; index += 1) {
      const character = raw[index]!;
      if (!open.pre && isSpace(character)) {
        // A run of white space is one space; at the start of a block it is none.
        if (open.lastSpace) continue;
        chunk += " ";
        open.lastSpace = true;
      } else {
        chunk += character;
        open.lastSpace = false;
      }
      rawOffsets.push(index);
    }
    rawOffsets.push(raw.length);
    if (chunk === "") return;
    open.runs.push({ node, start: open.text.length, rawOffsets });
    open.text += chunk;
  };

  const walk = (element: Element, pre: boolean): void => {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) {
        addText(child as Text, element, pre);
      } else if (child.nodeType === 1) {
        const childElement = child as Element;
        if (isSkipped(childElement)) continue;
        const tag = childElement.tagName.toUpperCase();
        const block = BLOCK_TAGS.has(tag);
        if (block) flush();
        walk(childElement, pre || tag === "PRE");
        if (block) flush();
      }
    }
  };
  walk(root, false);
  flush();
  return blocks;
}

/** Where the character at `offset` of the block text sits: its text node and its offset in it. */
function locate(block: TextBlock, offset: number): { node: Text; offset: number } {
  let found = block.runs[0]!;
  for (const run of block.runs) {
    if (run.start > offset) break;
    found = run;
  }
  const index = Math.min(offset - found.start, found.rawOffsets.length - 1);
  return { node: found.node, offset: found.rawOffsets[index]! };
}

/** The matches of `pattern` in every block, in document order. */
export function findInBlocks(blocks: readonly TextBlock[], pattern: RegExp, limit: number): PageMatch[] {
  const matches: PageMatch[] = [];
  for (const block of blocks) {
    if (matches.length >= limit) break;
    for (const match of findInText(block.text, pattern, limit - matches.length)) {
      const start = locate(block, match.start);
      // The end is the position just after the last matched character.
      const last = locate(block, match.end - 1);
      const lastRun = block.runs.find((run) => run.node === last.node)!;
      const lastIndex = lastRun.rawOffsets.indexOf(last.offset);
      const endOffset = lastRun.rawOffsets[lastIndex + 1] ?? last.offset + 1;
      matches.push({
        block,
        match,
        text: block.text.slice(match.start, match.end),
        startNode: start.node,
        startOffset: start.offset,
        endNode: last.node,
        endOffset,
      });
    }
  }
  return matches;
}
