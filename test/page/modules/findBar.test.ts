import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installFindBar, type FindHooks, type FindReplaceAnswer, type FindSourceBlock } from "../../../src/page/modules/findBar";
import { FakeDocument, FakeElement, FakeText, provideGlobalElement } from "./fakeDom";

/** The fake element with the parts of the DOM the find bar reads and writes. */
class El extends FakeElement {
  value = "";
  hidden: boolean | string = false;
  disabled = false;
  innerHTML = "";
  className = "";
  focused = false;
  get isConnected(): boolean { return true; }
  get parentElement(): El | null { return this.parentNode as El | null; }
  get style() { return { setProperty: (name: string, value: string) => this.styles.set(name, value) }; }
  focus(): void { (this.ownerDocument as Page).activeElement = this; }
  blur(): void { if ((this.ownerDocument as Page).activeElement === this) (this.ownerDocument as Page).activeElement = null; }
  select(): void { /* the field text is selected */ }
  scrollIntoView(): void { (this.ownerDocument as Page).scrolled.push(this); }
  getAttribute(name: string): string | null {
    if (name === "hidden" && this.hidden !== false) return this.hidden === true ? "" : String(this.hidden);
    return super.getAttribute(name);
  }
}
class Text extends FakeText {
  get parentElement(): El | null { return this.parentNode as El | null; }
}
provideGlobalElement(El);

class Page extends FakeDocument {
  activeElement: El | null = null;
  scrolled: El[] = [];
  createElement(tag: string) { const element = new El(tag.toUpperCase()); element.ownerDocument = this; return element; }
  createTextNode(text: string) { return new Text(text); }
  /** An element with children given as text or elements. */
  node(tag: string, children: Array<string | El>, attrs: Record<string, string> = {}, parent: El = this.content as El): El {
    const element = this.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    for (const child of children) element.appendChild(typeof child === "string" ? this.createTextNode(child) : child);
    parent.appendChild(element);
    return element;
  }
}

interface Painted { ranges: unknown[]; current: unknown }

function setup(options: {
  blocked?: string;
  sourceOf?: (element: Element) => FindSourceBlock | undefined;
  rect?: { top: number; bottom: number; height: number };
  canRestoreFocus?: (target: Element) => boolean;
} = {}) {
  const page = new Page();
  const keyListeners: Array<(event: any) => void> = [];
  const focusListeners: Array<() => void> = [];
  const window = {
    navigator: { platform: "Linux" },
    innerHeight: 800,
    addEventListener: (type: string, listener: (event: any) => void) => {
      if (type === "keydown") keyListeners.push(listener);
      if (type === "focus") focusListeners.push(listener as () => void);
    },
  };
  const painted: Painted[] = [];
  const asked: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const answers: FindReplaceAnswer[] = [];
  const revealed: Element[] = [];
  const hooks: FindHooks = {
    content: () => page.content as unknown as Element,
    prepare: () => undefined,
    sourceBlockOf: options.sourceOf ?? (() => undefined),
    replaceBlockedReason: () => options.blocked,
    reveal: (target) => { revealed.push(target); return false; },
    ask: (type, payload, done) => { asked.push({ type, payload }); done(answers.shift() ?? { ok: true, replaced: 0, skipped: 0 }); },
    onLayoutChange: () => undefined,
    paint: (ranges, current) => { painted.push({ ranges: [...ranges], current }); },
    createRange: (match) => ({ match, getBoundingClientRect: () => options.rect ?? { top: 100, bottom: 120, height: 20 } }) as unknown as Range,
    selectedText: () => "",
    ...(options.canRestoreFocus ? { canRestoreFocus: options.canRestoreFocus } : {}),
  } as FindHooks;
  const bar = installFindBar(page as never, window as never, hooks);
  const key = (init: Record<string, unknown>, target: unknown = page.body) => {
    let prevented = 0;
    let stopped = 0;
    const event = { target, preventDefault: () => prevented++, stopPropagation: () => stopped++, ...init };
    for (const listener of keyListeners) listener(event);
    return { prevented, stopped };
  };
  const query = <T extends El>(selector: string): T => {
    const found = page.querySelector(selector) as T | null;
    assert.ok(found, selector);
    return found;
  };
  const type = (field: string, text: string): void => {
    const element = query(field);
    element.value = text;
    for (const listener of element.listeners.get("input") ?? []) listener({ target: element });
  };
  const click = (selector: string): void => {
    for (const listener of query(selector).listeners.get("click") ?? []) listener({ target: query(selector) });
  };
  const focusWindow = (): void => { for (const listener of focusListeners) listener(); };
  return { page, bar, key, focusWindow, query, type, click, painted, asked, answers, revealed, hooks };
}

const COUNT = "[data-find-count]";
const text = (harness: ReturnType<typeof setup>, selector: string): string => harness.query(selector).textContent;

/** h1 "Studio notes", p "The Studio preview and the studio" (second one inside strong), a table cell. */
function render(page: Page): void {
  page.node("h1", ["Studio notes"]);
  const strong = page.node("strong", ["studio"], {}, page.createElement("x") as El);
  page.node("p", ["The Studio preview and the ", strong, " plus Pre", page.node("em", ["view"], {}, page.createElement("x") as El)]);
  page.node("td", ["a studio cell"]);
}

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("the field takes the focus back when the window focus returns to the page body", () => {
  const harness = setup();
  render(harness.page);
  harness.focusWindow();
  assert.equal(harness.page.activeElement, null, "a closed bar takes nothing");
  harness.key({ code: "KeyF", ctrlKey: true });
  harness.page.activeElement = harness.page.body as never;
  harness.focusWindow();
  assert.equal(harness.page.activeElement, harness.query("[data-find-input]"));
  const other = harness.page.createElement("button");
  harness.page.activeElement = other;
  harness.focusWindow();
  assert.equal(harness.page.activeElement, other, "another control keeps its focus");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("Ctrl+F opens the bar with the field focused", () => {
  const harness = setup();
  render(harness.page);
  const result = harness.key({ code: "KeyF", ctrlKey: true });
  assert.deepEqual(result, { prevented: 1, stopped: 1 }, "the key is taken before VS Code's webview find sees it");
  assert.equal(harness.bar.isOpen(), true);
  assert.equal(harness.query("[data-sphinx-preview-find]").hidden, false);
  assert.equal(harness.page.activeElement, harness.query("[data-find-input]"));
  assert.equal(harness.key({ code: "KeyF", metaKey: true }).prevented, 0, "Cmd+F is not the shortcut on Linux and Windows");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// The page used to leave the key to an editor field (the bar then opened one host round trip later,
// and the keys typed meanwhile went into the field): it now takes the key there too.
test("Ctrl+F inside an editor field opens the bar at once; Escape gives the focus back to the field", () => {
  const harness = setup();
  render(harness.page);
  const inEditor = harness.page.node("textarea", []);
  inEditor.focus();
  assert.deepEqual(harness.key({ code: "KeyF", ctrlKey: true }, inEditor), { prevented: 1, stopped: 1 },
    "the key is taken from the field, before VS Code sees it");
  assert.equal(harness.bar.isOpen(), true);
  const field = harness.query("[data-find-input]");
  assert.equal(harness.page.activeElement, field, "the next keys go to the query");
  assert.equal(harness.key({ code: "F3" }, inEditor).prevented, 0, "F3 in an editor field stays with the field");
  harness.key({ key: "Escape" }, field);
  assert.equal(harness.bar.isOpen(), false);
  assert.equal(harness.page.activeElement, inEditor, "the focus returns to the editor field");
  for (const tag of ["input", "select"]) {
    const other = harness.page.node(tag, []);
    other.focus();
    assert.equal(harness.key({ code: "KeyF", ctrlKey: true }, other).prevented, 1, tag);
    assert.equal(harness.page.activeElement, field, tag);
    harness.key({ key: "Escape" }, field);
  }
  const alt = harness.key({ code: "KeyF", ctrlKey: true, altKey: true }, inEditor);
  const shift = harness.key({ code: "KeyF", ctrlKey: true, shiftKey: true }, inEditor);
  assert.deepEqual([alt.prevented, shift.prevented, harness.bar.isOpen()], [0, 0, false], "Ctrl+Alt+F and Ctrl+Shift+F are not the shortcut");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("Escape does not give the focus back to a field the page refuses (an editor whose final save is on its way)", () => {
  let refused = true;
  const harness = setup({ canRestoreFocus: () => !refused });
  render(harness.page);
  const inEditor = harness.page.node("textarea", []);
  inEditor.focus();
  harness.key({ code: "KeyF", ctrlKey: true }, inEditor);
  const field = harness.query("[data-find-input]");
  harness.key({ key: "Escape" }, field);
  assert.equal(harness.bar.isOpen(), false);
  assert.equal(harness.page.activeElement, null, "the closed field let the focus go; the editor field did not get it");
  refused = false;
  inEditor.focus();
  harness.key({ code: "KeyF", ctrlKey: true }, inEditor);
  harness.key({ key: "Escape" }, field);
  assert.equal(harness.page.activeElement, inEditor, "an accepted field gets the focus back");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("the query starts with the text selected in the editor field the bar opens from", () => {
  const harness = setup();
  render(harness.page);
  const inEditor = harness.page.node("textarea", []);
  inEditor.value = "The Studio preview";
  Object.assign(inEditor, { selectionStart: 4, selectionEnd: 10 });
  inEditor.focus();
  harness.key({ code: "KeyF", ctrlKey: true }, inEditor);
  assert.equal(harness.query("[data-find-input]").value, "Studio");
  assert.equal(text(harness, COUNT), "1 of 4");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
test("an open request while the reader is in the bar changes nothing; Ctrl+F in the bar selects the query again", () => {
  const harness = setup();
  render(harness.page);
  harness.key({ code: "KeyF", ctrlKey: true });
  const field = harness.query("[data-find-input]");
  let selected = 0;
  field.select = () => { selected += 1; };
  harness.type("[data-find-input]", "studio");
  harness.key({ code: "Enter" , key: "Enter" }, field);
  assert.equal(text(harness, COUNT), "2 of 4");
  const paints = harness.painted.length;

  // The host's find command, posted for the same key: no second bar, no new focus, no new search.
  harness.bar.open();
  assert.equal(harness.page.querySelectorAll("[data-find-input]").length, 1);
  assert.equal(harness.page.activeElement, field);
  assert.equal(selected, 0, "the query is not selected again: the next key does not replace it");
  assert.equal(field.value, "studio");
  assert.equal(text(harness, COUNT), "2 of 4", "the current match is kept");
  assert.equal(harness.painted.length, paints, "nothing searched again");

  // Ctrl+F pressed again in the bar selects the query, as in VS Code.
  assert.deepEqual(harness.key({ code: "KeyF", ctrlKey: true }, field), { prevented: 1, stopped: 1 });
  assert.equal(selected, 1);

  // With the focus elsewhere, an open request takes the reader back to the query.
  const other = harness.page.node("button", []);
  other.focus();
  harness.bar.open();
  assert.equal(harness.page.activeElement, field);
  assert.equal(selected, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("typing paints every match of the rendered text, across inline markup, and counts them", () => {
  const harness = setup();
  render(harness.page);
  harness.bar.open();
  harness.type("[data-find-input]", "studio");
  assert.equal(text(harness, COUNT), "1 of 4");
  assert.equal(harness.painted.at(-1)!.ranges.length, 4);
  harness.type("[data-find-input]", "preview");
  assert.equal(text(harness, COUNT), "1 of 2", "Pre + <em>view</em> is one match");
  harness.type("[data-find-input]", "nothing here");
  assert.equal(text(harness, COUNT), "No results");
  assert.equal(harness.painted.at(-1)!.ranges.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-009
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("Enter, Shift+Enter and F3 walk the matches and wrap around; Escape closes and clears the paint", () => {
  const harness = setup();
  render(harness.page);
  harness.page.body.appendChild(harness.page.createElement("button"));
  const before = harness.page.createElement("button") as El;
  before.focus();
  harness.bar.open();
  harness.type("[data-find-input]", "studio");
  const field = harness.query("[data-find-input]");
  harness.key({ key: "Enter", target: field }, field);
  assert.equal(text(harness, COUNT), "2 of 4");
  harness.key({ key: "Enter", shiftKey: true }, field);
  harness.key({ key: "Enter", shiftKey: true }, field);
  assert.equal(text(harness, COUNT), "4 of 4");
  harness.key({ key: "Enter" }, field);
  assert.equal(text(harness, COUNT), "1 of 4");
  harness.key({ code: "F3" });
  assert.equal(text(harness, COUNT), "2 of 4");
  harness.key({ code: "F3", shiftKey: true });
  assert.equal(text(harness, COUNT), "1 of 4");

  const escape = harness.key({ key: "Escape" }, field);
  assert.equal(escape.prevented, 1);
  assert.equal(harness.bar.isOpen(), false);
  assert.equal(harness.query("[data-sphinx-preview-find]").hidden, true);
  assert.equal(harness.painted.at(-1)!.ranges.length, 0);
  assert.equal(harness.page.activeElement, before, "the focus returns to where it was");
  assert.equal(harness.key({ code: "F3" }).prevented, 0, "F3 is free again once the bar is closed");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-011
test("match case, whole word and regular expression narrow the matches; a bad expression shows its reason", () => {
  const harness = setup();
  render(harness.page);
  harness.bar.open();
  harness.type("[data-find-input]", "studio");
  harness.click("[data-find-case]");
  assert.equal(text(harness, COUNT), "1 of 2");
  assert.equal(harness.query("[data-find-case]").getAttribute("aria-pressed"), "true");
  harness.click("[data-find-case]");
  harness.type("[data-find-input]", "pre");
  harness.click("[data-find-word]");
  assert.equal(text(harness, COUNT), "No results", "'Pre' / 'preview' are not the word 'pre'");
  harness.click("[data-find-word]");
  harness.click("[data-find-regex]");
  harness.type("[data-find-input]", "stud(io");
  const field = harness.query("[data-find-input]");
  assert.equal(field.getAttribute("aria-invalid"), "true");
  assert.notEqual(text(harness, COUNT), "");
  harness.type("[data-find-input]", "stud(io)");
  assert.equal(field.getAttribute("aria-invalid"), "false");
  assert.equal(text(harness, COUNT), "1 of 4");
  harness.key({ altKey: true, code: "KeyR" }, field);
  assert.equal(harness.query("[data-find-regex]").getAttribute("aria-pressed"), "false", "Alt+R toggles the expression");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("hidden text, controls and formula markup are not searched, a folded section is", () => {
  const harness = setup();
  const page = harness.page;
  page.node("p", ["visible secret"]);
  page.node("p", ["hidden secret"], { hidden: "" });
  page.node("button", ["button secret"]);
  page.node("span", ["mathml secret"], { class: "katex-mathml" });
  const folded = page.node("p", ["folded secret"], { hidden: "until-found" });
  harness.bar.open();
  harness.type("[data-find-input]", "secret");
  assert.equal(text(harness, COUNT), "1 of 2");
  assert.ok(harness.painted.at(-1)!.ranges.length === 2);
  harness.bar.next();
  assert.ok(harness.revealed.includes(folded as unknown as Element), "the section of the match is unfolded before it is shown");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("a match is scrolled to the middle only when it is outside the pane", () => {
  const inView = setup();
  render(inView.page);
  inView.bar.open();
  inView.type("[data-find-input]", "studio");
  assert.equal(inView.page.scrolled.length, 0, "a match already in view does not scroll");

  const below = setup({ rect: { top: 900, bottom: 920, height: 20 } });
  render(below.page);
  below.bar.open();
  below.type("[data-find-input]", "studio");
  assert.ok(below.page.scrolled.length > 0, "a match under the pane is brought to the middle");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("replace all sends the source block, the occurrence and the expanded replacement of each match", () => {
  const block = (line: number, element: Element) => ({ line, endLine: line, element });
  const tag = (node: Element): string => node.tagName;
  const harness = setup({
    sourceOf: (element) => {
      // The h1 is mapped to line 1 and the paragraph to line 3; the table cell is not replaceable.
      for (let node: Element | null = element; node; node = node.parentElement) {
        if (tag(node) === "H1") return block(1, node);
        if (tag(node) === "P") return block(3, node);
      }
      return undefined;
    },
  });
  render(harness.page);
  harness.page.node("td", ["Studio in a cell"]);
  harness.answers.push({ ok: true, replaced: 2, skipped: 1 });
  harness.bar.open({ replace: true });
  harness.click("[data-find-regex]");
  harness.click("[data-find-case]");
  harness.type("[data-find-input]", "(S)tudio");
  harness.type("[data-find-replace-input]", "$1ite");
  assert.equal(text(harness, "[data-find-note]"), "1 match cannot be replaced from the preview", "the cell match is counted");
  harness.click("[data-find-replace-all]");
  assert.equal(harness.asked.length, 1);
  assert.equal(harness.asked[0]!.type, "previewFindReplace");
  assert.deepEqual(harness.asked[0]!.payload.items, [
    { line: 1, endLine: 1, find: "Studio", occurrence: 0, occurrences: 1, replacement: "Site" },
    { line: 3, endLine: 3, find: "Studio", occurrence: 0, occurrences: 1, replacement: "Site" },
  ]);
  assert.match(text(harness, "[data-find-note]"), /^Replaced 2 matches; 2 matches cannot be replaced from the preview$/u);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-012
test("replace replaces the current match only and moves on; a refusal of the host is shown", () => {
  const harness = setup({ sourceOf: (element) => ({ line: 2, endLine: 2, element: element.closest?.("p") ?? element }) });
  harness.page.node("p", ["one studio, two studio, three Studio"]);
  harness.answers.push({ ok: true, replaced: 1, skipped: 0 }, { ok: false, reason: "The preview is out of date." });
  harness.bar.open({ replace: true });
  harness.type("[data-find-input]", "studio");
  harness.type("[data-find-replace-input]", "site");
  harness.bar.next();
  harness.click("[data-find-replace]");
  assert.deepEqual(harness.asked[0]!.payload.items, [
    { line: 2, endLine: 2, find: "studio", occurrence: 1, occurrences: 2, replacement: "site" },
  ]);
  assert.equal(text(harness, "[data-find-note]"), "Replaced 1 match");
  harness.key({ key: "Enter" }, harness.query("[data-find-replace-input]"));
  assert.equal(text(harness, "[data-find-note]"), "The preview is out of date.");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-014
test("a read-only preview disables replace with the reason and never asks the host", () => {
  const harness = setup({ blocked: "Open a folder to edit.", sourceOf: (element) => ({ line: 1, endLine: 1, element }) });
  render(harness.page);
  harness.bar.open({ replace: true });
  const toggle = harness.query("[data-find-toggle-replace]");
  assert.equal(toggle.getAttribute("aria-disabled"), "true");
  assert.equal(toggle.getAttribute("title"), "Open a folder to edit.");
  assert.equal((harness.page.querySelectorAll("[data-find-row]")[1] as El).hidden, true, "the replace row stays closed");
  harness.click("[data-find-toggle-replace]");
  assert.equal(text(harness, "[data-find-note]"), "Open a folder to edit.");
  harness.type("[data-find-input]", "studio");
  assert.equal(text(harness, COUNT), "1 of 4", "finding still works");
  harness.click("[data-find-replace-all]");
  assert.equal(harness.asked.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010
test("the matches are searched again when the content changes, keeping the current index", () => {
  const harness = setup();
  render(harness.page);
  harness.bar.open();
  harness.type("[data-find-input]", "studio");
  harness.bar.next();
  harness.bar.next();
  assert.equal(text(harness, COUNT), "3 of 4");
  harness.page.node("p", ["one more studio"]);
  harness.bar.refresh();
  assert.equal(text(harness, COUNT), "3 of 5");
  harness.bar.close();
  harness.bar.refresh();
  assert.equal(harness.query("[data-sphinx-preview-find]").hidden, true, "a closed bar stays closed");
});
