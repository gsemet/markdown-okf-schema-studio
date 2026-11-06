import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installCommentCompose } from "../../../src/page/modules/commentCompose";
import { installCommentThreads } from "../../../src/page/modules/commentThreads";
import { FakeDocument, FakeElement, provideGlobalElement } from "./fakeDom";

// The comment editors (new comment box, reply box of the thread popover): placement in the window,
// following the text on scroll, Escape and a press outside, and the inline Discard question.

const VIEWPORT = 600;
const EDITOR_HEIGHT = 200;
const px = (element: FakeElement, name: string): number => Number.parseFloat(element.styles.get(name) ?? "NaN");

interface Rect { left: number; top: number; right: number; bottom: number }

// The editors are 200 px tall in these tests; every other element keeps the fake's 20 px.
function tallEditors(document: FakeDocument): void {
  const create = document.createElement.bind(document);
  document.createElement = (tag: string) => {
    const element = create(tag);
    element.getBoundingClientRect = function (this: FakeElement) {
      const height = this.matches("[data-okf-comment-compose], [data-okf-comment-popover]") ? EDITOR_HEIGHT : 20;
      return { left: 10, top: 10, right: 50, bottom: 10 + height, width: 40, height };
    };
    return element;
  };
}

function guardConfirm(): { calls: number; restore(): void } {
  const guard = { calls: 0, restore: () => { delete (globalThis as { confirm?: unknown }).confirm; } };
  (globalThis as { confirm?: unknown }).confirm = () => { guard.calls += 1; return true; };
  return guard;
}

function composeSetup() {
  const document = new FakeDocument();
  tallEditors(document);
  let selection: any;
  const window: any = {
    innerWidth: 800, innerHeight: VIEWPORT, getSelection: () => selection,
    addEventListener: () => undefined,
    setTimeout: (callback: () => void, delay: number) => { if (delay === 0) callback(); return 1; },
    clearTimeout: () => undefined,
  };
  const posted: Array<{ type: string; fields: Record<string, any> }> = [];
  provideGlobalElement(FakeElement);
  const compose = installCommentCompose(document as never, window as never, {
    post: (type, fields) => { posted.push({ type, fields }); },
    busy: () => false,
  });
  const paragraph = document.add("p", { "data-line": "2" }, document.content, "some selectable text");
  // The rectangle is read again at every scroll, like a live range.
  const rect: Rect = { left: 20, top: 40, right: 120, bottom: 60 };
  const open = (): FakeElement => {
    selection = {
      rangeCount: 1, isCollapsed: false, toString: () => "selectable",
      removeAllRanges: () => { selection = undefined; },
      getRangeAt: () => ({
        startContainer: paragraph.childNodes[0], startOffset: 5, endContainer: paragraph.childNodes[0], endOffset: 15,
        getBoundingClientRect: () => rect,
      }),
    };
    document.fire("selectionchange");
    document.fire("click", { target: document.querySelector("[data-okf-comment-create]")! });
    return document.querySelector("[data-okf-comment-compose]")!;
  };
  const box = () => document.querySelector("[data-okf-comment-compose]");
  const question = () => document.querySelector("[data-okf-comment-discard]");
  const press = (attribute: string) => document.fire("click", { target: document.querySelector(`[${attribute}]`)! });
  const type = (text: string) => { (box()!.querySelector("textarea") as any).value = text; };
  return { document, compose, posted, paragraph, rect, open, box, question, press, type };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-217
test("CR 265: a new comment box near the bottom of the window opens above its text, entirely visible", () => {
  const { rect, open } = composeSetup();
  rect.top = 560; rect.bottom = 580;
  const root = open();
  const top = px(root, "top");
  assert.ok(top >= 8, `top ${top} is inside the window`);
  assert.ok(top + EDITOR_HEIGHT <= VIEWPORT - 8, `the bottom edge ${top + EDITOR_HEIGHT} is inside the window`);
  assert.ok(top + EDITOR_HEIGHT <= rect.top, "the box sits above the selected text");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-217
test("CR 265: a new comment box with room below stays below its text", () => {
  const { rect, open } = composeSetup();
  const root = open();
  assert.equal(px(root, "top"), rect.bottom + 6);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-217
test("CR 265: a new comment box follows its text on scroll, even off screen, and keeps the draft", () => {
  const { document, rect, open, box, type } = composeSetup();
  const root = open();
  type("Half typed");
  const before = px(root, "top");
  rect.top -= 100; rect.bottom -= 100;
  document.fire("scroll", { target: document });
  assert.equal(px(root, "top"), before - 100, "the box moved with the text");
  rect.top = -900; rect.bottom = -880;
  document.fire("scroll", { target: document });
  assert.ok(px(root, "top") < 0, "the box went off screen with its text");
  assert.ok(box(), "scrolling never closes the box");
  assert.equal((box()!.querySelector("textarea") as any).value, "Half typed");
  rect.top = 300; rect.bottom = 320;
  document.fire("scroll", { target: document });
  assert.equal(px(root, "top"), 326, "it comes back with the text");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265: Escape closes an empty or unchanged comment box wherever the focus is", () => {
  const { document, paragraph, open, box, posted, type } = composeSetup();
  open();
  const calls = document.fire("keydown", { target: paragraph, key: "Escape" });
  assert.equal(box(), null, "closed although the text area had no focus");
  assert.equal(calls.stopped, 1);
  open();
  type("typed then erased");
  type("   ");
  document.fire("keydown", { target: document, key: "Escape" });
  assert.equal(box(), null, "a blank draft is nothing to keep");
  assert.deepEqual(posted, []);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265: Escape on a changed comment draft asks Discard or Keep editing, then acts on the answer", () => {
  const guard = guardConfirm();
  try {
    const { document, paragraph, open, box, question, press, type, posted } = composeSetup();
    open();
    type("Why?");
    document.fire("keydown", { target: paragraph, key: "Escape" });
    assert.ok(box(), "the box stays while the question is asked");
    assert.ok(question(), "the question shows in the box");
    const labels = question()!.querySelectorAll("button").map((button) => button.textContent);
    assert.deepEqual(labels, ["Discard", "Keep editing"]);
    press("data-okf-comment-discard-keep");
    assert.equal(question(), null, "Keep editing removes the question");
    assert.equal((box()!.querySelector("textarea") as any).value, "Why?", "the text is kept");
    document.fire("keydown", { target: paragraph, key: "Escape" });
    press("data-okf-comment-discard-yes");
    assert.equal(box(), null, "Discard closes the box");
    assert.deepEqual(posted, [], "nothing was sent");
    assert.equal(guard.calls, 0, "window.confirm is never used");
  } finally { guard.restore(); }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265: a press outside closes an unchanged comment box and asks about a changed one", () => {
  const guard = guardConfirm();
  try {
    const { document, paragraph, open, box, question, press, type } = composeSetup();
    open();
    document.fire("mousedown", { target: paragraph });
    assert.equal(box(), null, "an empty box closes on a press outside");
    document.fire("mouseup", { target: paragraph });
    open();
    type("Draft");
    document.fire("mousedown", { target: document.content });
    assert.ok(box(), "a changed draft is not dropped silently");
    assert.ok(question());
    document.fire("pointerdown", { target: paragraph });
    document.fire("mousedown", { target: paragraph });
    assert.equal(question()!.parentNode, box(), "pressing outside again keeps the one question");
    press("data-okf-comment-discard-keep");
    assert.equal((box()!.querySelector("textarea") as any).value, "Draft");
    document.fire("mousedown", { target: box()!.querySelector("textarea")! });
    assert.equal(question(), null, "a press inside the box asks nothing");
    document.fire("mousedown", { target: paragraph });
    press("data-okf-comment-discard-yes");
    assert.equal(box(), null);
    assert.equal(guard.calls, 0, "window.confirm is never used");
  } finally { guard.restore(); }
});

function threadsSetup() {
  const document = new FakeDocument();
  tallEditors(document);
  const window = { innerWidth: 800, innerHeight: VIEWPORT, setTimeout: () => 1, clearTimeout: () => undefined };
  provideGlobalElement(FakeElement);
  const comments = installCommentThreads(document as never, window as never, { reply: () => undefined } as never);
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([{
    id: "t1", anchor: { line: 1, endLine: 1, quote: "needle", prefix: "", suffix: "" }, resolved: false,
    createdAt: "2026-10-21T10:00:00Z", comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why?" }],
  }]);
  const mark = document.querySelector("[data-okf-comment-thread]")!;
  const rect: Rect = { left: 20, top: 40, right: 60, bottom: 60 };
  mark.getBoundingClientRect = () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top });
  const popover = () => document.querySelector("[data-okf-comment-popover]");
  const open = (): FakeElement => { mark.fire("click"); return popover()!; };
  const question = () => document.querySelector("[data-okf-comment-discard]");
  const press = (attribute: string) => document.fire("click", { target: document.querySelector(`[${attribute}]`)! });
  const type = (text: string) => { (popover()!.querySelector("textarea") as any).value = text; };
  return { document, paragraph, rect, open, popover, question, press, type };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-217
test("CR 265: the thread popover with its reply box near the bottom of the window opens above its text", () => {
  const { rect, open } = threadsSetup();
  rect.top = 560; rect.bottom = 580;
  const root = open();
  const top = px(root, "top");
  assert.ok(top >= 8 && top + EDITOR_HEIGHT <= rect.top, `top ${top}: above the text and inside the window`);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-217
test("CR 265: the thread popover follows its text on scroll and keeps the reply draft", () => {
  const { document, rect, open, popover, type } = threadsSetup();
  const root = open();
  type("My reply");
  assert.equal(px(root, "top"), 66);
  rect.top -= 30; rect.bottom -= 30;
  document.fire("scroll", { target: document });
  assert.equal(px(root, "top"), 36, "the popover moved with the text");
  rect.top = -700; rect.bottom = -680;
  document.fire("scroll", { target: document });
  assert.ok(px(root, "top") < 0, "off screen with its text");
  assert.ok(popover(), "scrolling never closes it");
  assert.equal((popover()!.querySelector("textarea") as any).value, "My reply");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265: Escape on a changed reply draft asks Discard or Keep editing", () => {
  const guard = guardConfirm();
  try {
    const { document, paragraph, open, popover, question, press, type } = threadsSetup();
    open();
    document.fire("keydown", { target: paragraph, key: "Escape" });
    assert.equal(popover(), null, "an empty reply box closes on Escape");
    open();
    type("Half a reply");
    const calls = document.fire("keydown", { target: paragraph, key: "Escape" });
    assert.equal(calls.stopped, 1);
    assert.ok(popover(), "a changed draft is not dropped silently");
    assert.deepEqual(question()!.querySelectorAll("button").map((button) => button.textContent), ["Discard", "Keep editing"]);
    press("data-okf-comment-discard-keep");
    assert.equal(question(), null);
    assert.equal((popover()!.querySelector("textarea") as any).value, "Half a reply");
    document.fire("keydown", { target: paragraph, key: "Escape" });
    press("data-okf-comment-discard-yes");
    assert.equal(popover(), null);
    assert.equal(guard.calls, 0, "window.confirm is never used");
  } finally { guard.restore(); }
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265: a press outside the popover asks about a changed reply draft and closes an empty one", () => {
  const { document, paragraph, open, popover, question, press, type } = threadsSetup();
  open();
  paragraph.fire("pointerdown");
  assert.equal(popover(), null, "an empty reply box closes on a press outside");
  open();
  type("Draft reply");
  paragraph.fire("pointerdown");
  assert.ok(popover(), "the draft is not dropped silently");
  assert.ok(question());
  press("data-okf-comment-discard-keep");
  assert.equal((popover()!.querySelector("textarea") as any).value, "Draft reply");
  document.fire("mousedown", { target: paragraph });
  press("data-okf-comment-discard-yes");
  assert.equal(popover(), null);
});

// Round 2: a popover whose height grows while it is filled, and the focus of the question.
function growingSetup() {
  const document = new FakeDocument();
  const focused: { element?: FakeElement } = {};
  const create = document.createElement.bind(document);
  document.createElement = (tag: string) => {
    const element = create(tag);
    (element as any).focus = () => { focused.element = element; };
    element.getBoundingClientRect = function (this: FakeElement) {
      let height = 20;
      if (this.matches("[data-okf-comment-popover]")) {
        // 100 px empty, 160 px once the Resolve / Delete row holds its buttons.
        const row = this.querySelector("[data-okf-comment-thread-actions]");
        height = row && row.querySelectorAll("button").length > 0 ? 160 : 100;
      }
      return { left: 10, top: 10, right: 50, bottom: 10 + height, width: 40, height };
    };
    return element;
  };
  const window = { innerWidth: 800, innerHeight: VIEWPORT, setTimeout: () => 1, clearTimeout: () => undefined };
  provideGlobalElement(FakeElement);
  const hooks = { reply: () => undefined, resolve: () => undefined, remove: () => undefined };
  const comments = installCommentThreads(document as never, window as never, hooks as never);
  const paragraph = document.add("p", { "data-line": "1" }, document.content, "a needle b");
  comments.setThreads([{
    id: "t1", anchor: { line: 1, endLine: 1, quote: "needle", prefix: "", suffix: "" }, resolved: false,
    createdAt: "2026-10-21T10:00:00Z", comments: [{ id: "c1", author: "Ada", createdAt: "2026-10-21T10:00:00Z", body: "Why?" }],
  }]);
  const mark = document.querySelector("[data-okf-comment-thread]")!;
  const rect: Rect = { left: 20, top: 440, right: 60, bottom: 460 };
  mark.getBoundingClientRect = () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top });
  const popover = () => document.querySelector("[data-okf-comment-popover]");
  const open = (): FakeElement => { mark.fire("click"); return popover()!; };
  const question = () => document.querySelector("[data-okf-comment-discard]");
  const press = (attribute: string) => document.fire("click", { target: document.querySelector(`[${attribute}]`)! });
  const type = (text: string) => { (popover()!.querySelector("textarea") as any).value = text; };
  return { document, paragraph, rect, focused, open, popover, question, press, type };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-217
test("CR 265 r2: the popover is placed again after the Resolve / Delete row fills it", () => {
  const { rect, open } = growingSetup();
  const root = open();
  const top = px(root, "top");
  // Filled height is 160: below the text (466 + 160) would leave the window, so it sits above.
  assert.ok(top >= 8 && top + 160 <= rect.top, `top ${top}: above the text, with its final height, inside the window`);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265 r2: Escape on the question returns the focus to the reply box and places the popover again", () => {
  const { document, paragraph, rect, focused, open, popover, question, type } = growingSetup();
  rect.top = 100; rect.bottom = 120;
  open();
  type("Half a reply");
  document.fire("keydown", { target: paragraph, key: "Escape" });
  assert.ok(question());
  const tall = px(popover()!, "top");
  document.fire("keydown", { target: paragraph, key: "Escape" });
  assert.equal(question(), null);
  assert.equal(focused.element, popover()!.querySelector("textarea"), "the reply box has the focus");
  assert.ok(Number.isFinite(tall));
  // The popover is below the text and was measured again after the question went away.
  assert.equal(px(popover()!, "top"), 126);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-218
test("CR 265 r2: a repaint while the question shows does not move the focus", () => {
  const { document, paragraph, focused, open, question, type } = growingSetup();
  open();
  type("Half a reply");
  document.fire("keydown", { target: paragraph, key: "Escape" });
  const keep = question()!.querySelector("[data-okf-comment-discard-keep]");
  assert.equal(focused.element, keep, "the question takes the focus when it is asked");
  focused.element = undefined;
  // Sending the reply repaints the reply box (as a host answer would).
  document.fire("click", { target: document.querySelector("[data-okf-comment-reply-send]")! });
  assert.equal(focused.element, undefined, "the focus is not stolen again");
});
