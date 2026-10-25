import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installChipToggle } from "../../../src/page/modules/chipToggle";

type Handler = (event: any) => void;

class FakeElement {
  attrs = new Map<string, string>();
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  hidden = false;
  constructor(public tagName: string, public classes: string[] = []) {}
  get classList() { return { contains: (name: string) => this.classes.includes(name) }; }
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  append<T extends FakeElement>(child: T): T { child.parentElement = this; this.children.push(child); return child; }
  closest(selector: string): FakeElement | null {
    for (let node: FakeElement | null = this; node; node = node.parentElement) {
      if (selector.startsWith(".") && node.classes.includes(selector.slice(1))) return node;
      if (selector.startsWith("[") && node.attrs.has(selector.slice(1, -1))) return node;
    }
    return null;
  }
}

/** One comment: wrapper (optionally a block with data-line), chip and hidden body. */
function comment(parent: FakeElement, options: { line?: string; kind?: string } = {}) {
  const wrapper = parent.append(new FakeElement("div", ["okf-comment"]));
  if (options.line) wrapper.setAttribute("data-line", options.line);
  wrapper.setAttribute("data-okf-comment-kind", options.kind ?? "comment");
  const chip = wrapper.append(new FakeElement("span", ["okf-chip"]));
  chip.setAttribute("aria-expanded", "false");
  const body = wrapper.append(new FakeElement("div", ["okf-comment-body"]));
  body.hidden = true;
  return { wrapper, chip, body };
}

function setup(initialState: Record<string, unknown> | undefined = undefined, showComments?: boolean) {
  const root = new FakeElement("html");
  const content = root.append(new FakeElement("main"));
  const handlers = new Map<string, Handler[]>();
  let state: Record<string, unknown> | undefined = initialState;
  const document = {
    documentElement: root,
    addEventListener: (type: string, handler: Handler) => handlers.set(type, [...(handlers.get(type) ?? []), handler]),
    querySelectorAll: (selector: string) => {
      const found: FakeElement[] = [];
      const walk = (node: FakeElement) => {
        for (const child of node.children) {
          if (selector === ".okf-comment" && child.classes.includes("okf-comment")) found.push(child);
          walk(child);
        }
      };
      walk(root);
      return found;
    },
  };
  const layoutChanges: number[] = [];
  const vscode = {
    getState: () => state,
    setState: (next: Record<string, unknown>) => { state = next; },
  };
  const toggle = installChipToggle(document as never, vscode as never,
    (showComments === undefined ? {} : { showComments }) as never, () => layoutChanges.push(1));
  const fire = (type: string, event: Record<string, unknown>) => {
    const calls = { prevented: 0 };
    for (const handler of handlers.get(type) ?? []) {
      handler({ preventDefault: () => calls.prevented++, ...event });
    }
    return calls;
  };
  return { root, content, toggle, fire, layoutChanges, state: () => state };
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-143
test("a click on the chip opens the body and a second click closes it", () => {
  const { content, fire, layoutChanges } = setup();
  const { chip, body } = comment(content, { line: "7" });
  fire("click", { target: chip });
  assert.equal(chip.getAttribute("aria-expanded"), "true");
  assert.equal(body.hidden, false);
  assert.equal(layoutChanges.length, 1);
  fire("click", { target: chip });
  assert.equal(chip.getAttribute("aria-expanded"), "false");
  assert.equal(body.hidden, true);
  assert.equal(layoutChanges.length, 2);
});

test("Enter and Space on the chip toggle it, other keys and other targets do not", () => {
  const { content, fire } = setup();
  const { chip, body } = comment(content, { line: "7" });
  const enter = fire("keydown", { key: "Enter", target: chip });
  assert.equal(body.hidden, false);
  assert.equal(enter.prevented, 1);
  const space = fire("keydown", { key: " ", target: chip });
  assert.equal(body.hidden, true);
  assert.equal(space.prevented, 1);
  fire("keydown", { key: "a", target: chip });
  assert.equal(body.hidden, true);
  const other = content.append(new FakeElement("p"));
  fire("keydown", { key: "Enter", target: other });
  fire("click", { target: other });
  assert.equal(body.hidden, true);
});

test("a chip without a body (a TODO word) is left alone", () => {
  const { content, fire, layoutChanges } = setup();
  const paragraph = content.append(new FakeElement("p"));
  const lone = paragraph.append(new FakeElement("span", ["okf-chip"]));
  const calls = fire("keydown", { key: "Enter", target: lone });
  fire("click", { target: lone });
  assert.equal(lone.getAttribute("aria-expanded"), null);
  assert.equal(calls.prevented, 0);
  assert.equal(layoutChanges.length, 0);
});

test("the expanded set is saved in the webview state next to the other entries", () => {
  const { content, fire, state } = setup({ viewZoom: 120 });
  const first = comment(content, { line: "7" });
  const second = comment(content, { line: "12" });
  fire("click", { target: second.chip });
  assert.deepEqual(JSON.parse(JSON.stringify(state())), { viewZoom: 120, expandedChips: ["12:0"] });
  fire("click", { target: first.chip });
  fire("click", { target: second.chip });
  assert.deepEqual(JSON.parse(JSON.stringify(state())), { viewZoom: 120, expandedChips: ["7:0"] });
});

test("the expansion survives a content replacement in the same panel", () => {
  const { content, fire, toggle } = setup();
  comment(content, { line: "3" });
  const target = comment(content, { line: "9" });
  fire("click", { target: target.chip });
  // Typing replaces the content: new elements, all closed again.
  content.children.length = 0;
  const first = comment(content, { line: "3" });
  const second = comment(content, { line: "9" });
  assert.equal(second.body.hidden, true);
  toggle.apply();
  assert.equal(first.body.hidden, true);
  assert.equal(first.chip.getAttribute("aria-expanded"), "false");
  assert.equal(second.body.hidden, false);
  assert.equal(second.chip.getAttribute("aria-expanded"), "true");
});

test("two inline comments of one paragraph keep their own state", () => {
  const { content, fire, toggle } = setup();
  const paragraph = content.append(new FakeElement("p"));
  paragraph.setAttribute("data-line", "4");
  const a = comment(paragraph);
  const b = comment(paragraph);
  fire("click", { target: b.chip });
  assert.equal(a.body.hidden, true);
  assert.equal(b.body.hidden, false);
  toggle.apply();
  assert.equal(a.body.hidden, true);
  assert.equal(b.body.hidden, false);
});

test("the saved state of a reloaded page is read back", () => {
  const { content, toggle } = setup({ expandedChips: ["5:0", 7, "bad"] });
  const { body, chip } = comment(content, { line: "5" });
  toggle.apply();
  assert.equal(body.hidden, false);
  assert.equal(chip.getAttribute("aria-expanded"), "true");
  assert.deepEqual([...toggle.expanded()], ["5:0"]);
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
test("the show-comments attribute follows the setting, live", () => {
  const { root, toggle, layoutChanges } = setup(undefined, false);
  assert.equal(root.getAttribute("data-okf-show-comments"), "false");
  toggle.setShowComments(true);
  assert.equal(root.getAttribute("data-okf-show-comments"), "true");
  assert.equal(layoutChanges.length, 1);
  toggle.setShowComments(true);
  assert.equal(layoutChanges.length, 1);
  toggle.setShowComments(false);
  assert.equal(root.getAttribute("data-okf-show-comments"), "false");
  const fresh = setup();
  assert.equal(fresh.root.getAttribute("data-okf-show-comments"), "true");
});
