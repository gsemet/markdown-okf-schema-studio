import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installFirstClearance } from "../../src/webview/firstClearance";

function rect(top: number, left: number, width: number, height: number) {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

type Rect = ReturnType<typeof rect>;
type Kind = "frame" | "start" | "properties" | "none";

/** A fake page: one column, one toolbar, and the first element of the given kind (its rectangles). */
function setup(
  column: Rect,
  toolbar: Rect,
  options: { scrollY?: number; kind?: Kind; box?: Rect; toggles?: Rect[]; others?: Rect[] } = {},
) {
  const published = new Map<string, string>();
  const content = { getBoundingClientRect: () => column };
  const bar = { getBoundingClientRect: () => toolbar };
  const kind = options.kind ?? "none";
  const box = options.box ?? column;
  const element = { getBoundingClientRect: () => box };
  // The section starts at the 40px gap, over the column's width.
  const section = {
    getBoundingClientRect: () => rect(40, column.left, column.width, 300),
    querySelectorAll: (selector: string) =>
      (selector.includes(":not(") ? options.others ?? [] : options.toggles ?? [])
        .map((control) => ({ getBoundingClientRect: () => control })),
  };
  const document = {
    getElementById: (id: string) => (id === "sphinx-myst-preview-content" ? content : null),
    querySelector: (selector: string) => {
      if (selector === "[data-sphinx-preview-toolbar]") return bar;
      if (selector.endsWith(".sphinx-preview-block-editor--first")) return kind === "frame" ? element : null;
      if (selector.endsWith(".sphinx-preview-insert-point--first button")) return kind === "start" ? element : null;
      if (selector.endsWith("> [data-okf-properties]")) return kind === "properties" ? section : null;
      return null;
    },
    documentElement: { style: { setProperty: (name: string, value: string) => published.set(name, value) } },
  };
  const window = {
    scrollY: options.scrollY ?? 0,
    addEventListener: () => undefined,
    getComputedStyle: () => ({ paddingLeft: "16px", paddingRight: "16px" }),
  };
  const clearance = installFirstClearance(document as never, window as never);
  return { clearance, published };
}

test("nothing is pushed when the toolbar is beside the column", () => {
  const { clearance, published } = setup(rect(0, 100, 600, 2000), rect(12, 800, 150, 72), { kind: "frame" });
  assert.equal(clearance.value(), 0);
  assert.equal(clearance.inset(), 0);
  assert.equal(published.get("--sphinx-preview-first-clearance"), "0px");
  assert.equal(published.get("--sphinx-preview-first-inset"), "0px");
});

test("P3: an open first-block editor keeps its 40px gap and gives up the width the toolbar covers", () => {
  // Column 0..900 (content box 16..884), toolbar 600..850 down to 84: the editor loses 884 - 600 + 8.
  const { clearance, published } = setup(rect(0, 0, 900, 2000), rect(12, 600, 250, 72), { kind: "frame" });
  assert.equal(clearance.value(), 0);
  assert.equal(clearance.inset(), 292);
  assert.equal(published.get("--sphinx-preview-first-clearance"), "0px");
  assert.equal(published.get("--sphinx-preview-first-inset"), "292px");
  // The narrowed frame's palette is not under the toolbar: it keeps its place, not the toolbar's edge.
  assert.equal(published.get("--sphinx-preview-first-bar-bottom"), "0px");
  assert.equal(published.get("--sphinx-preview-toolbar-bottom"), "92px");
});

test("P3: a first-block editor in a pane too narrow to be narrowed is pushed below the toolbar", () => {
  const { clearance, published } = setup(rect(0, 0, 460, 2000), rect(12, 200, 250, 72), { kind: "frame" });
  // Toolbar bottom 84 + 8 margin - 0 content top - 40 gap.
  assert.equal(clearance.value(), 52);
  assert.equal(clearance.inset(), 0);
  assert.equal(published.get("--sphinx-preview-first-bar-bottom"), "92px");
});

test("P3: the Start writing button is pushed only when the button itself is under the toolbar", () => {
  const beside = setup(rect(0, 0, 900, 2000), rect(12, 600, 250, 72), { kind: "start", box: rect(40, 16, 105, 24) });
  assert.equal(beside.clearance.value(), 0);
  const under = setup(rect(0, 0, 460, 2000), rect(12, 200, 250, 72), { kind: "start", box: rect(40, 16, 300, 24) });
  assert.equal(under.clearance.value(), 52);
});

test("P3: a hidden Start writing button (the editor replaced it) counts as an open first-block editor", () => {
  const { clearance } = setup(rect(0, 0, 900, 2000), rect(12, 600, 250, 72), { kind: "start", box: rect(0, 0, 0, 0) });
  assert.equal(clearance.value(), 0);
  assert.equal(clearance.inset(), 292);
});

test("P3: a properties table with no control under the toolbar keeps its 40px gap", () => {
  const { clearance } = setup(rect(0, 0, 900, 2000), rect(12, 600, 250, 72), {
    kind: "properties",
    toggles: [rect(123, 700, 24, 24)],
    others: [rect(40, 16, 80, 24)],
  });
  assert.equal(clearance.value(), 0);
  assert.equal(clearance.inset(), 0);
});

test("P3: a Description toggle under the toolbar makes the table give up the toolbar's width", () => {
  const { clearance } = setup(rect(0, 0, 900, 2000), rect(12, 600, 250, 72), {
    kind: "properties",
    toggles: [rect(60, 800, 24, 24)],
  });
  assert.equal(clearance.value(), 0);
  assert.equal(clearance.inset(), 292);
});

test("P3: a left-aligned badge under the toolbar in a narrow pane is pushed below it", () => {
  const { clearance } = setup(rect(0, 0, 460, 2000), rect(12, 200, 250, 72), {
    kind: "properties",
    others: [rect(45, 250, 60, 24)],
  });
  // Badge top 45, toolbar bottom 84 + 8 margin.
  assert.equal(clearance.value(), 47);
});

test("a toolbar that ends above the 40px gap needs no clearance and no inset", () => {
  const { clearance } = setup(rect(0, 0, 460, 2000), rect(0, 200, 250, 20), { kind: "frame" });
  assert.equal(clearance.value(), 0);
  assert.equal(clearance.inset(), 0);
});

test("the content top is measured in document coordinates", () => {
  const { clearance } = setup(rect(-300, 0, 460, 2000), rect(12, 200, 250, 72), { kind: "frame", scrollY: 300 });
  assert.equal(clearance.value(), 52);
});

test("P4: the toolbar's bottom edge is published for the sticky palette only where it overlaps the column", () => {
  const overlap = setup(rect(0, 0, 460, 2000), rect(12, 200, 250, 72));
  // Toolbar bottom 84 + 8 margin.
  assert.equal(overlap.published.get("--sphinx-preview-toolbar-bottom"), "92px");
  const beside = setup(rect(0, 100, 600, 2000), rect(12, 800, 150, 72));
  assert.equal(beside.published.get("--sphinx-preview-toolbar-bottom"), "0px");
});

/** A page whose leading properties table can change after the install, with every observer captured. */
function dynamicPage() {
  const published = new Map<string, string>();
  const column = rect(0, 0, 900, 2000);
  const toolbar = rect(12, 700, 188, 102);
  const state = { toggles: [] as Rect[], section: { id: 1 } as object, now: 1_000 };
  const section = (identity: object) => ({
    identity,
    getBoundingClientRect: () => rect(40, 0, 900, 300),
    querySelectorAll: (selector: string) => (selector.includes(":not(") ? [] : state.toggles)
      .map((control) => ({ getBoundingClientRect: () => control })),
  });
  const sections = new Map<object, ReturnType<typeof section>>();
  const currentSection = () => {
    if (!sections.has(state.section)) sections.set(state.section, section(state.section));
    return sections.get(state.section);
  };
  const document = {
    getElementById: () => ({ getBoundingClientRect: () => column }),
    querySelector: (selector: string) => {
      if (selector === "[data-sphinx-preview-toolbar]") return { getBoundingClientRect: () => toolbar };
      if (selector.endsWith(".sphinx-preview-insert-point--first button")) return null;
      if (selector.endsWith("> [data-okf-properties]")) return currentSection();
      return null;
    },
    documentElement: { style: { setProperty: (name: string, value: string) => published.set(name, value) } },
  };
  const listeners = new Map<string, () => void>();
  const timers: Array<{ at: number; run: () => void }> = [];
  const window = {
    scrollY: 0,
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    getComputedStyle: () => ({ paddingLeft: "16px", paddingRight: "16px" }),
    setTimeout: (run: () => void, delay: number) => { timers.push({ at: state.now + delay, run }); return timers.length; },
  };
  const observers: Array<{ callback: () => void; targets: unknown[] }> = [];
  const globals = globalThis as Record<string, unknown>;
  const saved = { ro: globals.ResizeObserver, mo: globals.MutationObserver, now: Date.now };
  globals.ResizeObserver = class {
    entry = { callback: undefined as unknown as () => void, targets: [] as unknown[] };
    constructor(callback: () => void) { this.entry.callback = callback; observers.push(this.entry); }
    observe(target: unknown) { this.entry.targets.push(target); }
    disconnect() { this.entry.targets = []; }
  };
  globals.MutationObserver = class { constructor() {} observe() {} };
  Date.now = () => state.now;
  const restore = (): void => {
    globals.ResizeObserver = saved.ro;
    globals.MutationObserver = saved.mo;
    Date.now = saved.now;
  };
  const clearance = installFirstClearance(document as never, window as never);
  return { clearance, published, state, listeners, timers, observers, currentSection, restore };
}

test("a change inside a burst of skipped updates is measured by one trailing update", (context) => {
  const page = dynamicPage();
  context.after(page.restore);
  assert.equal(page.clearance.inset(), 0);
  // A busy first second: more than 200 updates, then the Description toggle appears under the toolbar.
  for (let index = 0; index < 205; index += 1) page.listeners.get("resize")?.();
  page.state.toggles = [rect(79, 851, 24, 24)];
  page.listeners.get("resize")?.();
  page.listeners.get("resize")?.();
  assert.equal(page.clearance.inset(), 0, "the update was skipped by the limiter");
  assert.equal(page.timers.length, 1, "one trailing update is scheduled, not one per skipped update");
  page.state.now += 1_001;
  page.timers[0]?.run();
  // Column content box 16..884, toolbar from 700: the table gives up 884 - 700 + 8.
  assert.equal(page.clearance.inset(), 192);
  assert.equal(page.published.get("--sphinx-preview-first-inset"), "192px");
});

test("the leading properties table is observed itself, also after it is replaced", (context) => {
  const page = dynamicPage();
  context.after(page.restore);
  const sectionObserver = page.observers[0];
  assert.ok(sectionObserver, "a section observer exists");
  assert.deepEqual(sectionObserver.targets, [page.currentSection()], "the section is observed");
  // The table grows a visible toggle without resizing the column: only the section observer sees it.
  page.state.toggles = [rect(79, 851, 24, 24)];
  assert.equal(page.clearance.inset(), 0);
  sectionObserver.callback();
  assert.equal(page.clearance.inset(), 192);
  // The section is replaced (a properties patch): the next update observes the new one.
  const previous = page.currentSection();
  page.state.section = { id: 2 };
  page.listeners.get("resize")?.();
  assert.notEqual(page.currentSection(), previous);
  assert.deepEqual(sectionObserver.targets, [page.currentSection()]);
});

test("a late load or font settlement measures again", (context) => {
  const page = dynamicPage();
  context.after(page.restore);
  page.state.toggles = [rect(79, 851, 24, 24)];
  assert.equal(page.clearance.inset(), 0);
  page.listeners.get("load")?.();
  assert.equal(page.clearance.inset(), 192);
});
