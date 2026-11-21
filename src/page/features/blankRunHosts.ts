/**
 * Where the blank-lines block of a run goes on the page: inside the container that holds the run (a
 * list item, a quote, an alert, an admonition, a context-tag panel, a figure, a card, a grid item, a
 * definition, a footnote), or after the top-level block above it. The rules read only the mapped
 * blocks and the page-only attributes of the render; they never change the page.
 */

import { MAPPINGS_SELECTOR, type PageRuntime } from "./pageRuntime";

const ALERT_ATTRIBUTE = "data-okf-github-alert";
const DEFINITION_LINE_ATTRIBUTE = "data-okf-definition-line";
const FOOTNOTE_LINE_ATTRIBUTE = "data-okf-footnote-line";
const FOLDED_ATTRIBUTE = "data-okf-folded";
const PROPERTIES_ATTRIBUTE = "data-okf-properties";

/** The lines of a run. */
export interface RunLines {
  line: number;
  endLine: number;
}

/** The container that shows the block of a run, and the line the host reads its indent from. */
export interface Host {
  container: HTMLElement;
  /** A run inside a list item: the item's first line. */
  itemLine?: number;
  /** A run inside a directive, a panel, a definition or a footnote: its container line. */
  containerLine?: number;
  /** The top-level block that holds the run; none for a footnote, which no block holds. */
  holder?: HTMLElement;
}

/** Where the block of a run goes: inside a container, after the block above, or nowhere. */
export type Spot = { host: Host } | { above: HTMLElement | undefined } | undefined;

type Kind = "list" | "quote" | "quoteDirective" | "alert" | "directive" | "grid" | "definitions";

export const hasClass = (element: Element, name: string): boolean =>
  String(element.className ?? "").split(" ").includes(name);

/** The source line of an element, or of its first mapped descendant; NaN for an element with none. */
export const lineOf = (element: Element): number => {
  const own = element.getAttribute("data-sphinx-source-line");
  const line = Number(own ?? element.querySelectorAll(MAPPINGS_SELECTOR)[0]?.getAttribute("data-sphinx-source-line"));
  return Number.isSafeInteger(line) && line >= 1 ? line : Number.NaN;
};

const isQuoteLike = (kind: Kind | undefined): boolean =>
  kind === "quote" || kind === "alert" || kind === "quoteDirective";

/** What an element of the page is as a container of Markdown blocks; undefined for any other element. */
function kindOf(element: HTMLElement): Kind | undefined {
  switch (element.tagName) {
    case "UL":
    case "OL":
    case "LI":
      return "list";
    case "BLOCKQUOTE":
      return element.parentElement?.tagName === "FIGURE" ? "quoteDirective" : "quote";
    case "DL":
      return "definitions";
    case "FIGURE":
      return "directive";
    case "ASIDE":
    case "DETAILS":
      if (element.getAttribute(ALERT_ATTRIBUTE) !== null) return "alert";
      return hasClass(element, "admonition") ? "directive" : undefined;
    case "DIV":
      if (hasClass(element, "myst-grid")) return "grid";
      return hasClass(element, "myst-card") || hasClass(element, "myst-grid-item") ? "directive" : undefined;
    default:
      return undefined;
  }
}

/** The footnote `li` that holds `element`, if any. */
function footnoteOf(element: Element | undefined): HTMLElement | undefined {
  for (let parent = element?.parentElement as HTMLElement | null | undefined; parent; parent = parent.parentElement) {
    if (parent.tagName === "LI" && parent.getAttribute(FOOTNOTE_LINE_ATTRIBUTE) !== null) return parent;
  }
  return undefined;
}

const footnoteLine = (item: Element): number => Number(item.getAttribute(FOOTNOTE_LINE_ATTRIBUTE));

/** True for a top-level block of the body: not the properties section, not a footnote's block. */
const isBody = (block: HTMLElement): boolean =>
  block.getAttribute(PROPERTIES_ATTRIBUTE) === null && footnoteOf(block) === undefined;

/**
 * The block of the body right before a run (the one with the largest line before it, found by
 * comparing lines), else the properties section.
 */
function aboveOf(rt: PageRuntime, run: RunLines, blocks: readonly HTMLElement[]): HTMLElement | undefined {
  let above: HTMLElement | undefined;
  let aboveLine = 0;
  for (const block of blocks) {
    const { line } = rt.blocks.blockRange(block);
    if (isBody(block) && line < run.line && line >= aboveLine) {
      above = block;
      aboveLine = line;
    }
  }
  return above ?? blocks.find((block) => block.getAttribute(PROPERTIES_ATTRIBUTE) !== null);
}

/** The block of the body right after a run (the one with the smallest line after it). */
function belowOf(rt: PageRuntime, run: RunLines, blocks: readonly HTMLElement[]): HTMLElement | undefined {
  let below: HTMLElement | undefined;
  let belowLine = Number.POSITIVE_INFINITY;
  for (const block of blocks) {
    const { line } = rt.blocks.blockRange(block);
    if (isBody(block) && line > run.endLine && line < belowLine) {
      below = block;
      belowLine = line;
    }
  }
  return below;
}

/** The mapped block, footnote blocks included, nearest to a run in `direction`, by line. */
function nearestMapped(rt: PageRuntime, run: RunLines, blocks: readonly HTMLElement[], direction: -1 | 1): HTMLElement | undefined {
  let found: HTMLElement | undefined;
  let foundLine = direction < 0 ? 0 : Number.POSITIVE_INFINITY;
  for (const block of blocks) {
    if (block.getAttribute(PROPERTIES_ATTRIBUTE) !== null) continue;
    const { line } = rt.blocks.blockRange(block);
    if (direction < 0 ? line < run.line && line >= foundLine : line > run.endLine && line < foundLine) {
      found = block;
      foundLine = line;
    }
  }
  return found;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/** The footnote that holds a run no top-level block holds (a body paragraph, or the gap between two). */
function footnoteHost(rt: PageRuntime, run: RunLines, blocks: readonly HTMLElement[]): Host | undefined {
  const inAbove = footnoteOf(nearestMapped(rt, run, blocks, -1));
  const inBelow = footnoteOf(nearestMapped(rt, run, blocks, 1));
  const host = (container: HTMLElement): Host => ({ container, containerLine: footnoteLine(container) });
  if (inBelow && footnoteLine(inBelow) < run.line) return host(inBelow);
  if (inAbove && inBelow && inAbove !== inBelow && footnoteLine(inBelow) > run.endLine) return host(inAbove);
  return undefined;
}

/** Whether `element` holds a run; a quote or an alert also holds one on its first or last line. */
function holds(rt: PageRuntime, element: HTMLElement, run: RunLines): boolean {
  const range = rt.blocks.blockRange(element);
  return isQuoteLike(kindOf(element))
    ? range.line <= run.line && run.endLine <= range.endLine
    : range.line < run.line && run.endLine < range.endLine;
}

/** The holders of a run, from the top-level block down; undefined when one of them is not a container. */
function chainOf(rt: PageRuntime, top: HTMLElement, run: RunLines): HTMLElement[] | undefined {
  const chain: HTMLElement[] = [top];
  const walk = (parent: HTMLElement): void => {
    for (const child of rt.blocks.mappedChildren(parent)) {
      if (!holds(rt, child, run)) continue;
      chain.push(child);
      walk(child);
    }
  };
  walk(top);
  const closed = (holder: HTMLElement): boolean => holder.tagName === "DETAILS" && holder.getAttribute("open") === null;
  const pure = chain.every((holder) =>
    !rt.blocks.isIncludedBlock(holder) && kindOf(holder) !== undefined && !closed(holder));
  return pure ? chain : undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
// @implements_req SwRS-MDOKFSTUDIO-BLOCK-268
/** The host of a run held by the top-level block `top`, or undefined when the run shows nothing. */
function heldHost(rt: PageRuntime, top: HTMLElement, run: RunLines, blocks: readonly HTMLElement[]): Host | undefined {
  if (top.getAttribute(FOLDED_ATTRIBUTE) !== null || rt.blocks.isIncludedBlock(top)) return undefined;
  // A footnote written inside a container has its paragraphs at the end of the page: nothing there.
  if (footnoteOf(nearestMapped(rt, run, blocks, -1)) && footnoteOf(nearestMapped(rt, run, blocks, 1))) return undefined;
  const chain = chainOf(rt, top, run);
  if (!chain) return undefined;
  const deepest = chain[chain.length - 1];
  const kind = kindOf(deepest);
  const own = (): number => rt.blocks.blockRange(deepest).line;
  if (kind === "grid") return undefined;
  if (kind === "list") {
    const item = deepest.tagName === "LI" ? deepest
      : rt.blocks.mappedChildren(deepest).filter((child) =>
        child.tagName === "LI" && rt.blocks.blockRange(child).line < run.line).pop();
    return item && lineOf(item) < run.line ? { container: item, itemLine: lineOf(item), holder: top } : undefined;
  }
  if (kind === "definitions") {
    const entry = (Array.from(deepest.children ?? []) as HTMLElement[]).filter((child) =>
      child.tagName === "DD" && Number(child.getAttribute(DEFINITION_LINE_ATTRIBUTE)) < run.line).pop();
    const line = Number(entry?.getAttribute(DEFINITION_LINE_ATTRIBUTE));
    return entry && Number.isSafeInteger(line) ? { container: entry, containerLine: line, holder: top } : undefined;
  }
  if (kind === "quote" || kind === "alert") return { container: deepest, holder: top };
  return own() < run.line ? { container: deepest, containerLine: own(), holder: top } : undefined;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-266
/**
 * Where the block of `run` goes. `blocks` are the top-level mapped blocks of the page. A run held by a
 * container shows inside it; any other run shows after the block above it, unless that block or the
 * one below is folded.
 */
export function locateRun(rt: PageRuntime, run: RunLines, blocks: readonly HTMLElement[]): Spot {
  const top = blocks.find((block) => isBody(block) && holds(rt, block, run));
  if (top) {
    const host = heldHost(rt, top, run, blocks);
    return host ? { host } : undefined;
  }
  const footnote = footnoteHost(rt, run, blocks);
  if (footnote) return { host: footnote };
  const above = aboveOf(rt, run, blocks);
  const below = belowOf(rt, run, blocks);
  return [above, below].some((block) => block?.getAttribute(FOLDED_ATTRIBUTE) != null) ? undefined : { above };
}

/**
 * Puts `block` inside the host container: right after its last child that starts before the run, else
 * right before its first child that starts after it, else last. A card's paragraphs sit in an unmapped
 * body, so there the mapped children are used. `skip` names the children that are not the page's (the
 * blank-lines blocks, the editor frame, the insertion bars).
 */
export function placeInHost(
  rt: PageRuntime,
  block: HTMLElement,
  host: Host,
  run: RunLines,
  skip: (child: HTMLElement) => boolean,
): void {
  const { container } = host;
  const children = (hasClass(container, "myst-card")
    ? rt.blocks.mappedChildren(container)
    : (Array.from(container.children) as HTMLElement[]).filter((child) => !skip(child)));
  const anchor = children.filter((child) => lineOf(child) < run.line).pop();
  if (anchor) {
    if (anchor.nextElementSibling !== block) anchor.insertAdjacentElement("afterend", block);
    return;
  }
  const after = children.find((child) => lineOf(child) > run.endLine);
  if (after) after.insertAdjacentElement("beforebegin", block);
  else container.appendChild(block);
}
