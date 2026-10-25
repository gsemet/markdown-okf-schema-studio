/**
 * Requirement tests of the label rename field (`modules/labelRename.ts`): the answer timeout, the
 * automatic close after a success and a label the field cannot rename. Each test asserts the
 * behaviour of the current code on a small fake DOM that records the delay of every timer.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installLabelRename } from "../../../src/page/modules/labelRename";
import { provideGlobalElement } from "./fakeDom";

type Handler = (event: any) => void;

class FakeElement {
  public readonly attributes = new Map<string, string>();
  public readonly children: FakeElement[] = [];
  public readonly listeners = new Map<string, Handler[]>();
  public readonly style = { setProperty: (_name: string, _value: string) => undefined };
  public parent: FakeElement | undefined;
  public value = "";
  public disabled = false;
  public textContent = "";
  public selected = false;
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
  public focus() { return undefined; }
  public select() { this.selected = true; }
  public fire(type: string, event: Record<string, unknown> = {}) {
    for (const handler of this.listeners.get(type) ?? []) handler({ preventDefault: () => undefined, stopPropagation: () => undefined, ...event });
  }
}

function harness(label = "old") {
  const body = new FakeElement("body");
  const documentListeners = new Map<string, Handler[]>();
  const document = {
    body,
    createElement: (tag: string) => new FakeElement(tag),
    addEventListener: (type: string, handler: Handler) => documentListeners.set(type, [...(documentListeners.get(type) ?? []), handler]),
  };
  const timers: Array<{ id: number; callback: () => void; delay: number; live: boolean }> = [];
  const window = {
    setTimeout: (callback: () => void, delay: number) => { timers.push({ id: timers.length + 1, callback, delay, live: true }); return timers.length; },
    clearTimeout: (id: number) => { const timer = timers.find((entry) => entry.id === id); if (timer) timer.live = false; },
  };
  const posted: Array<{ message: unknown; editId: string }> = [];
  let sequence = 0;
  provideGlobalElement(FakeElement);
  const runtime = installLabelRename(document as never, window as never, {
    isEditMode: () => true,
    blockedReason: () => undefined,
    nextEditId: () => `label-${++sequence}`,
    post: (message, editId) => posted.push({ message, editId }),
  });
  const anchor = new FakeElement("span", ["okf-anchor"]);
  anchor.setAttribute("data-okf-label", label);
  anchor.setAttribute("data-okf-label-line", "7");
  body.appendChild(anchor);
  const popover = () => body.children.find((child) => child.getAttribute("data-okf-label-rename") !== null);
  return {
    runtime, posted, timers, popover,
    input: () => popover()?.children[0],
    status: () => popover()?.children[1],
    liveTimers: () => timers.filter((timer) => timer.live),
    click() {
      const event = { target: anchor, defaultPrevented: false, stoppedImmediate: false,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { return undefined; },
        stopImmediatePropagation() { this.stoppedImmediate = true; } };
      for (const handler of documentListeners.get("click") ?? []) if (!event.stoppedImmediate) handler(event);
      return event;
    },
    submit(name: string) { this.input()!.value = name; this.input()!.fire("keydown", { key: "Enter" }); },
    pointerDownOutside() { for (const handler of documentListeners.get("pointerdown") ?? []) handler({ target: new FakeElement("div") }); },
  };
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-038
test("without an answer after 6 s the field is editable again with a message; an answer clears the timer", () => {
  const silent = harness();
  silent.click();
  silent.submit("new");
  assert.equal(silent.input()!.disabled, true, "the field waits for the host");
  const timeout = silent.liveTimers()[0];
  assert.equal(timeout.delay, 6000);
  timeout.callback();
  assert.equal(silent.input()!.disabled, false);
  assert.equal(silent.status()!.textContent, "The editor did not answer. Try again.");

  const answered = harness();
  answered.click();
  answered.submit("new");
  assert.equal(answered.runtime.receive({ type: "previewLabelRenameResult", editId: "label-1", ok: false, reason: "Refused." }), true);
  assert.equal(answered.liveTimers().filter((timer) => timer.delay === 6000).length, 0, "the answer cleared the timeout");
  assert.equal(answered.status()!.textContent, "Refused.", "no timeout message is shown");
});

test("a successful rename closes the field 5 s later and a new action cancels the stale close", () => {
  const t = harness();
  t.click();
  t.submit("new");
  t.runtime.receive({ type: "previewLabelRenameResult", editId: "label-1", ok: true, remainingRefs: 0 });
  assert.match(t.status()!.textContent, /^Renamed\./u);
  const close = t.liveTimers().find((timer) => timer.delay === 5000);
  assert.ok(close, "a close timer of 5 s is armed by the success");
  close.callback();
  assert.equal(t.popover(), undefined, "the field closed");

  // A new rename within 5 s: the stale close does not touch the new field.
  const next = harness();
  next.click();
  next.submit("new");
  next.runtime.receive({ type: "previewLabelRenameResult", editId: "label-1", ok: true, remainingRefs: 0 });
  const stale = next.liveTimers().find((timer) => timer.delay === 5000)!;
  next.click(); // the writer opens the field again
  assert.equal(stale.live, false, "opening again cleared the pending close");
  assert.ok(next.popover(), "the new field stays open");
  assert.equal(next.liveTimers().filter((timer) => timer.delay === 5000).length, 0);

  const escaped = harness();
  escaped.click();
  escaped.submit("new");
  escaped.runtime.receive({ type: "previewLabelRenameResult", editId: "label-1", ok: true, remainingRefs: 1 });
  const pending = escaped.liveTimers().find((timer) => timer.delay === 5000)!;
  escaped.pointerDownOutside();
  assert.equal(escaped.popover(), undefined, "closing by hand");
  assert.equal(pending.live, false, "closing cleared the timer: no stale close");
});

test("a label starting with an underscore, dot or hyphen opens the rename field like any other", () => {
  for (const name of ["_draft", ".hidden", "-dash"]) {
    const t = harness(name);
    const event = t.click();
    assert.equal(t.input()!.value, name, `${name}: the rename field opens`);
    assert.equal(t.input()!.selected, true, `${name}: the name is selected`);
    assert.equal(event.defaultPrevented, true, `${name}: the click is still swallowed`);
    assert.equal(event.stoppedImmediate, true, `${name}: no block editor opens`);
  }
});
