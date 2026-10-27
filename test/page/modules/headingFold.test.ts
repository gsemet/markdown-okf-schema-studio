import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installHeadingFold } from "../../../src/page/modules/headingFold";
import { FakeDocument, FakeElement, provideGlobalElement } from "./fakeDom";

/** The fake element with the parts of the DOM the module reads. */
class Node extends FakeElement {
  top = 0;
  get children(): Node[] { return this.childNodes.filter((child): child is Node => child instanceof FakeElement) as Node[]; }
  get parentElement(): Node | null { return this.parentNode as Node | null; }
  getBoundingClientRect() { return { left: 0, top: this.top, right: 10, bottom: this.top + 10, width: 10, height: 10 }; }
}
provideGlobalElement(FakeElement);

class Page extends FakeDocument {
  activeElement: Node | null = null;
  constructor() {
    super();
    this.content.remove();
    this.content = new Node("MAIN");
    this.body.appendChild(this.content);
    this.content.setAttribute("id", "sphinx-myst-preview-content");
    this.toolbarButton.setAttribute("data-sphinx-preview-fold-toggle", "");
  }
  toolbarButton = new Node("button");
  createElement(tag: string) { const element = new Node(tag.toUpperCase()); element.ownerDocument = this; return element; }
  getElementById(id: string) { return id === "sphinx-myst-preview-content" ? this.content : null; }
  querySelector(selector: string) {
    return selector === "[data-sphinx-preview-fold-toggle]" ? this.toolbarButton : super.querySelector(selector);
  }
  block(tag: string, text: string): Node {
    const element = this.createElement(tag) as Node;
    element.setAttribute("data-text", text);
    element.textContent = text;
    this.content.appendChild(element);
    return element;
  }
}

const clickButton = (page: Page): void => {
  for (const listener of page.toolbarButton.listeners.get("click") ?? []) listener({});
};

/** A page: h1 A, p, h2 B, p, p, h3 C, p, h2 D, p. */
function setup(options: { state?: Record<string, unknown>; busy?: boolean } = {}) {
  const page = new Page();
  const blocks = [
    page.block("H1", "A"), page.block("P", "a1"), page.block("H2", "B"), page.block("P", "b1"),
    page.block("P", "b2"), page.block("H3", "C"), page.block("P", "c1"), page.block("H2", "D"),
    page.block("P", "d1"),
  ];
  let state = options.state;
  const windowListeners = new Map<string, Array<(event: any) => void>>();
  const window = { addEventListener: (type: string, listener: (event: any) => void) => {
    windowListeners.set(type, [...(windowListeners.get(type) ?? []), listener]);
  } };
  const layouts: number[] = [];
  const fold = installHeadingFold(page as never, window as never, {
    getState: () => state,
    setState: (next: unknown) => { state = next as Record<string, unknown>; },
  }, { documentId: "file:///a.md" }, {
    readingLine: () => 0,
    onLayoutChange: () => layouts.push(1),
    busy: () => options.busy === true,
  });
  fold.apply();
  const hidden = () => blocks.map((block) => block.getAttribute("hidden") === "until-found");
  const toggleOf = (heading: Node) => heading.children.find((child) => child.hasAttribute("data-okf-fold-toggle"));
  const press = (heading: Node) => page.fire("click", { target: toggleOf(heading) });
  const key = (event: Record<string, unknown>) => {
    let prevented = 0;
    for (const listener of windowListeners.get("keydown") ?? []) {
      listener({ code: "BracketLeft", altKey: true, ctrlKey: true, metaKey: false, shiftKey: false, target: page.body,
        preventDefault: () => { prevented += 1; }, ...event });
    }
    return prevented;
  };
  return { page, blocks, fold, layouts, state: () => state, hidden, toggleOf, press, key };
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("a heading with a section gets a chevron, a heading without one does not", () => {
  const { page, blocks, toggleOf } = setup();
  const empty = page.block("H2", "Empty");
  page.block("H2", "Next");
  page.block("P", "tail");
  assert.ok(toggleOf(blocks[0]!), "the h1 has a section");
  assert.equal(blocks[0]!.getAttribute("data-okf-fold"), "open");
  assert.equal(toggleOf(blocks[0]!)?.getAttribute("aria-expanded"), "true");
  assert.equal(toggleOf(blocks[0]!)?.getAttribute("aria-label"), "Fold section: A");
  assert.equal(toggleOf(empty), undefined, "an empty section has nothing to fold");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("pressing the chevron folds the section up to the next heading of the same level and again unfolds it", () => {
  const { blocks, press, hidden, toggleOf, layouts, page } = setup();
  const calls = press(blocks[2]!);
  assert.equal(calls.stopped, 1, "the click does not reach the edit or reveal handlers");
  assert.deepEqual(hidden(), [false, false, false, true, true, true, true, false, false]);
  assert.equal(blocks[3]!.hasAttribute("data-okf-folded"), true);
  assert.equal(blocks[2]!.getAttribute("data-okf-fold"), "closed");
  assert.equal(toggleOf(blocks[2]!)?.getAttribute("aria-expanded"), "false");
  assert.equal(toggleOf(blocks[2]!)?.getAttribute("aria-label"), "Unfold section: B");
  assert.equal(layouts.length, 1);
  void page;
  press(blocks[2]!);
  assert.deepEqual(hidden(), blocks.map(() => false));
  assert.equal(blocks[3]!.hasAttribute("data-okf-folded"), false);
  assert.equal(blocks[3]!.hasAttribute("hidden"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-004
test("the folded headings are kept per document in the state and never touch the text", () => {
  const { blocks, press, state } = setup({ state: { viewZoom: 120 } });
  const before = blocks.map((block) => block.textContent);
  press(blocks[2]!);
  assert.deepEqual(state(), { viewZoom: 120, headingFolds: { "file:///a.md": ["2|B|0"] } });
  assert.deepEqual(blocks.map((block) => block.textContent), before);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-004
test("a reload folds the sections kept in the state, and another document's keys are left alone", () => {
  const { hidden, state, fold } = setup({
    state: { headingFolds: { "file:///a.md": ["2|B|0"], "file:///other.md": ["1|X|0"] } },
  });
  assert.deepEqual(hidden(), [false, false, false, true, true, true, true, false, false]);
  fold.unfoldAll();
  assert.deepEqual(state()?.headingFolds, { "file:///other.md": ["1|X|0"] });
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-004
test("apply puts the folds back on content that was replaced", () => {
  const { page, fold, press, blocks } = setup();
  press(blocks[2]!);
  page.content.childNodes.slice().forEach((node) => node.remove());
  const fresh = [page.block("H1", "A"), page.block("P", "a1"), page.block("H2", "B"), page.block("P", "b1")];
  fold.apply();
  assert.equal(fresh[3]!.getAttribute("hidden"), "until-found");
  assert.equal(fresh[2]!.getAttribute("data-okf-fold"), "closed");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-005
test("fold all folds every section that has content and unfold all opens them, from the toolbar button too", () => {
  const { blocks, fold, hidden, page, state } = setup();
  clickButton(page);
  assert.deepEqual(hidden(), [false, true, true, true, true, true, true, true, true], "the h1 holds the rest");
  assert.equal(page.toolbarButton.getAttribute("aria-pressed"), "true");
  assert.equal(page.toolbarButton.getAttribute("aria-label"), "Unfold all sections");
  assert.equal((state()?.headingFolds as Record<string, string[]>)["file:///a.md"]!.length, 4);
  clickButton(page);
  assert.deepEqual(hidden(), blocks.map(() => false));
  assert.equal(page.toolbarButton.getAttribute("aria-pressed"), "false");
  fold.foldAll();
  fold.unfoldAll();
  assert.equal(fold.anyFolded(), false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-005
test("fold all and unfold all do nothing while an editor is open", () => {
  const { fold, hidden, blocks } = setup({ busy: true });
  fold.foldAll();
  assert.deepEqual(hidden(), blocks.map(() => false));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("the section shortcut folds the section at the reading line, or the focused heading's", () => {
  const { page, blocks, key, hidden } = setup();
  blocks.forEach((block, index) => { block.top = index * 20 - 50; });
  assert.equal(key({}), 1, "the key is taken");
  // The reading line is at 2: the last heading at or above it is the h2 B (top -10).
  assert.deepEqual(hidden(), [false, false, false, true, true, true, true, false, false]);
  page.activeElement = blocks[7]!;
  key({});
  assert.equal(hidden()[8], true, "the focused heading D folds its paragraph");
  assert.equal(key({ metaKey: true, ctrlKey: false }), 1, "Cmd works as Ctrl");
  assert.equal(hidden()[8], false, "and folds the same section again");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-003
test("the section shortcut ignores keys typed in a text box and other key chords", () => {
  const { blocks, key, hidden } = setup();
  const textarea = new Node("TEXTAREA");
  assert.equal(key({ target: textarea as never }), 0);
  assert.equal(key({ shiftKey: true }), 0);
  assert.equal(key({ altKey: false }), 0);
  assert.deepEqual(hidden(), blocks.map(() => false));
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-006
test("revealing a block unfolds every folded section around it and leaves the others folded", () => {
  const { blocks, fold, hidden, press, layouts } = setup();
  press(blocks[0]!);
  press(blocks[7]!);
  assert.equal(fold.reveal(blocks[6]! as never), true, "c1 sits under the folded h1");
  assert.deepEqual(hidden(), [false, false, false, false, false, false, false, false, true],
    "the h1 opens, the h2 D stays folded");
  assert.equal(fold.reveal(blocks[6]! as never), false, "nothing left to open");
  assert.ok(layouts.length >= 2);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-006
test("the browser find reaching hidden text unfolds its section (beforematch)", () => {
  const { page, blocks, press, hidden } = setup();
  press(blocks[2]!);
  page.fire("beforematch", { target: blocks[4]! });
  assert.deepEqual(hidden(), blocks.map(() => false));
});
