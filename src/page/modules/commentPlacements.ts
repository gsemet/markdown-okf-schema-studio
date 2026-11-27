import { BADGE, MARK, ORPHAN, planThreads, type TextRun, type ThreadPlace } from "./commentPlan";
import type { PageCommentThread } from "./commentThreadData";

const BADGED = "data-okf-comment-badged";
const AFTER = "data-okf-comment-badge-after";
const RESOLVED = "data-okf-comment-resolved";

type MarkPlace = Extract<ThreadPlace, { kind: "mark" }>;

interface OrphanEntry {
  element: Element;
  quote: Element;
  meta: Element;
}

const byThread = (elements: Element[], attribute: string): Map<string | null, Element> =>
  new Map(elements.map((element) => [element.getAttribute(attribute), element]));

// The element an earlier update made for the thread, given to one thread only.
const take = <T>(from: Map<string | null, T>, id: string): T | undefined => {
  const found = from.get(id);
  from.delete(id);
  return found;
};

// Writes only what differs: an element whose thread did not change is not touched.
const paintResolved = (element: Element, resolved: boolean): void => {
  const shown = element.getAttribute(RESOLVED) !== null;
  if (resolved && !shown) element.setAttribute(RESOLVED, "true");
  else if (!resolved && shown) element.removeAttribute(RESOLVED);
};
const paintAttribute = (element: Element, name: string, value: string): void => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};
const paintText = (element: Element, value: string): void => {
  if (element.textContent !== value) element.textContent = value;
};

const sitsAt = (mark: Element, place: MarkPlace): boolean =>
  place.run.offsets.get(mark) === place.offset && (mark.textContent ?? "").length === place.length
  && mark.firstChild?.nodeType === 3 && !mark.firstChild.nextSibling;

/**
 * The highlights, badges and orphan entries of the review threads in the page. `update` changes
 * what differs between what is there and where the threads belong (commentPlan.ts): the elements of
 * the other threads stay the same elements. `update([])` removes everything and restores the text
 * nodes, so placing from nothing is an update of an empty page.
 */
export function createCommentPlacements(
  document: Document,
  paintMark: (mark: Element) => void,
): {
  /**
   * Places the threads. True when a badge below a block was added, moved or removed: the only
   * change that can move a block of the content.
   */
  update(threads: readonly PageCommentThread[]): boolean;
  marks(): readonly Element[];
  /** The elements that open a thread: highlights, badges, orphan entries. */
  holders(): Element[];
} {
  // What the updates added, so removing it never searches the page (and works after a patch).
  let marks: Element[] = [];
  let badges: Element[] = [];
  let badgedBlocks = new Set<Element>();
  let orphans: { box: Element; title: Element; entries: OrphanEntry[] } | undefined;

  // Puts back the text a mark wrapped and merges it with its neighbouring text nodes. Returns the
  // text node that now holds it.
  const unwrap = (mark: Element): Node | undefined => {
    const parent = mark.parentNode;
    if (!parent) return undefined;
    let merged = document.createTextNode(mark.textContent ?? "");
    parent.replaceChild(merged, mark);
    const before = merged.previousSibling;
    if (before && before.nodeType === 3) {
      before.nodeValue = (before.nodeValue ?? "") + (merged.nodeValue ?? "");
      parent.removeChild(merged);
      merged = before as Text;
    }
    const after = merged.nextSibling;
    if (after && after.nodeType === 3) {
      merged.nodeValue = (merged.nodeValue ?? "") + (after.nodeValue ?? "");
      parent.removeChild(after);
    }
    return merged;
  };

  // Wraps the planned part of a run, which no highlight takes yet, in a new highlight.
  const wrap = (place: MarkPlace, id: string): Element => {
    let node = place.run.head;
    let start = 0;
    while (start + (node.textContent ?? "").length <= place.offset) {
      start += (node.textContent ?? "").length;
      node = node.nextSibling!;
    }
    const value = node.nodeValue ?? "";
    const index = place.offset - start;
    const parent = node.parentNode!;
    const mark = document.createElement("mark");
    mark.setAttribute(MARK, id);
    mark.textContent = value.slice(index, index + place.length);
    if (index === 0) {
      // No empty text node before the mark: removing it then restores the original structure.
      parent.replaceChild(mark, node);
    } else {
      node.nodeValue = value.slice(0, index);
      parent.insertBefore(mark, node.nextSibling);
    }
    const rest = value.slice(index + place.length);
    if (rest !== "") parent.insertBefore(document.createTextNode(rest), mark.nextSibling);
    return mark;
  };

  const updateMarks = (threads: readonly PageCommentThread[], places: ThreadPlace[]): void => {
    const before = byThread(marks, MARK);
    const heads = new Map<Node, TextRun>();
    const wanted = places.flatMap((place, index) => {
      if (place.kind !== "mark") return [];
      heads.set(place.run.head, place.run);
      const thread = threads[index]!;
      const old = before.get(thread.id);
      return [{ place, thread, mark: old && sitsAt(old, place) ? take(before, thread.id) : undefined }];
    });
    const kept = new Set(wanted.map((entry) => entry.mark));
    for (const mark of marks) {
      if (kept.has(mark)) continue;
      const text = unwrap(mark);
      const run = heads.get(mark);
      if (run && text) run.head = text;
    }
    // From the end of each run: a new highlight leaves the text before it in the node it was in.
    for (const entry of [...wanted].sort((a, b) => b.place.offset - a.place.offset)) {
      entry.mark ??= wrap(entry.place, entry.thread.id);
    }
    marks = wanted.map(({ mark, thread }) => {
      paintResolved(mark!, thread.resolved);
      paintMark(mark!);
      return mark!;
    });
  };

  // A badge has no text, so a block keeps its text content (headings, edit offsets); the stylesheet
  // draws it.
  const newBadge = (id: string, after: boolean): Element => {
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute(BADGE, id);
    button.setAttribute("aria-haspopup", "dialog");
    if (after) button.setAttribute(AFTER, "true");
    return button;
  };

  const updateBadges = (threads: readonly PageCommentThread[], places: ThreadPlace[]): boolean => {
    const before = byThread(badges, BADGE);
    const below = new Map<Element, Element[]>();
    const inside = new Map<Element, Element[]>();
    const next: Element[] = [];
    places.forEach((place, index) => {
      if (place.kind !== "badge") return;
      const thread = threads[index]!;
      const old = take(before, thread.id);
      const button = old && (old.getAttribute(AFTER) !== null) === place.after ? old : newBadge(thread.id, place.after);
      paintResolved(button, thread.resolved);
      const count = thread.comments.length;
      paintAttribute(button, "aria-label", `Comment thread, ${count} comment${count === 1 ? "" : "s"}`);
      const side = place.after ? below : inside;
      side.set(place.block, [...(side.get(place.block) ?? []), button]);
      next.push(button);
    });
    let moved = false;
    const kept = new Set(next);
    for (const old of badges) {
      if (kept.has(old)) continue;
      if (old.getAttribute(AFTER) !== null) moved = true;
      old.remove();
    }
    badges = next;
    // Below a block: right after it, the last thread first.
    for (const [block, buttons] of below) {
      const parent = block.parentNode;
      if (!parent) continue;
      let previous: Node = block;
      for (const button of [...buttons].reverse()) {
        if (button.parentNode !== parent || previous.nextSibling !== button) {
          parent.insertBefore(button, previous.nextSibling);
          moved = true;
        }
        previous = button;
      }
    }
    // Inside a block: its last children, in the order of the threads.
    for (const [block, buttons] of inside) {
      paintAttribute(block, BADGED, "true");
      let following: Node | null = null;
      for (const button of [...buttons].reverse()) {
        if (button.parentNode !== block || button.nextSibling !== following) block.insertBefore(button, following);
        following = button;
      }
    }
    for (const block of badgedBlocks) if (!inside.has(block)) block.removeAttribute(BADGED);
    badgedBlocks = new Set(inside.keys());
    return moved;
  };

  const newEntry = (id: string): OrphanEntry => {
    const element = document.createElement("button");
    element.setAttribute("type", "button");
    element.setAttribute(ORPHAN, id);
    element.setAttribute("aria-haspopup", "dialog");
    const quote = document.createElement("span");
    quote.setAttribute("data-okf-orphan-quote", "true");
    const meta = document.createElement("span");
    meta.setAttribute("data-okf-orphan-meta", "true");
    element.appendChild(quote);
    element.appendChild(meta);
    return { element, quote, meta };
  };

  const newBox = (): { box: Element; title: Element; entries: OrphanEntry[] } => {
    const box = document.createElement("div");
    box.setAttribute("data-okf-orphans", "true");
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Orphaned comments");
    const title = document.createElement("div");
    title.setAttribute("data-okf-orphans-title", "true");
    title.textContent = "Orphaned comments";
    box.appendChild(title);
    return { box, title, entries: [] };
  };

  // @implements_req SwRS-MDOKFSTUDIO-REVIEW-028
  // The "Orphaned comments" box: after the content element, outside the HTML a patch replaces. It
  // adds no scroll height of its own where the content ends (see the stylesheet), so the end of
  // the document, the first-element gap and the insert points do not change.
  const updateOrphans = (listed: PageCommentThread[]): void => {
    if (listed.length === 0) {
      orphans?.box.remove();
      orphans = undefined;
      return;
    }
    orphans ??= newBox();
    const { box, title } = orphans;
    const before = new Map<string | null, OrphanEntry>(
      orphans.entries.map((entry) => [entry.element.getAttribute(ORPHAN), entry]));
    const entries = listed.map((thread) => {
      const entry = take(before, thread.id) ?? newEntry(thread.id);
      paintResolved(entry.element, thread.resolved);
      paintText(entry.quote, thread.anchor.quote !== "" ? thread.anchor.quote : "(no quoted text)");
      const first = thread.comments[0];
      const count = thread.comments.length;
      paintText(entry.meta, `${first ? first.author + ": " + first.body.slice(0, 120) : ""}`
        + ` (${count} comment${count === 1 ? "" : "s"}${thread.resolved ? ", resolved" : ""})`);
      return entry;
    });
    const kept = new Set(entries);
    for (const old of orphans.entries) if (!kept.has(old)) old.element.remove();
    orphans.entries = entries;
    let previous: Node = title;
    for (const { element } of entries) {
      if (element.parentNode !== box || previous.nextSibling !== element) box.insertBefore(element, previous.nextSibling);
      previous = element;
    }
    const main = document.getElementById?.("sphinx-myst-preview-content");
    const parent = (main?.parentNode ?? document.body) as Node;
    if (box.parentNode !== parent || (main ? main.nextSibling !== box : box.nextSibling !== null)) {
      parent.insertBefore(box, main ? main.nextSibling : null);
    }
  };

  return {
    // @implements_req SwRS-MDOKFSTUDIO-REVIEW-224
    update(threads) {
      const places = planThreads(document, threads, new Set<Node>(marks));
      updateMarks(threads, places);
      const moved = updateBadges(threads, places);
      updateOrphans(threads.filter((_thread, index) => places[index]!.kind === "orphan"));
      return moved;
    },
    marks: () => marks,
    holders: () => [...marks, ...badges, ...(orphans?.entries.map((entry) => entry.element) ?? [])],
  };
}
