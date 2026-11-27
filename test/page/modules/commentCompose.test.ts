import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installCommentCompose } from "../../../src/page/modules/commentCompose";
import { FakeDocument, FakeElement, FakeText, provideGlobalElement } from "./fakeDom";

interface Posted { type: string; fields: Record<string, any> }

function setup(options: { busy?: () => boolean } = {}) {
  const document = new FakeDocument();
  let selection: any;
  // How often the page turned the selection into text: what reading a selection costs.
  let reads = 0;
  const timers = new Map<number, () => void>();
  const delays: number[] = [];
  let nextTimer = 1;
  const frames: Array<() => void> = [];
  const windowListeners = new Map<string, Array<() => void>>();
  const window: any = {
    innerWidth: 800, innerHeight: 600, getSelection: () => selection,
    addEventListener: (type: string, listener: () => void) => {
      windowListeners.set(type, [...(windowListeners.get(type) ?? []), listener]);
    },
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
    setTimeout: (callback: () => void, delay: number) => {
      // Refresh timers run at once; the 15 s answer timer waits for the test.
      if (delay === 0) { callback(); return 0; }
      delays.push(delay);
      timers.set(nextTimer, callback);
      return nextTimer++;
    },
    clearTimeout: (id: number) => { timers.delete(id); },
  };
  const posted: Posted[] = [];
  const hooks = {
    post: (type: string, fields: Record<string, any>) => { posted.push({ type, fields }); },
    busy: options.busy ?? (() => false),
    beforeOpen: () => undefined,
  };
  provideGlobalElement(FakeElement);
  const compose = installCommentCompose(document as never, window as never, hooks);
  const frame = () => { for (const callback of frames.splice(0)) callback(); };
  const scroll = () => { for (const listener of windowListeners.get("scroll") ?? []) listener(); };
  // `drawn` false: the selection changes and the frame that follows has not come yet.
  const select = (start: [any, number], end: [any, number], text: string, rect = { left: 20, top: 40, right: 120, bottom: 60 },
    drawn = true) => {
    selection = {
      rangeCount: 1,
      isCollapsed: false,
      toString: () => { reads += 1; return text; },
      removeAllRanges: () => { selection = undefined; },
      getRangeAt: () => ({
        startContainer: start[0], startOffset: start[1], endContainer: end[0], endOffset: end[1],
        getBoundingClientRect: () => rect,
      }),
    };
    // The selection change and the frame that follows it (the button follows once per frame).
    document.fire("selectionchange");
    if (drawn) frame();
  };
  const button = () => document.querySelector("[data-okf-comment-create]");
  const box = () => document.querySelector("[data-okf-comment-compose]");
  const click = (target: FakeElement) => document.fire("click", { target });
  const fireTimers = () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } };
  const clear = () => { selection = undefined; document.fire("selectionchange"); frame(); };
  const change = () => document.fire("selectionchange");
  // The selection collapses, and the frame that would answer the change has not come yet.
  const collapseBeforeFrame = () => { selection = undefined; change(); };
  const textReads = () => reads;
  return { fireTimers, timers, delays, document, compose, posted, select, button, box, click, clear, change, collapseBeforeFrame, textReads, frame, frames, scroll };
}

const textOf = (element: FakeElement) => element.childNodes[0] as FakeText;

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S1
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S2
test("T43: a selection inside one block shows the Comment button near the range and builds the anchor", () => {
  const { document, select, button, click, box, posted, compose } = setup();
  const p = document.add("p", { "data-line": "3", "data-end-line": "3" }, document.content, "Please say hello to the world today");
  select([textOf(p), 11], [textOf(p), 16], "hello");
  assert.ok(button(), "the button shows");
  assert.equal(button()!.textContent, "Comment");
  assert.equal(button()!.getAttribute("type"), "button");
  assert.ok(button()!.styles.get("top"), "positioned from the range rectangle");
  click(button()!);
  assert.ok(box(), "the box opens");
  const input = box()!.querySelector("textarea")!;
  (input as any).value = "  Is this right?  ";
  const save = box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!;
  click(save);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "previewCommentCreate");
  assert.deepEqual(JSON.parse(JSON.stringify(posted[0].fields.anchor)), { line: 3, endLine: 3, quote: "hello", prefix: "Please say ", suffix: " to the world today" });
  assert.equal(posted[0].fields.body, "Is this right?");
  assert.ok(box(), "the box stays until the host answers");
  assert.equal((box()!.querySelector("textarea") as any).value, "  Is this right?  ", "the text is kept");
  compose.result({ kind: "create", ok: true });
  assert.equal(box(), null, "the box closes when the host says ok");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-049#S4
test("T43: the quote is whitespace-collapsed and capped at 500, prefix and suffix at 32", () => {
  const { document, select, button, click, box, posted } = setup();
  const long = "w ".repeat(400);
  const p = document.add("p", { "data-line": "1", "data-end-line": "9" }, document.content, `${"a".repeat(100)}${long}${"z".repeat(100)}`);
  select([textOf(p), 100], [textOf(p), 100 + long.length], `  ${long.replace(/ /gu, "\n")}  `);
  click(button()!);
  (box()!.querySelector("textarea") as any).value = "x";
  click(box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!);
  const anchor = posted[0].fields.anchor;
  assert.equal(anchor.quote.length, 500);
  assert.doesNotMatch(anchor.quote, /\s{2}|\n/u);
  assert.equal(anchor.prefix, "a".repeat(32));
  assert.equal(anchor.suffix, "z".repeat(32));
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-049#S1
test("T43: a selection across blocks anchors first block line to last block end line", () => {
  const { document, select, button, click, box, posted } = setup();
  const first = document.add("p", { "data-line": "3", "data-end-line": "4" }, document.content, "First block");
  document.add("p", { "data-line": "6" }, document.content, "Middle");
  const last = document.add("p", { "data-line": "8", "data-end-line": "10" }, document.content, "Last block text");
  select([textOf(first), 6], [textOf(last), 4], "block Middle Last");
  click(button()!);
  (box()!.querySelector("textarea") as any).value = "spans";
  click(box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!);
  assert.deepEqual([posted[0].fields.anchor.line, posted[0].fields.anchor.endLine], [3, 10]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-049#S1
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-049#S3
test("T43: a triple-click selection that ends at offset 0 of the next block stays in its own block", () => {
  const { document, select, button, click, box, posted } = setup();
  const first = document.add("p", { "data-line": "3", "data-end-line": "3" }, document.content, "A whole paragraph");
  const next = document.add("p", { "data-line": "5", "data-end-line": "5" }, document.content, "Next one");
  select([textOf(first), 0], [textOf(next), 0], "A whole paragraph");
  click(button()!);
  (box()!.querySelector("textarea") as any).value = "x";
  click(box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!);
  assert.deepEqual([posted[0].fields.anchor.line, posted[0].fields.anchor.endLine], [3, 3]);
});

test("T43: no button for a collapsed selection, code, properties, editors, chips, included content or unmapped text", () => {
  const { document, select, button, clear } = setup();
  const code = document.add("pre", { "data-line": "1" });
  const codeText = document.add("code", {}, code, "const a = 1");
  select([textOf(codeText), 0], [textOf(codeText), 5], "const");
  assert.equal(button(), null, "code");
  const properties = document.add("section", { "data-okf-properties": "", "data-line": "2" });
  const cell = document.add("td", {}, properties, "value");
  select([textOf(cell), 0], [textOf(cell), 3], "val");
  assert.equal(button(), null, "properties");
  const editor = document.add("div", { "data-line": "3", "data-sphinx-preview-block-editor": "" }, document.content, "being edited");
  select([textOf(editor), 0], [textOf(editor), 3], "bei");
  assert.equal(button(), null, "editor");
  const included = document.add("div", { "data-sphinx-preview-included": "" });
  const includedP = document.add("p", { "data-line": "4" }, included, "from another file");
  select([textOf(includedP), 0], [textOf(includedP), 4], "from");
  assert.equal(button(), null, "included");
  const chip = document.add("span", { class: "okf-comment" }, document.add("p", { "data-line": "5" }), "chip text");
  select([textOf(chip), 0], [textOf(chip), 4], "chip");
  assert.equal(button(), null, "chip");
  const loose = document.add("div", {}, document.body, "outside any block");
  select([textOf(loose), 0], [textOf(loose), 4], "outs");
  assert.equal(button(), null, "unmapped");
  const p = document.add("p", { "data-line": "9" }, document.content, "plain text");
  select([textOf(p), 0], [textOf(p), 5], "plain");
  assert.ok(button());
  clear();
  assert.equal(button(), null, "collapsed again: hidden");
  select([textOf(p), 0], [textOf(p), 5], "   ");
  assert.equal(button(), null, "whitespace only");
});

test("T43: the button is hidden while busy (block editor, block selection) and while the mouse drags", () => {
  let busy = false;
  const { document, select, button, compose } = setup({ busy: () => busy });
  const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
  document.fire("mousedown", { target: p, button: 0 });
  select([textOf(p), 0], [textOf(p), 4], "some");
  assert.equal(button(), null, "not while dragging");
  document.fire("mouseup", { target: p });
  assert.ok(button(), "shown at mouseup");
  busy = true;
  compose.refresh();
  assert.equal(button(), null, "hidden while a block editor is open");
  busy = false;
  compose.refresh();
  assert.ok(button());
});

test("T43: the button never cancels the selection: mousedown is prevented, other mouse events are left alone", () => {
  const { document, select, button } = setup();
  const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
  select([textOf(p), 0], [textOf(p), 4], "some");
  const onButton = document.fire("mousedown", { target: button(), button: 0 });
  assert.equal(onButton.prevented, 1);
  assert.equal(onButton.stopped, 0);
  const onText = document.fire("mousedown", { target: p, button: 0 });
  assert.equal(onText.prevented, 0, "text selection by mouse keeps its default");
  assert.equal(onText.stopped, 0);
  assert.equal(document.fire("mouseup", { target: p }).prevented, 0);
  assert.equal(document.fire("selectionchange").stopped, 0);
});

test("T43: Cmd/Ctrl+C and Shift+click are not intercepted", () => {
  const { document, select } = setup();
  const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
  select([textOf(p), 0], [textOf(p), 4], "some");
  for (const event of [{ key: "c", metaKey: true }, { key: "c", ctrlKey: true }, { key: "ArrowDown", shiftKey: true }]) {
    const calls = document.fire("keydown", { target: p, ...event });
    assert.deepEqual([calls.prevented, calls.stopped], [0, 0], JSON.stringify(event));
  }
  const click = document.fire("click", { target: p, shiftKey: true });
  assert.deepEqual([click.prevented, click.stopped], [0, 0]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218#S1
test("T43: Escape cancels the box, Cmd/Ctrl+Enter saves, an empty body posts nothing", () => {
  const { document, select, button, click, box, posted, compose } = setup();
  const p = document.add("p", { "data-line": "2" }, document.content, "some selectable text");
  select([textOf(p), 5], [textOf(p), 15], "selectable");
  click(button()!);
  const input = box()!.querySelector("textarea")!;
  const save = box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!;
  click(save);
  assert.equal(posted.length, 0, "an empty body is not sent");
  assert.ok(box(), "the box stays so the text can be typed");
  (input as any).value = "   ";
  document.fire("keydown", { target: input, key: "Enter", ctrlKey: true });
  assert.equal(posted.length, 0, "a blank body is not sent");
  const escape = document.fire("keydown", { target: input, key: "Escape" });
  assert.equal(escape.stopped, 1);
  assert.equal(box(), null);
  select([textOf(p), 5], [textOf(p), 15], "selectable");
  click(button()!);
  const second = box()!.querySelector("textarea")!;
  (second as any).value = "Ship it";
  document.fire("keydown", { target: second, key: "Enter", metaKey: true });
  assert.equal(posted.length, 1);
  assert.equal(posted[0].fields.body, "Ship it");
  // CR 265: Escape acts on an open box wherever the focus is, so "left alone" holds once it is closed.
  compose.result({ kind: "create", ok: true });
  assert.equal(box(), null);
  assert.equal(document.fire("keydown", { target: p, key: "Escape" }).stopped, 0, "Escape elsewhere is left alone");
});

test("T43: the keyboard shortcut opens the box for the current selection", () => {
  const { document, select, box } = setup();
  const p = document.add("p", { "data-line": "2" }, document.content, "some selectable text");
  assert.equal(document.fire("keydown", { target: p, key: "m", altKey: true, ctrlKey: true }).prevented, 0, "nothing selected");
  select([textOf(p), 5], [textOf(p), 15], "selectable");
  const calls = document.fire("keydown", { target: p, key: "µ", code: "KeyM", altKey: true, metaKey: true });
  assert.equal(calls.prevented, 1);
  assert.ok(box());
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-044#S7
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-044#S16
test("T43: typing in the box is not seen by other key handlers, and the box text is data", () => {
  const { document, select, button, click, box } = setup();
  const p = document.add("p", { "data-line": "2" }, document.content, "<b>x</b> selectable text");
  select([textOf(p), 0], [textOf(p), 8], "<b>x</b> s");
  click(button()!);
  const quote = box()!.querySelector("[data-okf-comment-quote]")!;
  assert.equal(quote.textContent, "<b>x</b> s");
  assert.equal(quote.childNodes.length, 1, "only a text node");
  const input = box()!.querySelector("textarea")!;
  const later: string[] = [];
  document.addEventListener("keydown", () => later.push("seen"));
  const calls = document.fire("keydown", { target: input, key: "a" });
  assert.equal(calls.stopped, 1);
  assert.deepEqual(later, []);
});

function openAndType(text = "My remark") {
  const kit = setup();
  const p = kit.document.add("p", { "data-line": "2" }, kit.document.content, "some selectable text");
  kit.select([textOf(p), 5], [textOf(p), 15], "selectable");
  kit.click(kit.button()!);
  const input = kit.box()!.querySelector("textarea")!;
  (input as any).value = text;
  const save = () => kit.box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!;
  return { ...kit, input, save };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-044#S7
test("T43 r2: a refused save keeps the box and the text, shows the reason as text and allows a retry", () => {
  const { click, save, box, input, posted, compose } = openAndType();
  click(save());
  assert.equal(posted.length, 1);
  assert.equal(save().getAttribute("disabled"), "true", "Save waits for the answer");
  click(save());
  assert.equal(posted.length, 1, "no second send while waiting");
  assert.equal(compose.result({ kind: "create", ok: false, reason: "<b>the comments file is not valid</b>" }), true);
  assert.ok(box());
  assert.equal((input as any).value, "My remark");
  const alert = box()!.querySelector("[data-okf-comment-error]")!;
  assert.equal(alert.getAttribute("role"), "alert");
  assert.equal(alert.textContent, "<b>the comments file is not valid</b>");
  assert.equal(alert.childNodes.length, 1, "the reason is a text node");
  assert.equal(save().hasAttribute("disabled"), false);
  click(save());
  assert.equal(posted.length, 2, "Save works again");
  compose.result({ kind: "create", ok: true });
  assert.equal(box(), null);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-044#S7
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-044#S16
test("T43 r2: no answer in time keeps the text, says so, and a late ok still closes the box", () => {
  const { click, save, box, input, fireTimers, compose, posted } = openAndType();
  click(save());
  fireTimers();
  assert.ok(box());
  assert.equal((input as any).value, "My remark");
  assert.match(box()!.querySelector("[data-okf-comment-error]")!.textContent, /No answer/u);
  assert.equal(save().hasAttribute("disabled"), false);
  assert.equal(posted.length, 1);
  compose.result({ kind: "create", ok: true });
  assert.equal(box(), null, "a late success closes the box");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-044#S11
test("T43 r2: results of other kinds, or without a pending save, are ignored", () => {
  const { click, save, box, compose } = openAndType();
  assert.equal(compose.result({ kind: "create", ok: true }), false, "nothing was sent yet");
  assert.ok(box());
  click(save());
  assert.equal(compose.result({ kind: "reply", threadId: "t", ok: true }), false);
  assert.ok(box());
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090#S7
test("a comment save waits 15 seconds for the host's answer", () => {
  const { click, save, delays, posted } = openAndType();
  click(save());
  assert.equal(posted.length, 1);
  assert.deepEqual(delays, [15000]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S7
test("selection changes between two frames are answered once, at the frame", () => {
  const { document, select, button, change, textReads, frame, frames } = setup();
  const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
  select([textOf(p), 0], [textOf(p), 4], "some");
  const perAnswer = textReads();
  assert.ok(perAnswer > 0);
  for (let index = 0; index < 5; index += 1) change();
  assert.equal(textReads(), perAnswer, "nothing is read before the frame");
  assert.equal(frames.length, 1, "one frame is asked for");
  frame();
  assert.equal(textReads(), 2 * perAnswer, "five changes are read as one");
  assert.ok(button());
  change();
  assert.equal(frames.length, 1, "the next change asks for the next frame");
  frame();
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S8
test("a scroll moves the Comment button with its text and does not read the selection again", () => {
  const { document, select, button, textReads, frames, scroll } = setup();
  const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
  scroll();
  assert.equal(button(), null, "a scroll shows no button of its own");
  const rect = { left: 20, top: 200, right: 120, bottom: 220 };
  select([textOf(p), 0], [textOf(p), 4], "some", rect);
  const before = button()!.styles.get("top");
  const reads = textReads();
  rect.top -= 100;
  rect.bottom -= 100;
  scroll();
  scroll();
  assert.ok(button(), "the button stays");
  assert.notEqual(button()!.styles.get("top"), before, "it moved with the text");
  assert.equal(Number.parseFloat(before!) - Number.parseFloat(button()!.styles.get("top")!), 100);
  assert.equal(textReads(), reads, "the selection is not read");
  assert.equal(frames.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S8
test("a scroll hides the Comment button while the pointer is down or the page is busy, as a selection change does", () => {
  for (const cause of ["busy", "pointer"] as const) {
    let busy = false;
    const { document, select, button, textReads, scroll } = setup({ busy: () => busy });
    const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
    select([textOf(p), 0], [textOf(p), 4], "some");
    const reads = textReads();
    if (cause === "busy") busy = true;
    else document.fire("mousedown", { target: p, button: 0 });
    scroll();
    assert.equal(button(), null, cause);
    scroll();
    assert.equal(button(), null, `${cause}: a further scroll does not bring it back`);
    assert.equal(textReads(), reads, cause);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-049#S3
test("a selection that ends at offset 0 of a block finds the block before it among nested blocks, without a search of the document", () => {
  const { document, select, button, click, box, posted, compose } = setup();
  const lines = (from: number, to: number) => ({ "data-line": String(from), "data-end-line": String(to) });
  const intro = document.add("p", lines(1, 1), document.content, "Intro");
  const section = document.add("div", {}, document.content);
  const list = document.add("ul", lines(3, 6), section);
  const one = document.add("li", lines(3, 4), list, "One");
  document.add("li", lines(5, 6), list, "Two");
  const after = document.add("p", lines(8, 8), document.content, "Next");
  const searches: string[] = [];
  const queryAll = document.querySelectorAll.bind(document);
  document.querySelectorAll = (selector: string) => { searches.push(selector); return queryAll(selector); };
  const save = (): number[] => {
    click(button()!);
    (box()!.querySelector("textarea") as any).value = "x";
    click(box()!.querySelectorAll("button").find((candidate) => candidate.textContent === "Save")!);
    const { anchor } = posted.at(-1)!.fields;
    compose.result({ kind: "create", ok: true });
    return [anchor.line, anchor.endLine];
  };
  select([textOf(one), 0], [textOf(after), 0], "One Two");
  assert.deepEqual(save(), [3, 6], "the whole list is the block before the next paragraph");
  select([textOf(intro), 0], [textOf(one), 0], "Intro");
  assert.deepEqual(save(), [1, 1], "the block before the first item is outside its list");
  assert.deepEqual(searches.filter((selector) => selector.includes("data-line")), [], "no search of the document");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-038#S10
test("the shortcut pressed before the frame answers the selection as it is then, collapsed or changed", () => {
  const chord = { key: "m", altKey: true, ctrlKey: true };
  for (const next of ["collapsed", "in code", "elsewhere"] as const) {
    const { document, select, button, box, collapseBeforeFrame, textReads, frame } = setup();
    const p = document.add("p", { "data-line": "1" }, document.content, "some selectable text");
    const pre = document.add("pre", { "data-line": "3" }, document.content, "code");
    const other = document.add("p", { "data-line": "5" }, document.content, "another paragraph");
    select([textOf(p), 0], [textOf(p), 4], "some");
    assert.ok(button(), next);
    if (next === "collapsed") collapseBeforeFrame();
    else if (next === "in code") select([textOf(pre), 0], [textOf(pre), 4], "code", undefined, false);
    else select([textOf(other), 0], [textOf(other), 7], "another", undefined, false);
    const calls = document.fire("keydown", { target: p, ...chord });
    if (next === "elsewhere") {
      assert.equal(calls.prevented, 1, next);
      assert.equal(box()!.querySelector("[data-okf-comment-quote]")!.textContent, "another");
    } else {
      assert.equal(box(), null, `${next}: no box on the earlier selection`);
      assert.equal(calls.prevented, 0, `${next}: the key is left alone`);
      assert.equal(button(), null, `${next}: the button of the earlier selection goes`);
    }
    const reads = textReads();
    frame();
    assert.equal(textReads(), reads, `${next}: the frame does not read the answered change again`);
  }
});

