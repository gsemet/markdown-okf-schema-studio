import * as assert from "node:assert/strict";
import { test } from "node:test";
import * as vm from "node:vm";

import { installCommentsToggle } from "../../../src/page/modules/commentsToggle";

class FakeNode {
  attrs = new Map<string, string>();
  handlers = new Map<string, Array<() => void>>();
  setAttribute(name: string, value: string) { this.attrs.set(name, value); }
  getAttribute(name: string) { return this.attrs.get(name) ?? null; }
  addEventListener(type: string, handler: () => void) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }
  click() { for (const handler of this.handlers.get("click") ?? []) handler(); }
}

function setup(options: {
  state?: Record<string, unknown>;
  preferences?: { comments?: boolean };
  withButton?: boolean;
} = {}) {
  const root = new FakeNode();
  const button = new FakeNode();
  let state = options.state;
  const messages: Array<Record<string, unknown>> = [];
  const layout: number[] = [];
  const document = {
    documentElement: root,
    querySelector: (selector: string) =>
      selector === "[data-sphinx-preview-comments-toggle]" && options.withButton !== false ? button : null,
  };
  const vscode = {
    postMessage: (message: Record<string, unknown>) => messages.push(message),
    getState: () => state,
    setState: (next: Record<string, unknown>) => { state = next; },
  };
  const context = {
    documentId: "file:///a.md",
    revision: 3,
    requestId: 9,
    initialViewPreferences: options.preferences,
  };
  const toggle = vm.runInNewContext(
    `(${installCommentsToggle.toString()})(document, vscode, context, onLayout)`,
    { document, vscode, context, onLayout: () => layout.push(1) },
  ) as ReturnType<typeof installCommentsToggle>;
  return { root, button, toggle, messages, layout, state: () => state };
}

test("comments are shown by default and the button says how to hide them", () => {
  const { root, button, toggle } = setup();
  assert.equal(toggle.shown(), true);
  assert.equal(root.getAttribute("data-sphinx-preview-comments"), "on");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.equal(button.getAttribute("data-tooltip"), "Hide comments");
});

test("a click hides the comment chips, posts the preference, keeps the state and re-lays out", () => {
  const { root, button, toggle, messages, layout, state } = setup({ state: { expandedChips: ["3:0"] } });
  button.click();
  assert.equal(toggle.shown(), false);
  assert.equal(root.getAttribute("data-sphinx-preview-comments"), "off");
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(button.getAttribute("title"), "Show comments");
  assert.equal(button.getAttribute("aria-label"), "Show comments");
  assert.equal(messages.length, 1);
  assert.deepEqual({ ...messages[0] }, {
    type: "previewViewPreferenceChanged",
    documentId: "file:///a.md",
    revision: 3,
    requestId: 9,
    preference: "comments",
    value: false,
  });
  assert.deepEqual({ ...state(), expandedChips: [...(state()?.expandedChips as string[])] }, { expandedChips: ["3:0"], viewComments: false });
  assert.equal(layout.length, 1);
  button.click();
  assert.equal(root.getAttribute("data-sphinx-preview-comments"), "on");
  assert.equal(messages.at(-1)?.value, true);
  assert.equal(layout.length, 2);
});

test("the saved preference and the webview state decide the initial state", () => {
  assert.equal(setup({ preferences: { comments: false } }).toggle.shown(), false);
  const saved = setup({ preferences: { comments: false }, state: { viewComments: true } });
  assert.equal(saved.toggle.shown(), true);
  assert.equal(saved.root.getAttribute("data-sphinx-preview-comments"), "on");
});

test("without a button the attribute still follows the preference", () => {
  const { root, toggle } = setup({ preferences: { comments: false }, withButton: false });
  assert.equal(toggle.shown(), false);
  assert.equal(root.getAttribute("data-sphinx-preview-comments"), "off");
});
