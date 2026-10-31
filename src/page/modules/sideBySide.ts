import { baseSpanOf, spanChanged, type LineHunk, type LineSpan } from "../../core/mapping/lineDiff";
import { diffSegments } from "../../core/mapping/wordDiff";

const CONTENT_ID = "sphinx-myst-preview-content";
const CARD = "data-okf-sbs-card";
const REPLACED = "data-okf-sbs-replaced";
/** Content the diff never touches: open editors, included files, cards already made. */
const EXCLUDED = "[data-sphinx-preview-block-editor], [data-sphinx-preview-editing], [data-sphinx-preview-included], [data-okf-sbs-card]";
/** Parts of a block that cannot stand alone in a card: the whole list or table is the block. */
const PARTS = new Set(["LI", "TR", "TD", "TH", "THEAD", "TBODY", "TFOOT", "DT", "DD", "CAPTION"]);
/** Text the word diff leaves out: it is not text a reader reads. */
const NOT_TEXT = "svg, script, style, math, .katex-mathml";
/** Attributes of a rendered block that tie it to the page or to the source: the cards carry none. */
const PAGE_ATTRIBUTES = [
  "id", "tabindex", "data-line", "data-end-line", "data-sphinx-source-file", "data-sphinx-source-line",
  "data-sphinx-source-end-line", "data-sphinx-preview-document", "data-sphinx-preview-block",
  "data-sphinx-preview-changed", REPLACED,
];

export interface SideBySideContext {
  documentId: string;
  revision: number;
  requestId: number;
}

interface Baseline {
  revision: number;
  hunks: readonly LineHunk[];
  content: DocumentFragment;
}

function spanOf(element: Element): LineSpan | undefined {
  let start = Infinity;
  let end = -Infinity;
  const take = (node: Element): void => {
    const first = Number(node.getAttribute("data-line"));
    if (!Number.isSafeInteger(first) || first < 1) return;
    const last = Number(node.getAttribute("data-end-line"));
    start = Math.min(start, first);
    end = Math.max(end, Number.isSafeInteger(last) && last >= first ? last : first);
  };
  take(element);
  element.querySelectorAll("[data-line]").forEach(take);
  return end >= start ? { start, end } : undefined;
}

/** The block a mapped element belongs to as a card shows it: a list item is its whole list. */
function lift(element: Element): Element {
  let node = element;
  const parent = node.parentElement;
  if (node.tagName === "CODE" && parent && parent.tagName === "PRE") node = parent;
  for (let up = node.parentElement; up && (PARTS.has(node.tagName) || PARTS.has(up.tagName)); up = node.parentElement) {
    node = up;
  }
  return node;
}

/**
 * The blocks of `root` whose lines satisfy `keep`: the innermost mapped elements that do, each lifted to
 * its block, without one inside another.
 */
function blocksOf(root: ParentNode, keep: (span: LineSpan) => boolean): Element[] {
  const candidates: Element[] = [];
  root.querySelectorAll("[data-line]").forEach((element) => {
    const span = spanOf(element);
    if (span && keep(span) && !element.closest(EXCLUDED)) candidates.push(element);
  });
  const outer = new Set<Element>();
  for (const element of candidates) {
    for (let node = element.parentElement; node; node = node.parentElement) outer.add(node);
  }
  const lifted = new Set<Element>();
  for (const element of candidates) {
    if (!outer.has(element)) lifted.add(lift(element));
  }
  return Array.from(lifted).filter((element) => {
    for (let node = element.parentElement; node; node = node.parentElement) if (lifted.has(node)) return false;
    return true;
  });
}

/** A copy of a rendered block for a card: no id, no source mapping, nothing the page binds to. */
function copyOf(element: Element): Element {
  const copy = element.cloneNode(true) as Element;
  const strip = (node: Element): void => {
    for (const name of PAGE_ATTRIBUTES) node.removeAttribute(name);
  };
  strip(copy);
  copy.querySelectorAll("*").forEach(strip);
  return copy;
}

function textNodesOf(document: Document, roots: readonly Element[]): Text[] {
  const nodes: Text[] = [];
  for (const root of roots) {
    const walker = document.createTreeWalker(root, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = (node as Text).parentElement;
      if (parent && !parent.closest(NOT_TEXT)) nodes.push(node as Text);
    }
  }
  return nodes;
}

/** Wraps the character ranges of a text node in `<span data-okf-sbs-word>`. */
function markWords(document: Document, node: Text, ranges: readonly { start: number; end: number }[], kind: string): void {
  if (ranges.length === 0 || !node.parentNode) return;
  const text = node.data;
  const fragment = document.createDocumentFragment();
  let position = 0;
  for (const range of ranges) {
    if (range.start > position) fragment.appendChild(document.createTextNode(text.slice(position, range.start)));
    const word = document.createElement("span");
    word.setAttribute("data-okf-sbs-word", kind);
    word.textContent = text.slice(range.start, range.end);
    fragment.appendChild(word);
    position = range.end;
  }
  if (position < text.length) fragment.appendChild(document.createTextNode(text.slice(position)));
  node.parentNode.replaceChild(fragment, node);
}

/**
 * The side-by-side diff of changed blocks (read mode). The toolbar button turns it on; the host then
 * sends the text at the last commit rendered like the page (`setBaseline`) with the line hunks
 * between it and the shown text. Each block that changed is replaced by a card, which holds the
 * block as it was on the left and as it is on the right, with the removed and added words marked;
 * an added block has an empty left side and a removed block comes back with an empty right side.
 * The original blocks stay in the page, hidden by CSS while their card shows, so the source mapping,
 * the green bars and a content patch work as before. The state is the attribute
 * `data-sphinx-preview-sbs` ("on" / "off") on `<html>`, which the CSS follows. The button is
 * disabled in edit mode, where no card is made.
 */
export function installSideBySide(
  document: Document,
  vscode: { postMessage(message: unknown): void },
  context: SideBySideContext,
  onLayoutChange: () => void,
): {
  setBaseline(message: { html: string; hunks: readonly LineHunk[]; revision: number }): void;
  apply(): void;
  sync(): void;
  on(): boolean;
} {
  const button = document.querySelector("[data-sphinx-preview-sbs-toggle]");
  let on = false;
  let baseline: Baseline | undefined;

  const editing = (): boolean => document.documentElement.getAttribute("data-sphinx-preview-edit-mode") === "on";

  // What the diff put in the page, so taking it back never searches the page (and works after a patch).
  let cards: Element[] = [];
  let replaced: Element[] = [];

  const clear = (): boolean => {
    const had = cards.length > 0 || replaced.length > 0;
    cards.forEach((card) => card.remove());
    replaced.forEach((element) => element.removeAttribute(REPLACED));
    cards = [];
    replaced = [];
    return had;
  };

  const side = (kind: "base" | "current", blocks: readonly Element[]): HTMLElement => {
    const element = document.createElement("div");
    element.setAttribute("data-okf-sbs-side", kind);
    element.setAttribute("data-okf-sbs-label", kind === "base" ? "Last commit" : "Now");
    for (const block of blocks) element.appendChild(copyOf(block));
    return element;
  };

  const card = (kind: "changed" | "added" | "removed", before: readonly Element[], after: readonly Element[]): HTMLElement => {
    const element = document.createElement("div");
    element.setAttribute(CARD, kind);
    element.setAttribute("role", "group");
    element.setAttribute("aria-label", "Change since the last commit: the last commit on the left, now on the right");
    const left = side("base", before);
    const right = side("current", after);
    element.appendChild(left);
    element.appendChild(right);
    if (before.length > 0 && after.length > 0) {
      const leftNodes = textNodesOf(document, Array.from(left.children));
      const rightNodes = textNodesOf(document, Array.from(right.children));
      const diff = diffSegments(leftNodes.map((node) => node.data), rightNodes.map((node) => node.data));
      leftNodes.forEach((node, index) => markWords(document, node, diff.removed[index], "removed"));
      rightNodes.forEach((node, index) => markWords(document, node, diff.added[index], "added"));
    }
    return element;
  };

  const render = (): void => {
    const main = document.getElementById(CONTENT_ID);
    if (!on || !main || editing() || !baseline || baseline.revision !== context.revision
      || baseline.hunks.length === 0) return;
    const { hunks, content } = baseline;
    const cardOf = new Map<Element, HTMLElement>();
    const changed = blocksOf(main, (span) => spanChanged(span, hunks));
    const spans: LineSpan[] = [];
    for (const block of changed) {
      const span = spanOf(block);
      if (!span) continue;
      spans.push(span);
      const base = baseSpanOf(span, hunks);
      const before = base.end >= base.start
        ? blocksOf(content, (other) => other.start <= base.end && other.end >= base.start)
        : [];
      const element = card(before.length === 0 ? "added" : "changed", before, [block]);
      block.parentNode?.insertBefore(element, block);
      block.setAttribute(REPLACED, "");
      replaced.push(block);
      cards.push(element);
      cardOf.set(block, element);
    }
    // Removed blocks come back where they were, unless a changed block holds the removal.
    for (const hunk of hunks) {
      if (hunk.end >= hunk.start || hunk.baseEnd < hunk.baseStart) continue;
      if (spans.some((span) => span.start < hunk.start && hunk.start <= span.end)) continue;
      const before = blocksOf(content, (other) => other.start <= hunk.baseEnd && other.end >= hunk.baseStart);
      if (before.length === 0) continue;
      const next = Array.from(main.querySelectorAll("[data-line]")).find((element) =>
        Number(element.getAttribute("data-line")) >= hunk.start && !element.closest(EXCLUDED));
      const anchor = next ? lift(next) : undefined;
      const element = card("removed", before, []);
      const target = anchor ? cardOf.get(anchor) ?? anchor : undefined;
      if (target?.parentNode) target.parentNode.insertBefore(element, target);
      else main.appendChild(element);
      cards.push(element);
    }
  };

  const apply = (): void => {
    const hadCards = clear();
    render();
    if (hadCards || cards.length > 0) onLayoutChange();
  };

  const label = (): string => editing()
    ? "Side-by-side changes (not available in edit mode)"
    : on ? "Hide side-by-side changes since last commit" : "Show side-by-side changes since last commit";

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-008
  const paint = (): void => {
    document.documentElement.setAttribute("data-sphinx-preview-sbs", on ? "on" : "off");
    if (button) {
      const text = label();
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.setAttribute("aria-label", text);
      button.setAttribute("title", text);
      button.setAttribute("data-tooltip", text);
      if (editing()) button.setAttribute("disabled", "");
      else button.removeAttribute("disabled");
    }
  };

  const sync = (): void => {
    paint();
    apply();
  };

  const post = (): void => vscode.postMessage({
    type: "previewSideBySideChanged",
    documentId: context.documentId,
    revision: context.revision,
    requestId: context.requestId,
    on,
  });

  paint();
  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-008
  button?.addEventListener("click", () => {
    if (editing()) return;
    on = !on;
    sync();
    post();
  });

  return {
    // @implements_req SwRS-MDOKFSTUDIO-REVIEW-009
    setBaseline(message) {
      if (!on) {
        // A reloaded page starts with the diff off while the host still sends it: tell the host.
        post();
        return;
      }
      const template = document.createElement("template");
      template.innerHTML = message.html;
      baseline = { revision: message.revision, hunks: message.hunks, content: template.content };
      apply();
    },
    apply,
    sync,
    on: () => on,
  };
}
