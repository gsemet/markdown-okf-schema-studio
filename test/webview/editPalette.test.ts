import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../src/webview/editActions";
import type { EditAction, EditActionMode, EditActionRegistry } from "../../src/webview/editActions";
import { createEditPalette } from "../../src/webview/editPalette";

type Listener = (event: Record<string, unknown>) => void;

/** The few DOM members the palette uses. */
class FakeElement {
  public readonly attributes = new Map<string, string>();
  public readonly children: FakeElement[] = [];
  public readonly listeners = new Map<string, Listener[]>();
  public parent: FakeElement | undefined;
  public className = "";
  public textContent = "";
  public innerHTML = "";
  public value = "";
  public offsetLeft = 0;
  public offsetWidth = 0;
  public clientWidth = 0;
  public readonly style = { setProperty: (_name: string, _value: string): void => undefined };
  public constructor(public readonly tagName: string) {}
  public setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  public getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  public addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  public appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  public remove(): void {
    if (!this.parent) return;
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = undefined;
  }
  public dispatch(type: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function fakeDocument(): Document {
  return { createElement: (tag: string) => new FakeElement(tag) } as unknown as Document;
}

/** The real registry plus one GFM and one MyST action, to exercise the additive filter. */
function registryWithModes(): EditActionRegistry {
  const base = createEditActions();
  const extra = (id: string, modes: EditActionMode[]): EditAction => ({
    id, label: id, icon: "bold", group: "extra", modes, scopes: ["block"], apply: () => undefined,
  });
  const actions = [...base.actions, extra("gfmOnly", ["gfm"]), extra("mystOnly", ["myst"])];
  return { ...base, actions };
}

function actionIds(root: FakeElement): string[] {
  return root.children.flatMap((child) => {
    const id = child.getAttribute("data-edit-action");
    return id === null ? [] : [id];
  });
}

function open(mode: EditActionMode, onModeChange?: (mode: EditActionMode) => void) {
  const textbox = { value: "", selectionStart: 0, selectionEnd: 0, focus: () => undefined };
  const palette = createEditPalette(fakeDocument(), {
    actions: registryWithModes(),
    getControl: () => textbox,
    applyTextEdit: () => undefined,
    mode,
    ...(onModeChange ? { onModeChange } : {}),
  });
  return { palette, root: palette.element as unknown as FakeElement };
}

function selectOf(root: FakeElement): FakeElement {
  const select = root.children.find((child) => child.tagName === "select");
  assert.ok(select, "the palette starts with a select");
  return select;
}

test("the palette starts with a labelled select of the three modes", () => {
  const { root } = open("gfm");
  const select = root.children[0];
  assert.equal(select.tagName, "select");
  assert.equal(select.getAttribute("aria-label"), "Palette buttons");
  assert.equal(select.value, "gfm");
  assert.deepEqual(
    select.children.map((option) => [option.getAttribute("value"), option.textContent]),
    [
      ["strict", "Strict Markdown"],
      ["gfm", "GitHub (GFM)"],
      ["myst", "MyST (includes GFM)"],
    ],
  );
  assert.equal(root.getAttribute("data-palette-mode"), "gfm");
});

test("modes are additive: strict is within GFM, which is within MyST", () => {
  const strict = actionIds(open("strict").root);
  const gfm = actionIds(open("gfm").root);
  const myst = actionIds(open("myst").root);
  assert.equal(strict.length >= 9, true);
  assert.equal(strict.includes("gfmOnly") || strict.includes("mystOnly"), false);
  assert.deepEqual(gfm, [...strict, "gfmOnly"]);
  assert.deepEqual(myst, [...gfm, "mystOnly"]);
});

test("choosing a mode rebuilds the buttons, keeps the select and reports the change once", () => {
  const changes: string[] = [];
  const { root } = open("strict", (mode) => changes.push(mode));
  const select = selectOf(root);
  select.value = "myst";
  select.dispatch("change");
  assert.deepEqual(changes, ["myst"]);
  assert.equal(selectOf(root), select, "the select element is kept");
  assert.equal(root.children[0], select, "and stays first");
  assert.equal(root.getAttribute("data-palette-mode"), "myst");
  assert.equal(actionIds(root).includes("mystOnly"), true);
  select.dispatch("change");
  assert.deepEqual(changes, ["myst"], "an unchanged value reports nothing");
  select.value = "bogus";
  select.dispatch("change");
  assert.deepEqual(changes, ["myst"], "an unknown value is ignored");
  assert.equal(select.value, "myst", "and the select shows the real mode again");
});

test("the select takes mousedown for itself so it can open; the bar still keeps the focus", () => {
  const { root } = open("strict");
  let barPrevented = false;
  root.dispatch("mousedown", { preventDefault: () => { barPrevented = true; } });
  assert.equal(barPrevented, true);
  const select = selectOf(root);
  let stopped = false;
  let prevented = false;
  select.dispatch("mousedown", {
    stopPropagation: () => { stopped = true; },
    preventDefault: () => { prevented = true; },
  });
  assert.equal(stopped, true, "the press does not reach the bar's focus guard");
  assert.equal(prevented, false, "the native list can open");
});

test("setMode changes the buttons and the select without reporting a change", () => {
  const changes: string[] = [];
  const { palette, root } = open("strict", (mode) => changes.push(mode));
  palette.setMode("gfm");
  assert.equal(selectOf(root).value, "gfm");
  assert.equal(actionIds(root).includes("gfmOnly"), true);
  assert.deepEqual(changes, []);
});
