import { locate, type PageCommentThread } from "./commentThreadData";

/**
 * Where each review thread belongs in the page. This module only reads: it answers for the content
 * as it is without any highlight or badge, whatever an earlier update left in it, so that placing
 * again over placed threads gives the same answer as placing on a fresh render
 * (commentPlacements.ts changes the page). One plan reads the `[data-line]` blocks of the document
 * once, and the text of each block it searches once.
 */

/** The attributes of the elements the review comments add to the page. */
export const MARK = "data-okf-comment-thread";
export const BADGE = "data-okf-comment-badge";
export const ORPHAN = "data-okf-comment-orphan";
export const POPOVER = "data-okf-comment-popover";

const SKIP = "pre, code, script, style, textarea, svg, .katex, .math, .math-inline, .math-display, "
  + ".myst-mermaid-figure, .myst-plantuml-figure, .myst-vega-figure, [data-okf-properties], "
  + ".okf-comment, .okf-chip, [data-sphinx-preview-block-editor], [data-sphinx-preview-editing], "
  + "[data-sphinx-preview-included], "
  + `[${MARK}], [${BADGE}], [${POPOVER}]`;
const EDITING = "[data-sphinx-preview-block-editor], [data-sphinx-preview-editing]";
const NEXT_TO = new Set(["TABLE", "THEAD", "TBODY", "TR", "UL", "OL", "DL", "PRE", "DETAILS", "IMG", "HR", "SVG"]);
// A quote must have this many characters (whitespace collapsed) to be searched for elsewhere.
const MIN_MOVED_QUOTE = 12;

/** Sibling nodes that are one text node once the highlights among them are removed. */
export interface TextRun {
  /** The first node of the run in the page: a text node, or a highlight. */
  head: Node;
  readonly text: string;
  /** Where each node of the run starts in `text`. */
  readonly offsets: ReadonlyMap<Node, number>;
  /** The parts of `text` that no planned highlight takes yet, in order, as [from, to). */
  readonly free: Array<[number, number]>;
}

export type ThreadPlace =
  | { kind: "mark"; run: TextRun; offset: number; length: number }
  | { kind: "badge"; block: Element; after: boolean }
  | { kind: "orphan" };

interface Block {
  element: Element;
  /** The source lines of the block; undefined when `data-line` is not a number. */
  span: [number, number] | undefined;
}

const spanOf = (element: Element): [number, number] | undefined => {
  const start = Number(element.getAttribute("data-line"));
  if (!Number.isFinite(start)) return undefined;
  const endValue = Number(element.getAttribute("data-end-line"));
  return [start, Number.isFinite(endValue) && endValue >= start ? endValue : start];
};

// A block may carry a thread: not in an open editor or the properties table, not included content
// (it carries the lines of ANOTHER file), not under a skipped ancestor (diagram, chip, math, code).
const eligible = (element: Element): boolean => {
  if (element.closest(EDITING) || element.closest("[data-okf-properties]")) return false;
  if (element.closest("[data-sphinx-preview-included]")) return false;
  const container = element.parentNode as Element | null;
  return !(container && container.nodeType === 1 && container.closest(SKIP));
};

const readBlocks = (document: Document): Block[] => {
  const blocks: Block[] = [];
  document.querySelectorAll("[data-line]").forEach((element) => {
    if (eligible(element)) blocks.push({ element, span: spanOf(element) });
  });
  return blocks;
};

const runOf = (members: Node[]): TextRun => {
  const offsets = new Map<Node, number>();
  let text = "";
  for (const node of members) {
    offsets.set(node, text.length);
    text += node.textContent ?? "";
  }
  return { head: members[0]!, text, offsets, free: text === "" ? [] : [[0, text.length]] };
};

/**
 * The place of every thread, in the order of the threads: an earlier thread takes its text first.
 * `marks` are the highlights now in the page, read as the plain text they wrap.
 */
export function planThreads(
  document: Document,
  threads: readonly PageCommentThread[],
  marks: ReadonlySet<Node>,
): ThreadPlace[] {
  let read: Block[] | undefined;
  const blocks = (): Block[] => read ??= readBlocks(document);

  // The innermost mapped block that covers the line (smallest span; the deeper one on a tie).
  const blockFor = (line: number): Element | undefined => {
    let best: Element | undefined;
    let bestSize = Infinity;
    for (const { element, span } of blocks()) {
      if (!span || line < span[0] || line > span[1]) continue;
      const size = span[1] - span[0];
      if (size <= bestSize) {
        best = element;
        bestSize = size;
      }
    }
    return best;
  };

  const known = new Map<Node, TextRun>(); // by first node: nested blocks share their runs
  const walked = new Map<Element, TextRun[]>();
  const runsOf = (block: Element): TextRun[] => {
    const cached = walked.get(block);
    if (cached) return cached;
    const found: TextRun[] = [];
    const walk = (node: Node): void => {
      let members: Node[] = [];
      const end = (): void => {
        if (members.length === 0) return;
        const run = known.get(members[0]!) ?? runOf(members);
        known.set(run.head, run);
        found.push(run);
        members = [];
      };
      for (let child = node.firstChild; child; child = child.nextSibling) {
        const mark = marks.has(child);
        if (mark || child.nodeType === 3) {
          // Two text nodes side by side stay two: only a highlight joins its neighbours.
          const last = members[members.length - 1];
          if (last && !mark && !marks.has(last)) end();
          members.push(child);
        } else {
          end();
          if (child.nodeType === 1 && !(child as Element).matches(SKIP)) walk(child);
        }
      }
      end();
    };
    if (!block.matches(SKIP)) walk(block);
    walked.set(block, found);
    return found;
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-017
  const highlight = (thread: PageCommentThread): ThreadPlace | undefined => {
    const quote = thread.anchor.quote;
    if (quote === "") return undefined;
    const block = blockFor(thread.anchor.line);
    // The host re-anchored this thread and found no block to trust: do not guess a place here.
    if (!block && thread.orphaned === false) return undefined;
    // No block at the line (the text moved): look for the quote in every eligible block, in order.
    const searched = block ? [block] : blocks().map((candidate) => candidate.element);
    const runs = new Set(searched.flatMap(runsOf));
    const variants = [quote];
    const collapsed = quote.replace(/\s+/gu, " ");
    if (collapsed !== quote) variants.push(collapsed);
    if (!block) {
      // The text moved: place the thread only when the quote is long enough to be meaningful and
      // occurs exactly once; a short or repeated quote would land on an unrelated place.
      if (collapsed.trim().length < MIN_MOVED_QUOTE) return undefined;
      let total = 0;
      for (const run of runs) {
        for (const [from, to] of run.free) {
          const value = run.text.slice(from, to);
          for (const variant of variants) {
            let found = locate(value, variant, 0);
            if (!found) continue;
            while (found) {
              total += 1;
              found = locate(value, variant, found.index + found.length);
            }
            break;
          }
        }
      }
      if (total !== 1) return undefined;
    }
    for (const run of runs) {
      for (const [index, [from, to]] of run.free.entries()) {
        const value = run.text.slice(from, to);
        for (const variant of variants) {
          const found = locate(value, variant, 0);
          if (!found) continue;
          const offset = from + found.index;
          const rest: Array<[number, number]> = [[from, offset], [offset + found.length, to]];
          run.free.splice(index, 1, ...rest.filter(([start, end]) => end > start));
          return { kind: "mark", run, offset, length: found.length };
        }
      }
    }
    return undefined;
  };

  // A badge sits inside the block, or after it when the block cannot take children.
  const badge = (thread: PageCommentThread): ThreadPlace | undefined => {
    const block = blockFor(thread.anchor.line);
    if (!block) return undefined;
    return { kind: "badge", block, after: block.matches(SKIP) || NEXT_TO.has(block.tagName.toUpperCase()) };
  };

  return threads.map((thread) => (thread.orphaned === true ? undefined : highlight(thread) ?? badge(thread))
    ?? { kind: "orphan" });
}
