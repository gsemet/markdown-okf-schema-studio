import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installLabelRename } from "../../../src/page/modules/labelRename";
import { provideGlobalElement } from "./fakeDom";

type Handler = (event: any) => void;

class FakeElement {
  public readonly attributes = new Map<string, string>();
  public readonly children: FakeElement[] = [];
  public readonly listeners = new Map<string, Handler[]>();
  public readonly styles = new Map<string, string>();
  public readonly style = { setProperty: (name: string, value: string) => this.styles.set(name, value) };
  public parent: FakeElement | undefined;
  public value = "";
  public disabled = false;
  public textContent = "";
  public selected = false;
  public focused = false;
  public constructor(public readonly tag: string, public classes: string[] = []) {}
  public setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  public getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  public appendChild(child: FakeElement) { child.parent = this; this.children.push(child); return child; }
  public remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = undefined; }
  public contains(node: FakeElement): boolean { return node === this || this.children.some((child) => child.contains(node)); }
  public closest(selector: string): FakeElement | null {
    const cls = selector.replace(/^\./u, "");
    for (let node: FakeElement | undefined = this; node; node = node.parent) if (node.classes.includes(cls)) return node;
    return null;
  }
  public getBoundingClientRect() { return { top: 100, bottom: 120, left: 40, right: 56 }; }
  public addEventListener(type: string, handler: Handler) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]); }
  public focus() { this.focused = true; }
  public select() { this.selected = true; }
  public fire(type: string, event: Record<string, unknown> = {}) {
    const state = { defaultPrevented: false, stopped: false };
    const full = { preventDefault: () => { state.defaultPrevented = true; }, stopPropagation: () => undefined, ...event };
    for (const handler of this.listeners.get(type) ?? []) handler(full);
    return state;
  }
}

function harness(options: { editMode?: boolean; blocked?: string } = {}) {
  const body = new FakeElement("body");
  const documentListeners = new Map<string, Array<{ handler: Handler; capture: boolean }>>();
  const document = {
    body,
    createElement: (tag: string) => new FakeElement(tag),
    addEventListener: (type: string, handler: Handler, capture?: boolean) =>
      documentListeners.set(type, [...(documentListeners.get(type) ?? []), { handler, capture: capture === true }]),
  };
  const timers: Array<{ id: number; callback: () => void }> = [];
  const window = {
    setTimeout: (callback: () => void) => { timers.push({ id: timers.length + 1, callback }); return timers.length; },
    clearTimeout: (id: number) => { const timer = timers.find((entry) => entry.id === id); if (timer) timer.callback = () => undefined; },
  };
  const posted: Array<{ message: any; editId: string }> = [];
  const state = { editMode: options.editMode ?? true, blocked: options.blocked };
  let sequence = 0;
  provideGlobalElement(FakeElement);
  const runtime = installLabelRename(document as never, window as never, {
    isEditMode: () => state.editMode,
    blockedReason: () => state.blocked,
    nextEditId: () => `label-${++sequence}`,
    post: (message: unknown, editId: string) => posted.push({ message, editId }),
  });
  const anchor = new FakeElement("span", ["okf-anchor"]);
  anchor.setAttribute("data-okf-label", "old");
  anchor.setAttribute("data-okf-label-line", "7");
  body.appendChild(anchor);
  const popover = () => body.children.find((child) => child.getAttribute("data-okf-label-rename") !== null);
  const input = () => popover()?.children[0];
  const status = () => popover()?.children[1];
  return {
    anchor, body, posted, state, runtime, timers, popover, input, status, documentListeners,
    click(target: FakeElement) {
      const event = { target, defaultPrevented: false, stopped: false, stoppedImmediate: false,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { this.stopped = true; },
        stopImmediatePropagation() { this.stoppedImmediate = true; } };
      for (const entry of documentListeners.get("click") ?? []) if (!event.stoppedImmediate) entry.handler(event);
      return event;
    },
    key(key: string) { return input()!.fire("keydown", { key }); },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-038
test("a click on the anchor in edit mode opens a prefilled, selected field before the block handlers", () => {
  const t = harness();
  const event = t.click(t.anchor);
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.stoppedImmediate, true);
  assert.equal(t.documentListeners.get("click")![0].capture, true, "must run in the capture phase");
  assert.equal(t.input()!.getAttribute("aria-label"), "Label name");
  assert.equal(t.input()!.value, "old");
  assert.equal(t.input()!.selected, true);
  assert.equal(t.input()!.focused, true);
});

test("outside edit mode the anchor is left alone as a link target", () => {
  const t = harness({ editMode: false });
  const event = t.click(t.anchor);
  assert.equal(event.defaultPrevented, false);
  assert.equal(event.stoppedImmediate, false);
  assert.equal(t.popover(), undefined);
});

test("Enter posts one rename with the label line; Escape cancels", () => {
  const t = harness();
  t.click(t.anchor);
  t.input()!.value = "new-name";
  t.key("Enter");
  assert.deepEqual(JSON.parse(JSON.stringify(t.posted)), [{ message: { line: 7, oldName: "old", newName: "new-name" }, editId: "label-1" }]);
  t.key("Enter");
  assert.equal(t.posted.length, 1, "a second Enter while pending sends nothing");

  const second = harness();
  second.click(second.anchor);
  second.input()!.value = "other";
  second.key("Escape");
  assert.equal(second.popover(), undefined);
  assert.equal(second.posted.length, 0);
});

test("an invalid or unchanged name is not sent", () => {
  const t = harness();
  t.click(t.anchor);
  for (const bad of ["", "-x", "a b", "x".repeat(101)]) {
    t.input()!.value = bad;
    t.key("Enter");
    assert.equal(t.posted.length, 0, bad);
    assert.match(t.status()!.textContent, /letters, digits/u);
  }
  t.input()!.value = "old";
  t.key("Enter");
  assert.equal(t.posted.length, 0);
  assert.equal(t.popover(), undefined, "an unchanged name just closes");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("an open block editor blocks the rename", () => {
  const t = harness({ blocked: "Save or cancel the open edit before renaming a label." });
  t.click(t.anchor);
  assert.equal(t.input()!.disabled, true);
  assert.match(t.status()!.textContent, /Save or cancel/u);
  t.key("Enter");
  assert.equal(t.posted.length, 0);
});

test("the result shows how many {ref} uses of the old name remain", () => {
  const t = harness();
  t.click(t.anchor);
  t.input()!.value = "new";
  t.key("Enter");
  assert.equal(t.runtime.receive({ type: "previewLabelRenameResult", editId: "other", ok: true }), false);
  assert.equal(t.runtime.receive({ type: "previewLabelRenameResult", editId: "label-1", ok: true, remainingRefs: 2 }), true);
  assert.match(t.status()!.textContent, /2 uses of "old" remain/u);
});

test("a refusal is shown and the field can be edited again", () => {
  const t = harness();
  t.click(t.anchor);
  t.input()!.value = "new";
  t.key("Enter");
  t.runtime.receive({ type: "previewLabelRenameResult", editId: "label-1", ok: false, reason: "The label is no longer on that line." });
  assert.equal(t.status()!.textContent, "The label is no longer on that line.");
  assert.equal(t.input()!.disabled, false);
});
