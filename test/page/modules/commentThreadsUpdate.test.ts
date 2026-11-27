/**
 * What the page changes when the host posts the review threads again: only the elements of the
 * threads whose place or shown state differs, with the same page as a fresh one that receives the
 * same list, and a new measure of the page only when a block can have moved.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { registerHostHandlers } from "../../../src/page/features/hostHandlers";
import { installCommentThreads } from "../../../src/page/modules/commentThreads";
import { FakeDocument, FakeElement, FakeText, provideGlobalElement, type FakeNode } from "./fakeDom";

type Thread = Record<string, unknown> & { id: string };

/** The content element is found by its id, and the root carries the hidden comments attribute. */
class PageDocument extends FakeDocument {
  constructor() {
    super();
    this.content.setAttribute("id", "sphinx-myst-preview-content");
  }
  get documentElement(): FakeElement { return this; }
  getElementById(id: string): FakeElement | null {
    return this.querySelectorAll("[id]").find((element) => element.getAttribute("id") === id) ?? null;
  }
}

/** Mapped blocks of every kind the page places a thread on. */
function page(): { document: PageDocument; comments: ReturnType<typeof installCommentThreads> } {
  const document = new PageDocument();
  const first = document.add("p", { "data-line": "1" }, document.content, "alpha beta gamma delta ");
  document.add("em", {}, first, "alpha beta");
  first.appendChild(document.createTextNode(" gamma again, alpha"));
  const quote = document.add("div", { "data-line": "3", "data-end-line": "8" });
  document.add("p", { "data-line": "4" }, quote, "nested paragraph with a few words and words");
  quote.appendChild(document.createTextNode("between the paragraphs "));
  document.add("p", { "data-line": "6" }, quote, "second nested line of text here");
  const list = document.add("ul", { "data-line": "10", "data-end-line": "11" });
  document.add("li", { "data-line": "10" }, list, "list item one");
  document.add("li", { "data-line": "11" }, list, "list item two");
  const pre = document.add("pre", { "data-line": "14" });
  document.add("code", {}, pre, "alpha code");
  document.add("table", { "data-line": "16", "data-end-line": "18" });
  document.add("p", { "data-line": "20" }, document.content, "a sentence that moved somewhere unique in the text");
  const wrapper = document.add("div", { "data-line": "22", "data-end-line": "23" }, document.content, "wrapper words ");
  const inner = document.add("pre", { "data-line": "23" }, wrapper);
  document.add("code", {}, inner, "inner code");
  document.add("footer", {}, document.body, "after the content");
  provideGlobalElement(FakeElement);
  const window = { innerWidth: 800, innerHeight: 600, setTimeout: () => 1, clearTimeout: () => undefined };
  const comments = installCommentThreads(document as never, window as never,
    { reply: () => undefined, resolve: () => undefined, remove: () => undefined });
  return { document, comments };
}

const thread = (id: string, line: number, quote: string, overrides: Record<string, unknown> = {}): Thread => ({
  id,
  anchor: { line, endLine: line, quote, prefix: "", suffix: "" },
  resolved: false,
  createdAt: "2026-11-27T10:00:00Z",
  comments: [{ id: `${id}-1`, author: "Ada", createdAt: "2026-11-27T10:00:00Z", body: `Comment of ${id}` }],
  ...overrides,
});

/** Threads of every placement: highlights, badges inside and below blocks, orphans. */
const POOL: Thread[] = [
  thread("a", 1, "alpha"),
  thread("b", 1, "alpha"),
  thread("c", 1, "beta gamma"),
  thread("d", 1, "gamma delta"),
  thread("e", 1, "alpha beta gamma delta"),
  thread("f", 1, "gamma"),
  thread("g", 4, "words"),
  thread("h", 3, "words"),
  thread("i", 3, "between the paragraphs"),
  thread("j", 6, "second nested"),
  thread("k", 3, "second nested line"),
  thread("l", 10, "list item"),
  thread("m", 11, "item two"),
  thread("n", 10, "not in the list"),
  thread("o", 1, "not in the paragraph"),
  thread("p", 1, ""),
  thread("q", 14, "alpha code"),
  thread("r", 14, "other"),
  thread("s", 16, "cell"),
  thread("t", 16, "row", { resolved: true }),
  thread("u", 99, "moved somewhere unique"),
  thread("v", 99, "words"),
  thread("w", 99, "never written anywhere", { orphaned: false }),
  thread("x", 1, "alpha", { orphaned: true }),
  thread("y", 22, "wrapper words"),
  thread("z", 22, "absent from the wrapper"),
  thread("A", 23, "inner code"),
  thread("B", 1, "again, alpha", { orphaned: false }),
  thread("C", 99, "a sentence that moved"),
  thread("D", 1, "nowhere in the first block"),
];

const pick = (...ids: string[]): Thread[] => ids.map((id) => POOL.find((candidate) => candidate.id === id)!);

/** The page as data: tags, attributes and every text node. */
const dump = (node: FakeNode): unknown => node instanceof FakeText ? node.nodeValue : [
  (node as FakeElement).tagName,
  [...(node as FakeElement).attrs].sort(([a], [b]) => a.localeCompare(b)),
  (node as FakeElement).childNodes.map(dump),
];

const hide = (document: PageDocument, hidden: boolean): void => {
  if (hidden) document.setAttribute("data-sphinx-preview-comments", "off");
  else document.removeAttribute("data-sphinx-preview-comments");
};

/** The same objects, not equal copies. */
const assertSame = (actual: readonly unknown[], expected: readonly unknown[], what: string): void => {
  assert.equal(actual.length, expected.length, what);
  expected.forEach((object, index) => assert.ok(actual[index] === object, `${what} (number ${index + 1})`));
};

/** A fresh page that receives only this list. */
function fromNothing(threads: Thread[], hidden = false): unknown {
  const fresh = page();
  hide(fresh.document, hidden);
  fresh.comments.setThreads(threads);
  return dump(fresh.document);
}

const holders = (document: PageDocument): FakeElement[] => document.querySelectorAll(
  "[data-okf-comment-thread], [data-okf-comment-badge], [data-okf-comment-orphan]");

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S1
test("adding one comment keeps the elements of the other threads and reads the mapped blocks once", () => {
  const { document, comments } = page();
  const shown = pick("a", "c", "g", "j", "l", "n", "q", "x");
  comments.setThreads(shown);
  const before = holders(document);
  assert.equal(before.length, shown.length);
  const places = before.map((element) => element.parentNode);
  const written: string[] = [];
  for (const element of before) {
    const set = element.setAttribute.bind(element);
    element.setAttribute = (name, value) => { written.push(name); set(name, value); };
    element.removeAttribute = (name) => { written.push(name); element.attrs.delete(name); };
  }
  const untouched = document.querySelectorAll("[data-line]").filter((block) => block.getAttribute("data-line") !== "20")
    .map((block) => ({ block, nodes: [...block.childNodes] }));
  let reads = 0;
  const query = document.querySelectorAll.bind(document);
  document.querySelectorAll = (selector) => {
    if (selector === "[data-line]") reads += 1;
    return query(selector);
  };

  comments.setThreads([...shown, thread("new", 20, "somewhere unique")]);

  document.querySelectorAll = query;
  assert.equal(reads, 1, "one update reads the [data-line] blocks once");
  const after = holders(document);
  assert.equal(after.length, shown.length + 1);
  before.forEach((element, index) => {
    assert.ok(after.includes(element), `the element of thread ${index} is the same element`);
    assert.ok(element.parentNode === places[index], `the element of thread ${index} stays in its place`);
  });
  assert.deepEqual(written, [], "no attribute of an unchanged thread is written");
  for (const { block, nodes } of untouched) {
    assertSame(block.childNodes, nodes, "the other blocks keep their nodes");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S1
test("a reply, a resolve and a delete keep the elements of the threads that did not change", () => {
  const { document, comments } = page();
  const [a, g, x, n] = pick("a", "g", "x", "n") as [Thread, Thread, Thread, Thread];
  comments.setThreads([a, g, x, n]);
  const [markA, markG, badgeN, entryX] = holders(document);
  const replied = { ...a, comments: [...(a.comments as unknown[]), { id: "r", author: "Bo", createdAt: "", body: "Yes" }] };
  comments.setThreads([replied, { ...g, resolved: true }, x, n]);
  assertSame(holders(document), [markA, markG, badgeN, entryX], "after a reply and a resolve");
  assert.equal(markG!.getAttribute("data-okf-comment-resolved"), "true");
  comments.setThreads([x, n]);
  assertSame(holders(document), [badgeN, entryX], "after two threads are deleted");
});

const SEQUENCES: Array<{ name: string; lists: Thread[][] }> = [
  { name: "two threads in one block, the first deleted", lists: [pick("a", "b"), pick("b"), pick("a", "b")] },
  { name: "overlapping quotes", lists: [pick("c", "d", "e"), pick("d", "e"), pick("e"), pick("e", "c", "d", "f")] },
  { name: "nested blocks", lists: [pick("g", "h", "i", "j", "k"), pick("h", "i", "k"), pick("k", "j", "h", "g")] },
  {
    name: "a badge becomes a highlight and a highlight a badge",
    lists: [[{ ...pick("a")[0]!, anchor: { line: 1, quote: "absent" } }], pick("a"), [{ ...pick("a")[0]!, orphaned: true }]],
  },
  { name: "several badges below one block", lists: [pick("q", "r"), pick("q", "r", "s", "t"), pick("r", "t"), pick("t", "r")] },
  { name: "badges below a nested block and inside the block around it", lists: [pick("z"), pick("z", "A"), pick("A", "z", "y"), pick("A"), pick("z")] },
  { name: "the last badge of a block removed", lists: [pick("n", "o"), pick("o"), []] },
  { name: "several badges inside one block change order", lists: [pick("o", "p"), pick("p", "o"), pick("D", "p", "o"), pick("o", "D")] },
  { name: "orphan box order and removal", lists: [pick("x", "w", "v"), pick("w", "v"), pick("v", "x", "w"), pick("a"), pick("x")] },
  { name: "an orphan placed after a delete", lists: [[...pick("u"), thread("copy", 20, "moved somewhere unique")], pick("u"), pick("C", "u")] },
  { name: "an orphan resolved", lists: [pick("x"), [{ ...pick("x")[0]!, resolved: true }], pick("x")] },
  { name: "one id twice", lists: [[...pick("a"), ...pick("a"), ...pick("n", "n", "x", "x")], pick("a", "n", "x"), [...pick("x", "x")]] },
  { name: "text before and after a highlight", lists: [pick("f"), pick("a", "f"), pick("f", "B"), pick("B", "c", "a"), []] },
];

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S2
for (const { name, lists } of SEQUENCES) {
  test(`updated in place, the page is the page of a fresh render: ${name}`, () => {
    for (const hidden of [false, true]) {
      const { document, comments } = page();
      hide(document, hidden);
      lists.forEach((list, step) => {
        comments.setThreads(list);
        assert.deepEqual(dump(document), fromNothing(list, hidden), `list ${step + 1}, comments ${hidden ? "hidden" : "shown"}`);
      });
      comments.apply();
      assert.deepEqual(dump(document), fromNothing(lists.at(-1)!, hidden), "placed again after a content change");
    }
  });
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S2
test("updated in place, the page is the page of a fresh render: seeded random lists", () => {
  let seed = 517;
  const random = (below: number): number => {
    seed = (seed * 48271) % 2147483647;
    return seed % below;
  };
  for (let run = 0; run < 250; run += 1) {
    const { document, comments } = page();
    let list: Thread[] = [];
    let hidden = false;
    for (let step = 0; step < 14; step += 1) {
      const at = random(list.length || 1);
      const change = list.length < 4 ? 0 : random(8);
      const candidate = POOL[random(POOL.length)]!;
      if (change <= 1) {
        // Created: at the end, as the host appends it, or anywhere, as a file edited by hand.
        if (!list.some((one) => one.id === candidate.id)) list.splice(change === 0 ? list.length : at, 0, candidate);
      } else if (change === 2) list.splice(at, 1);
      else if (change === 3) list = list.map((one, index) => index === at ? { ...one, resolved: !one.resolved } : one);
      else if (change === 4) {
        list = list.map((one, index) => index === at
          ? { ...one, comments: [...(one.comments as unknown[]), { id: `${step}`, author: "Bo", body: "Reply" }] } : one);
      } else if (change === 5) {
        // Re-anchored by the host: another line and quote, or another verdict.
        list = list.map((one, index) => index === at ? { ...candidate, id: one.id } : one);
      } else if (change === 6) list = [...list.slice(at), ...list.slice(0, at)];
      else {
        hidden = !hidden;
        hide(document, hidden);
        comments.visibilityChanged();
      }
      comments.setThreads(list);
      assert.deepEqual(dump(document), fromNothing(list, hidden),
        `run ${run}, step ${step}: ${JSON.stringify(list.map((one) => [one.id, one.anchor]))}`);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S2
test("an update keeps two text nodes side by side apart, as placing from nothing does", () => {
  const { document, comments } = page();
  const block = document.add("p", { "data-line": "30" }, document.content, "split in ");
  const second = block.appendChild(document.createTextNode("two text nodes"));
  const inSecond = thread("second", 30, "nodes");
  comments.setThreads([inSecond]);
  comments.setThreads([inSecond, thread("across", 30, "in two"), thread("first", 30, "split")]);
  assert.deepEqual(holders(document).map((element) => [element.tagName, element.textContent]),
    [["mark", "split"], ["mark", "nodes"], ["button", ""]], "a quote is found inside one text node only");
  comments.setThreads([]);
  assert.deepEqual(block.childNodes.map((node) => (node as FakeText).nodeValue), ["split in ", "two text nodes"]);
  assert.ok(block.childNodes[1] === second);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S2
test("an update repairs what changed in the page since the last one", () => {
  const list = pick("a", "g", "n", "q", "y", "z", "x");
  const { document, comments } = page();
  const fresh = page();
  comments.setThreads(list);
  // A block editor opens on one block, and the content of another is written again.
  const change = (target: PageDocument): void => {
    const blocks = target.querySelectorAll("[data-line]");
    blocks.find((block) => block.getAttribute("data-line") === "4")!.setAttribute("data-sphinx-preview-editing", "true");
    blocks.find((block) => block.getAttribute("data-line") === "1")!.textContent = "alpha rewritten";
  };
  change(document);
  change(fresh.document);
  document.querySelector("[data-okf-comment-badge]")!.remove();
  document.querySelector("[data-okf-orphans]")!.remove();
  comments.setThreads(list);
  fresh.comments.setThreads(list);
  assert.deepEqual(dump(document), dump(fresh.document));
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S3
test("an open popover keeps its draft and its Delete question when the threads are posted again", () => {
  for (const id of ["a", "n", "x"]) {
    const { document, comments } = page();
    comments.setThreads(pick("a", "n", "x"));
    assert.equal(comments.openThread(id), true);
    (document.querySelector("[data-okf-comment-reply-input]") as unknown as { value: string }).value = "half a reply";
    document.querySelector("[data-okf-comment-delete]")!.fire("click");
    assert.ok(document.querySelector("[data-okf-comment-confirm]"), "the question is asked");
    comments.setThreads([...pick("a", "n", "x"), ...pick("g")]);
    const popovers = document.querySelectorAll("[data-okf-comment-popover]");
    assert.equal(popovers.length, 1);
    assert.equal(popovers[0]!.getAttribute("data-okf-comment-popover"), id);
    assert.equal((document.querySelector("[data-okf-comment-reply-input]") as unknown as { value: string }).value, "half a reply");
    assert.ok(document.querySelector("[data-okf-comment-confirm]"), "the question stays");
    comments.setThreads(pick("g"));
    assert.equal(document.querySelectorAll("[data-okf-comment-popover]").length, 0, "the thread is gone");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-224#S4
test("the host's threads measure the page again only when a badge below a block changes", () => {
  const { document, comments } = page();
  let receive: ((message: { threads: unknown }) => void) | undefined;
  let measures = 0;
  registerHostHandlers({
    hostMessages: { on: (type: string, handler: typeof receive) => { if (type === "previewComments") receive = handler; } },
    parts: { commentThreads: comments },
    scroll: { measure: () => { measures += 1; } },
  } as never);
  const measured = (threads: Thread[]): number => {
    measures = 0;
    receive!({ threads });
    return measures;
  };
  assert.equal(measured(pick("a", "n", "x")), 0, "a highlight, a badge inside a block and an orphan move nothing");
  assert.equal(measured(pick("a", "n", "x", "g")), 0, "one highlight more");
  assert.equal(measured([...pick("a", "n"), { ...pick("g")[0]!, resolved: true }]), 0, "resolved, orphan gone");
  assert.equal(measured(pick("a", "n", "q")), 1, "a badge below a block added");
  assert.equal(measured(pick("a", "n", "q")), 0, "the same list again");
  assert.equal(measured(pick("a", "n", "q", "g")), 0, "a highlight added beside it");
  assert.equal(measured(pick("a", "n", "q", "r", "g")), 1, "a second badge below the block");
  assert.equal(measured(pick("a", "n", "r", "q", "g")), 1, "the two badges change places");
  assert.equal(measured([...pick("a", "n"), { ...pick("r")[0]!, anchor: { line: 16, quote: "other" } }, ...pick("q", "g")]), 1,
    "a badge moved to another block");
  assert.equal(measured(pick("a", "n", "q", "g")), 1, "a badge below a block removed");
  hide(document, true);
  assert.equal(measured(pick("a", "n", "q", "r", "g")), 0, "hidden comments take no room");
  assert.equal(measured(pick("a")), 0);
});
