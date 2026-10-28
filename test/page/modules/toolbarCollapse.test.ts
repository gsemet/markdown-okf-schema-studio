import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installToolbarCollapse } from "../../../src/page/modules/toolbarCollapse";

type Listener = (event: { type: string; target: unknown; propertyName?: string }) => void;

class Node {
  attrs = new Map<string, string>();
  hidden = false;
  listeners = new Map<string, Listener[]>();
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  removeAttribute(name: string) { this.attrs.delete(name); }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...this.listeners.get(type) ?? [], listener]);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }
  dispatch(type: string) {
    for (const listener of [...this.listeners.get(type) ?? []]) listener({ type, target: this });
  }
}

function setup(options: { collapsed?: boolean; reduced?: boolean; state?: Record<string, unknown>; documentId?: string } = {}) {
  const root = new Node();
  const button = new Node();
  const rows = new Node();
  const win = new Node() as Node & { setTimeout: unknown; clearTimeout: unknown; matchMedia: unknown };
  let now = 0;
  const timers = new Map<number, { due: number; run: () => void }>();
  let nextId = 1;
  const frames: Array<() => void> = [];
  (win as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (run: () => void) => { frames.push(run); return frames.length; };
  win.setTimeout = (run: () => void, delay: number) => { timers.set(nextId, { due: now + delay, run }); return nextId++; };
  win.clearTimeout = (id: number) => { timers.delete(id); };
  win.matchMedia = (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" && options.reduced === true });
  const document = {
    documentElement: root,
    querySelector: (selector: string) => selector === "[data-sphinx-preview-toolbar-collapse]" ? button
      : selector === "[data-sphinx-preview-toolbar-more]" ? rows : null,
  };
  let state: Record<string, unknown> | undefined = options.state;
  const posted: unknown[] = [];
  const log: string[] = [];
  const vscode = {
    postMessage: (message: unknown) => { posted.push(message); },
    getState: () => state,
    setState: (next: unknown) => { state = next as Record<string, unknown>; },
  };
  const control = installToolbarCollapse(
    document as never, vscode,
    { documentId: options.documentId ?? "file:///a.md", revision: 1, requestId: 1,
      initialViewPreferences: { toolbarCollapsed: options.collapsed !== false } },
    () => { log.push(`change hidden=${rows.hidden} animating=${rows.getAttribute("data-sphinx-preview-toolbar-animating")}`); },
    win as never,
  );
  const advance = (ms: number) => {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.run(); }
  };
  /** Runs the frames queued so far, and the ones they queue (the page paints twice). */
  const paint = () => { for (let round = 0; round < 3; round += 1) frames.splice(0).forEach((run) => run()); };
  return { root, button, rows, win, posted, log, control, advance, paint, getState: () => state, timers };
}

const HINT = "data-sphinx-preview-toolbar-hint";
const ANIMATING = "data-sphinx-preview-toolbar-animating";

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: the rows carry the animating mark before hidden changes, and lose it after 200 ms", () => {
  const t = setup({ collapsed: false });
  assert.equal(t.rows.hidden, false);
  assert.equal(t.rows.getAttribute(ANIMATING), null, "a page that loads with the rows open does not animate them");
  t.button.dispatch("click");
  assert.equal(t.rows.hidden, true);
  assert.equal(t.rows.getAttribute(ANIMATING), "true");
  t.advance(199);
  assert.equal(t.rows.getAttribute(ANIMATING), "true");
  t.advance(1);
  assert.equal(t.rows.getAttribute(ANIMATING), null);
  t.button.dispatch("click");
  assert.equal(t.rows.hidden, false);
  assert.equal(t.rows.getAttribute(ANIMATING), "true");
  // The layout is measured again when the height transition ends.
  const before = t.log.length;
  for (const listener of t.rows.listeners.get("transitionend") ?? []) listener({ type: "transitionend", target: t.rows, propertyName: "height" });
  assert.equal(t.log.length, before + 1);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: load hint: collapsed toolbar unrolls two frames after the page starts, stays 700 ms, rolls up, preference untouched", () => {
  const t = setup();
  assert.equal(t.rows.hidden, true, "the page starts collapsed");
  assert.equal(t.timers.size, 0, "no timer is pending before the hint starts");
  t.paint();
  assert.equal(t.rows.hidden, false, "the hint unrolls the rows");
  assert.equal(t.root.getAttribute(HINT), "true");
  assert.equal(t.rows.getAttribute(ANIMATING), "true", "marked before hidden changed");
  assert.equal(t.root.getAttribute("data-sphinx-preview-toolbar-state"), "collapsed", "the saved choice is untouched");
  assert.equal(t.button.getAttribute("aria-expanded"), "false");
  t.advance(699);
  assert.equal(t.rows.hidden, false);
  t.advance(1);
  assert.equal(t.rows.hidden, true, "the hint rolls the rows up");
  assert.equal(t.rows.getAttribute(ANIMATING), "true");
  assert.equal(t.root.getAttribute(HINT), null);
  assert.deepEqual(t.posted, [], "nothing is posted for the hint");
  assert.equal(t.control.collapsed(), true);
  assert.equal(t.getState()?.viewToolbarCollapsed, undefined, "the collapsed choice is not saved either");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: a pointer press or a key press cancels the hint and leaves the toolbar collapsed", () => {
  for (const type of ["pointerdown", "keydown"]) {
    const t = setup();
    t.paint();
    assert.equal(t.rows.hidden, false);
    t.win.dispatch(type);
    assert.equal(t.rows.hidden, true, type);
    assert.equal(t.root.getAttribute(HINT), null);
    assert.equal(t.root.getAttribute("data-sphinx-preview-toolbar-state"), "collapsed");
    t.advance(2000);
    assert.equal(t.rows.hidden, true, "no later timer reopens or closes anything");
    assert.deepEqual(t.posted, []);
  }
  // A press before the hint starts cancels nothing and the hint still plays.
  const early = setup();
  early.win.dispatch("pointerdown");
  early.paint();
  assert.equal(early.rows.hidden, false);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: the hint plays once per panel, even for another document, never for an expanded toolbar", () => {
  const first = setup({ documentId: "file:///a.md" });
  assert.equal(first.getState()?.viewToolbarHintShown, true);
  // A refresh or reload of the same preview starts a new page with the webview state kept.
  const reload = setup({ documentId: "file:///a.md", state: first.getState() });
  reload.paint();
  reload.advance(5000);
  assert.equal(reload.rows.hidden, true);
  assert.equal(reload.root.getAttribute(HINT), null);
  assert.equal(reload.timers.size, 0);
  // Another document followed by the same panel does not play it again.
  const other = setup({ documentId: "file:///b.md", state: first.getState() });
  other.paint();
  other.advance(5000);
  assert.equal(other.rows.hidden, true);
  assert.equal(other.root.getAttribute(HINT), null);
  // An expanded toolbar has nothing to hint at.
  const expanded = setup({ collapsed: false });
  expanded.paint();
  expanded.advance(5000);
  assert.equal(expanded.root.getAttribute(HINT), null);
  assert.equal(expanded.rows.hidden, false);
  assert.equal(expanded.rows.getAttribute(ANIMATING), null);
  // A saved webview choice of expanded wins over the preference, so there is no hint either.
  const saved = setup({ state: { viewToolbarCollapsed: false } });
  saved.paint();
  saved.advance(5000);
  assert.equal(saved.root.getAttribute(HINT), null);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: a press on the chevron does not cancel the hint, only its click does", () => {
  const t = setup();
  t.paint();
  const press = (target: unknown) => {
    for (const listener of [...t.win.listeners.get("pointerdown") ?? []]) listener({ type: "pointerdown", target });
  };
  press(t.button);
  assert.equal(t.rows.hidden, false, "the rows stay open under the chevron press");
  assert.equal(t.root.getAttribute(HINT), "true");
  t.button.dispatch("click");
  assert.equal(t.rows.hidden, false);
  assert.equal(t.control.collapsed(), false);
  // A press on another element still cancels.
  const other = setup();
  other.paint();
  for (const listener of [...other.win.listeners.get("pointerdown") ?? []]) listener({ type: "pointerdown", target: new Node() });
  assert.equal(other.rows.hidden, true);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: a chevron click or key during the hint keeps the open rows without a new animation", () => {
  for (const key of [false, true]) {
    const t = setup();
    t.paint();
    // After the unroll (200 ms), before the roll-up (700 ms).
    t.advance(300);
    assert.equal(t.rows.getAttribute(ANIMATING), null);
    const writes: boolean[] = [];
    let hidden = t.rows.hidden;
    Object.defineProperty(t.rows, "hidden", {
      get: () => hidden,
      set: (value: boolean) => { writes.push(value); hidden = value; },
    });
    if (key) {
      for (const listener of [...t.win.listeners.get("keydown") ?? []]) listener({ type: "keydown", target: t.button });
      assert.equal(t.root.getAttribute(HINT), "true", "Enter or Space on the chevron is left to its click");
    }
    t.button.dispatch("click");
    assert.equal(t.root.getAttribute(HINT), null);
    assert.equal(t.control.collapsed(), false);
    assert.equal(t.rows.hidden, false);
    assert.ok(!writes.includes(true), "the rows are not hidden again between the hint and the click");
    assert.equal(t.rows.getAttribute(ANIMATING), null, "the open rows do not unroll a second time");
    t.advance(2000);
    assert.equal(t.rows.hidden, false);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: a click during the hint ends it before the toolbar toggles", () => {
  const t = setup();
  t.paint();
  t.button.dispatch("click");
  assert.equal(t.root.getAttribute(HINT), null);
  assert.equal(t.control.collapsed(), false);
  assert.equal(t.rows.hidden, false);
  t.advance(2000);
  assert.equal(t.rows.hidden, false, "the pending hint timer does not collapse the rows again");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-130
test("CR 162: with prefers-reduced-motion: reduce there is no hint and no animating mark", () => {
  const t = setup({ reduced: true });
  t.paint();
  t.advance(5000);
  assert.equal(t.rows.hidden, true);
  assert.equal(t.root.getAttribute(HINT), null);
  assert.equal(t.getState()?.viewToolbarHintShown, undefined);
  t.button.dispatch("click");
  assert.equal(t.rows.hidden, false);
  assert.equal(t.rows.getAttribute(ANIMATING), null);
  t.button.dispatch("click");
  assert.equal(t.rows.hidden, true);
  assert.equal(t.rows.getAttribute(ANIMATING), null);
});
