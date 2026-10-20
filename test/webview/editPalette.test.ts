import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../src/webview/editActions";
import type { EditAction, EditActionMode, EditActionRegistry } from "../../src/webview/editActions";
import { createEditPalette } from "../../src/webview/editPalette";
import { createMarkdownTableTools } from "../../src/webview/markdownTable";

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
  public readonly styles = new Map<string, string>();
  public readonly style = { setProperty: (name: string, value: string): void => { this.styles.set(name, value); } };
  public getBoundingClientRect(): { left: number; top: number } { return { left: 100, top: 50 }; }
  public constructor(public readonly tagName: string) {}
  public setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  public getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  public removeAttribute(name: string): void { this.attributes.delete(name); }
  public focusCalls = 0;
  public focus(): void { this.focusCalls += 1; }
  public all(): FakeElement[] { return this.children.flatMap((child) => [child, ...child.all()]); }
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
  assert.deepEqual(gfm, [
    ...strict, "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd",
    "gfmOnly",
  ]);
  // T28: the registry's own MyST group (admonition ... label) sits before the test's extra action.
  const gfmReal = gfm.filter((id) => id !== "gfmOnly");
  assert.deepEqual(myst, [
    ...gfmReal, "admonition", "deflist", "math", "sub", "sup", "label",
    "ref", "doc", "cite", "dropdown", "tableCaption", "figure", "roleKbd", "gfmOnly", "mystOnly",
  ]);
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

// T24: the size grid and the emoji picker.
interface Harness {
  palette: ReturnType<typeof createEditPalette>;
  root: FakeElement;
  textbox: { value: string; selectionStart: number; selectionEnd: number; focus: () => void; focused: number };
  edits: Array<{ start: number; end: number; text: string }>;
  leaves: number;
  frame: Set<unknown>;
}

function openFull(value = "", caret = 0): Harness {
  const textbox = {
    value, selectionStart: caret, selectionEnd: caret, focused: 0,
    focus() { textbox.focused += 1; },
  };
  const harness = { edits: [] as Array<{ start: number; end: number; text: string }>, leaves: 0, frame: new Set<unknown>() } as Harness;
  harness.textbox = textbox;
  harness.palette = createEditPalette(fakeDocument(), {
    actions: createEditActions(),
    getControl: () => textbox,
    applyTextEdit: (edit) => {
      harness.edits.push(edit);
      textbox.value = textbox.value.slice(0, edit.start) + edit.text + textbox.value.slice(edit.end);
      textbox.selectionStart = edit.selectionStart;
      textbox.selectionEnd = edit.selectionEnd;
      // The page closes popovers on the text box's input event; a Shift+click insertion survives it.
      harness.palette.closePopover();
    },
    mode: "strict",
    onLeave: () => { harness.leaves += 1; },
    isInsideFrame: (node) => harness.frame.has(node),
  });
  harness.root = harness.palette.element as unknown as FakeElement;
  return harness;
}

function button(root: FakeElement, id: string): FakeElement {
  const found = root.children.find((child) => child.getAttribute("data-edit-action") === id);
  assert.ok(found, id);
  return found;
}

function popover(root: FakeElement): FakeElement | undefined {
  return root.children.find((child) => child.getAttribute("role") === "menu");
}

function cell(menu: FakeElement, row: number, col: number): FakeElement {
  const found = menu.all().find((e) =>
    e.getAttribute("data-grid-row") === String(row) && e.getAttribute("data-grid-col") === String(col));
  assert.ok(found);
  return found;
}

function lit(menu: FakeElement): number {
  return menu.all().filter((e) => e.getAttribute("data-grid-on") === "true").length;
}

const click = { preventDefault: () => undefined, stopPropagation: () => undefined };

test("T24: the Table button opens a 9 x 9 grid of 81 cells", () => {
  const { root } = openFull();
  button(root, "table").dispatch("click", click);
  const menu = popover(root)!;
  assert.equal(menu.getAttribute("data-edit-popover"), "grid");
  assert.equal(menu.all().filter((e) => e.getAttribute("data-grid-row") !== null).length, 81);
  assert.equal(lit(menu), 0);
});

test("T24: hovering a cell lights the rectangle from the top left and shows rows x columns", () => {
  const { root } = openFull();
  button(root, "table").dispatch("click", click);
  const menu = popover(root)!;
  menu.dispatch("mouseover", { target: cell(menu, 3, 4) });
  assert.equal(lit(menu), 12);
  assert.equal(cell(menu, 3, 4).getAttribute("data-grid-on"), "true");
  assert.equal(cell(menu, 4, 1).getAttribute("data-grid-on"), null);
  assert.equal(cell(menu, 1, 5).getAttribute("data-grid-on"), null);
  const label = menu.all().find((e) => e.className === "sphinx-preview-edit-grid-label")!;
  assert.equal(label.textContent, "3 \u00d7 4");
  menu.dispatch("mouseover", { target: cell(menu, 1, 1) });
  assert.equal(lit(menu), 1);
  menu.dispatch("mouseover", { target: menu });
  assert.equal(lit(menu), 1, "a hover outside the cells changes nothing");
});

test("T24: one click on a cell inserts the table, closes the grid and returns focus", () => {
  const h = openFull("intro", 5);
  button(h.root, "table").dispatch("click", click);
  const menu = popover(h.root)!;
  menu.dispatch("click", { ...click, target: cell(menu, 3, 2) });
  assert.equal(h.edits.length, 1);
  assert.equal(h.textbox.value, "intro\n\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n|  |  |");
  assert.equal(popover(h.root), undefined);
  assert.equal(h.leaves, 0, "no save");
});

test("T24: a click that is not on a cell inserts nothing and keeps the grid", () => {
  const h = openFull();
  button(h.root, "table").dispatch("click", click);
  const menu = popover(h.root)!;
  menu.dispatch("click", { ...click, target: menu });
  assert.equal(h.edits.length, 0);
  assert.ok(popover(h.root));
});

test("T24: arrows move the highlight from the text box and Enter inserts", () => {
  const h = openFull();
  const key = (name: string) => {
    let prevented = false;
    const consumed = h.palette.handleKey({ key: name, preventDefault: () => { prevented = true; } });
    return { consumed, prevented };
  };
  assert.equal(key("ArrowRight").consumed, false, "nothing is open: not consumed");
  button(h.root, "table").dispatch("click", click);
  const menu = popover(h.root)!;
  assert.deepEqual(key("Enter"), { consumed: true, prevented: true });
  assert.equal(h.edits.length, 0, "Enter before any highlight chooses nothing");
  assert.ok(popover(h.root));
  assert.equal(key("ArrowDown").consumed, true);
  assert.equal(lit(menu), 1);
  key("ArrowRight"); key("ArrowRight"); key("ArrowDown");
  assert.equal(lit(menu), 6, "2 x 3");
  for (let i = 0; i < 12; i += 1) key("ArrowRight");
  assert.equal(lit(menu), 18, "columns stop at 9: 2 x 9");
  for (let i = 0; i < 12; i += 1) key("ArrowLeft");
  key("ArrowUp"); key("ArrowUp");
  assert.equal(lit(menu), 1, "never below 1 x 1");
  key("ArrowDown"); key("ArrowRight");
  key("Enter");
  assert.equal(h.textbox.value, "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |", "2 x 2");
  assert.equal(popover(h.root), undefined);
  assert.equal(h.palette.handleKey({ key: "Enter" }), false);
});

test("T24: Escape closes the grid and the popover never leaves the editor stuck", () => {
  const h = openFull();
  button(h.root, "table").dispatch("click", click);
  assert.equal(h.palette.handleKey({ key: "Escape", preventDefault: () => undefined }), true);
  assert.equal(popover(h.root), undefined);
  button(h.root, "table").dispatch("click", click);
  button(h.root, "table").dispatch("click", click);
  assert.equal(popover(h.root), undefined, "a second click closes it");
  assert.ok(h.textbox.focused > 0, "the text box has the focus");
});

function openEmoji(h: Harness): { menu: FakeElement; field: FakeElement; emojis: FakeElement[] } {
  button(h.root, "emoji").dispatch("click", click);
  const menu = popover(h.root)!;
  const field = menu.all().find((e) => e.tagName === "input")!;
  const emojis = menu.all().filter((e) => e.getAttribute("data-emoji") !== null);
  return { menu, field, emojis };
}

const shown = (emojis: FakeElement[]): FakeElement[] => emojis.filter((e) => e.getAttribute("hidden") === null);

test("T24: the emoji picker has about 150 emoji in 6 categories, each with a title", () => {
  const h = openFull();
  const { menu, field, emojis } = openEmoji(h);
  assert.equal(menu.getAttribute("data-edit-popover"), "emoji");
  assert.equal(field.getAttribute("aria-label"), "Filter emoji");
  assert.equal(emojis.length >= 140 && emojis.length <= 170, true, String(emojis.length));
  assert.equal(menu.all().filter((e) => e.className === "sphinx-preview-edit-emoji-heading").length, 6);
  for (const emoji of emojis) assert.ok(emoji.getAttribute("title"), emoji.textContent);
  for (const wanted of ["\u2705", "\u26a0\ufe0f", "\u274c"]) {
    assert.ok(emojis.some((e) => e.textContent === wanted), wanted);
  }
  assert.equal(emojis.some((e) => /[\u{1F1E6}-\u{1F1FF}]/u.test(e.textContent)), false, "no flags");
  assert.equal(h.textbox.focused, 0, "the filter takes the focus, not the text box");
  assert.equal((field as unknown as { focusCalls: number }).focusCalls, 1);
});

test("T24: the filter matches English names and hides empty categories", () => {
  const h = openFull();
  const { menu, field, emojis } = openEmoji(h);
  field.value = "thumbs";
  field.dispatch("input");
  assert.deepEqual(shown(emojis).map((e) => e.getAttribute("title")), ["thumbs up like", "thumbs down dislike"]);
  const headings = menu.all().filter((e) => e.className === "sphinx-preview-edit-emoji-heading");
  assert.equal(headings.filter((e) => e.getAttribute("hidden") === null).length, 1);
  field.value = "  WARN ";
  field.dispatch("input");
  assert.deepEqual(shown(emojis).map((e) => e.textContent), ["\u26a0\ufe0f"]);
  field.value = "zzz";
  field.dispatch("input");
  assert.equal(shown(emojis).length, 0);
  field.value = "";
  field.dispatch("input");
  assert.equal(shown(emojis).length, emojis.length);
});

test("T24: clicking an emoji inserts it at the caret, replaces a selection and closes", () => {
  const h = openFull("say foo now", 4);
  h.textbox.selectionEnd = 7;
  const { emojis } = openEmoji(h);
  emojis[0].dispatch("click", click);
  assert.equal(h.textbox.value, "say " + emojis[0].textContent + " now");
  assert.equal(h.edits.length, 1);
  assert.equal(popover(h.root), undefined);
  assert.ok(h.textbox.focused > 0);
  assert.equal(h.leaves, 0);
});

test("T24: Shift+click keeps the picker open for the next emoji", () => {
  const h = openFull("", 0);
  const { emojis } = openEmoji(h);
  emojis[0].dispatch("click", { ...click, shiftKey: true });
  emojis[1].dispatch("click", { ...click, shiftKey: true });
  assert.equal(h.textbox.value, emojis[0].textContent + emojis[1].textContent);
  assert.ok(popover(h.root), "still open");
  emojis[2].dispatch("click", click);
  assert.equal(popover(h.root), undefined);
});

test("T24: Enter in the filter inserts the first match; Escape returns to the text box", () => {
  const h = openFull();
  const { field, emojis } = openEmoji(h);
  field.value = "check mark button";
  field.dispatch("input");
  let prevented = false;
  field.dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.textbox.value, "\u2705");
  assert.equal(popover(h.root), undefined);

  const again = openEmoji(h);
  const before = h.textbox.focused;
  again.field.dispatch("keydown", { key: "Escape", preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(popover(h.root), undefined);
  assert.equal(h.textbox.focused, before + 1, "focus goes back to the text box");
  assert.equal(h.leaves, 0);
});

test("T24: leaving the editor frame from the filter saves once; moving inside does not", () => {
  const h = openFull();
  const { field, emojis } = openEmoji(h);
  h.frame.add(emojis[0]);
  field.dispatch("blur", { relatedTarget: emojis[0] });
  assert.equal(h.leaves, 0, "focus moved inside the frame");
  field.dispatch("blur", { relatedTarget: null });
  assert.equal(h.leaves, 1, "focus left: one final save");
  emojis[0].dispatch("blur", { relatedTarget: { outside: true } });
  assert.equal(h.leaves, 2, "the same rule applies to the emoji buttons");
});

test("T24: closing the popover while the filter has the focus does not read as leaving", () => {
  const h = openFull();
  const { field } = openEmoji(h);
  field.dispatch("focus");
  // The popover removes itself and the browser may report a blur with no related target.
  const root = h.root;
  const menu = popover(root)!;
  const remove = menu.remove.bind(menu);
  menu.remove = () => { remove(); field.dispatch("blur", { relatedTarget: null }); };
  const before = h.textbox.focused;
  button(root, "emoji").dispatch("click", click);
  assert.equal(popover(root), undefined);
  assert.equal(h.leaves, 0, "no save from our own removal");
  assert.equal(h.textbox.focused, before + 1, "focus returned to the text box");
});

test("T24: the filter receives mousedown itself; the rest of the popover cancels it", () => {
  const h = openFull();
  const { menu, field, emojis } = openEmoji(h);
  let prevented = false;
  let stopped = false;
  menu.dispatch("mousedown", { target: field, preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
  assert.equal(prevented, false);
  assert.equal(stopped, true, "the bar's focus guard does not see it");
  menu.dispatch("mousedown", { target: emojis[0], preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
});

test("T24: arrow keys move through the visible emoji and back to the filter", () => {
  const h = openFull();
  const { field, emojis } = openEmoji(h);
  const focused: FakeElement[] = [];
  for (const e of emojis) e.focus = () => { focused.push(e); };
  field.focus = () => { focused.push(field); };
  field.dispatch("keydown", { key: "ArrowDown", preventDefault: () => undefined });
  assert.equal(focused.at(-1), emojis[0]);
  emojis[0].dispatch("keydown", { key: "ArrowRight", preventDefault: () => undefined });
  assert.equal(focused.at(-1), emojis[1]);
  emojis[1].dispatch("keydown", { key: "ArrowDown", preventDefault: () => undefined });
  assert.equal(focused.at(-1), emojis[9]);
  emojis[0].dispatch("keydown", { key: "ArrowUp", preventDefault: () => undefined });
  assert.equal(focused.at(-1), field);
});

// T25: the Alert dropdown at the caret.
function openGfm(value = "", caret = 0, rect?: { left: number; top: number; bottom: number }): Harness {
  const textbox = {
    value, selectionStart: caret, selectionEnd: caret, focused: 0,
    focus() { textbox.focused += 1; },
  };
  const harness = { edits: [] as Array<{ start: number; end: number; text: string }>, leaves: 0, frame: new Set<unknown>() } as Harness;
  harness.textbox = textbox;
  harness.palette = createEditPalette(fakeDocument(), {
    actions: createEditActions([], createMarkdownTableTools()),
    getControl: () => textbox,
    ...(rect ? { getCaretRect: () => rect } : {}),
    applyTextEdit: (edit) => {
      harness.edits.push(edit);
      textbox.value = textbox.value.slice(0, edit.start) + edit.text + textbox.value.slice(edit.end);
      textbox.selectionStart = edit.selectionStart;
      textbox.selectionEnd = edit.selectionEnd;
      harness.palette.closePopover();
    },
    mode: "gfm",
    onLeave: () => { harness.leaves += 1; },
    isInsideFrame: (node) => harness.frame.has(node),
  });
  harness.root = harness.palette.element as unknown as FakeElement;
  return harness;
}

const options = (menu: FakeElement): FakeElement[] =>
  menu.all().filter((e) => e.getAttribute("data-edit-option") !== null);

test("T25: strict mode has no GitHub buttons; GFM and MyST show Alert, Checkbox and HTML table", () => {
  const ids = (mode: EditActionMode): string[] => actionIds(open(mode).root);
  for (const id of ["alert", "checkbox", "htmlTable"]) {
    assert.equal(ids("strict").includes(id), false, "strict");
    assert.equal(ids("gfm").includes(id), true, "gfm");
    assert.equal(ids("myst").includes(id), true, "myst");
  }
});

test("T25: Alert writes the alert first, then lists the five types, none lit", () => {
  const h = openGfm("Mind the gap", 4);
  button(h.root, "alert").dispatch("click", click);
  assert.equal(h.textbox.value, "> [!NOTE]\n> Mind the gap");
  assert.equal(h.edits.length, 1);
  const menu = popover(h.root)!;
  assert.ok(menu, "the list stays open through the insertion's input event");
  assert.equal(menu.getAttribute("data-edit-popover"), "alert");
  assert.deepEqual(options(menu).map((e) => e.getAttribute("data-edit-option")),
    ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]);
  assert.deepEqual(options(menu).map((e) => e.textContent), ["Note", "Tip", "Important", "Warning", "Caution"]);
  assert.equal(button(h.root, "alert").getAttribute("aria-expanded"), "true");
});

test("T25: choosing a type changes the head of the alert the caret is in, in one more edit", () => {
  const h = openGfm("Mind the gap", 4);
  button(h.root, "alert").dispatch("click", click);
  const warning = options(popover(h.root)!).find((e) => e.getAttribute("data-edit-option") === "WARNING")!;
  warning.dispatch("click", click);
  assert.equal(h.textbox.value, "> [!WARNING]\n> Mind the gap");
  assert.equal(h.edits.length, 2);
  assert.equal(popover(h.root), undefined);
  assert.equal(button(h.root, "alert").getAttribute("aria-expanded"), "false");
});

test("T25: the dropdown acts on the live selection, not the one at opening time", () => {
  const h = openGfm("one\n\ntwo", 0);
  button(h.root, "alert").dispatch("click", click);
  assert.equal(h.textbox.value, "> [!NOTE]\n> one\n\ntwo");
  // The caret leaves the alert (a mouse click would close the list; a stale script must not insert).
  h.textbox.selectionStart = h.textbox.selectionEnd = h.textbox.value.length;
  const tip = options(popover(h.root)!).find((e) => e.getAttribute("data-edit-option") === "TIP")!;
  tip.dispatch("click", click);
  assert.equal(h.textbox.value.startsWith("> [!NOTE]\n> one\n\n> [!TIP]\n> two"), true,
    "read at pick time: the caret is on the last line, so that line becomes the alert");
});

test("T25: Escape dismisses the dropdown, keeps NOTE and puts the focus in the text box", () => {
  const h = openGfm("x", 1);
  button(h.root, "alert").dispatch("click", click);
  const before = h.textbox.focused;
  let prevented = false;
  assert.equal(h.palette.handleKey({ key: "Escape", preventDefault: () => { prevented = true; } }), true);
  assert.equal(prevented, true);
  assert.equal(popover(h.root), undefined);
  assert.equal(h.textbox.value, "> [!NOTE]\n> x");
  assert.equal(h.textbox.focused > before, true, "focus given back to the text box");
  assert.equal(h.leaves, 0, "no save");
});

test("T25: a second click on Alert closes the list without another edit", () => {
  const h = openGfm("x", 1);
  button(h.root, "alert").dispatch("click", click);
  button(h.root, "alert").dispatch("click", click);
  assert.equal(popover(h.root), undefined);
  assert.equal(h.edits.length, 1);
});

test("T25: Alert on an existing alert only opens the list", () => {
  const h = openGfm("> [!TIP]\n> body", 12);
  button(h.root, "alert").dispatch("click", click);
  assert.equal(h.edits.length, 0);
  assert.ok(popover(h.root));
  options(popover(h.root)!).find((e) => e.getAttribute("data-edit-option") === "CAUTION")!.dispatch("click", click);
  assert.equal(h.textbox.value, "> [!CAUTION]\n> body");
});

test("T25: the list opens at the caret, in the bar's coordinates", () => {
  const h = openGfm("x", 1, { left: 340, top: 120, bottom: 140 });
  button(h.root, "alert").dispatch("click", click);
  const menu = popover(h.root)!;
  assert.equal(menu.getAttribute("data-edit-popover-at"), "caret");
  assert.equal(menu.styles.get("inset-inline-start"), "240px", "340 - 100");
  assert.equal(menu.styles.get("inset-block-start"), "92px", "140 - 50 + 2");
});

test("T25: without a caret position the list opens under its button like the others", () => {
  const h = openGfm("x", 1);
  button(h.root, "alert").dispatch("click", click);
  const menu = popover(h.root)!;
  assert.equal(menu.getAttribute("data-edit-popover-at"), null);
  assert.equal(menu.styles.has("inset-block-start"), false);
});

test("T25: arrows light a type, Enter picks it; moving the caret or typing ends the list", () => {
  const h = openGfm("x", 1);
  button(h.root, "alert").dispatch("click", click);
  const menu = popover(h.root)!;
  const items = options(menu);
  const key = (name: string): boolean => h.palette.handleKey({ key: name, preventDefault: () => undefined });
  assert.equal(key("Enter"), false, "nothing lit: Enter is the text box's");
  assert.equal(key("ArrowDown"), true);
  assert.equal(items[0].getAttribute("data-active"), "true");
  key("ArrowDown");
  key("ArrowDown");
  assert.equal(items[2].getAttribute("data-active"), "true");
  assert.equal(items[0].getAttribute("data-active"), null);
  key("ArrowUp");
  key("ArrowUp");
  key("ArrowUp");
  assert.equal(items[4].getAttribute("data-active"), "true", "wraps");
  assert.equal(key("Enter"), true);
  assert.equal(h.textbox.value, "> [!CAUTION]\n> x");
  assert.equal(popover(h.root), undefined);

  const again = openGfm("y", 1);
  button(again.root, "alert").dispatch("click", click);
  assert.equal(again.palette.handleKey({ key: "ArrowLeft" }), false, "the caret still moves");
  assert.equal(popover(again.root), undefined, "and the list is gone");
});

test("T25: an option holding the focus gives it back on Escape and saves when the frame is left", () => {
  const h = openGfm("x", 1);
  button(h.root, "alert").dispatch("click", click);
  const item = options(popover(h.root)!)[1];
  item.dispatch("focus");
  const before = h.textbox.focused;
  item.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(popover(h.root), undefined);
  assert.equal(h.textbox.focused > before, true);

  const left = openGfm("x", 1);
  button(left.root, "alert").dispatch("click", click);
  const other = options(popover(left.root)!)[0];
  other.dispatch("focus");
  other.dispatch("blur", { relatedTarget: {} });
  assert.equal(left.leaves, 1, "focus left the frame");
});

test("T25: Checkbox and HTML table are one-click actions with no list", () => {
  const h = openGfm("task", 2);
  button(h.root, "checkbox").dispatch("click", click);
  assert.equal(h.textbox.value, "- [ ] task");
  assert.equal(popover(h.root), undefined);
  const t = openGfm("| a | b |\n| --- | --- |\n| 1 | 2 |", 3);
  button(t.root, "htmlTable").dispatch("click", click);
  assert.equal(t.textbox.value.startsWith("<table>"), true);
  assert.equal(popover(t.root), undefined);
});

// T26: the GFM proposals in the palette.
test("T26: the GFM mode lists the five proposals, strict mode none of them", () => {
  const proposals = ["details", "footnote", "mermaid", "columnAlign", "kbd"];
  const strict = actionIds(open("strict").root);
  const gfm = actionIds(open("gfm").root);
  for (const id of proposals) {
    assert.equal(strict.includes(id), false, "strict " + id);
    assert.equal(gfm.includes(id), true, "gfm " + id);
  }
});

test("T26: Column alignment lists left, center and right; a choice rewrites the delimiter cell", () => {
  const h = openGfm("| a | b |\n| --- | --- |\n| 1 | 2 |", 2);
  button(h.root, "columnAlign").dispatch("click", click);
  assert.equal(h.edits.length, 0, "nothing is written before a choice");
  const menu = popover(h.root)!;
  assert.deepEqual(options(menu).map((e) => e.textContent), ["Left", "Center", "Right"]);
  options(menu).find((e) => e.getAttribute("data-edit-option") === "center")!.dispatch("click", click);
  assert.equal(h.textbox.value, "| a | b |\n| :---: | --- |\n| 1 | 2 |");
  assert.equal(popover(h.root), undefined);
});

test("T26: Details, Footnote, Mermaid and Key are one-click actions", () => {
  const h = openGfm("word", 4);
  button(h.root, "footnote").dispatch("click", click);
  assert.equal(h.textbox.value, "word[^1]\n\n[^1]: ");
  const k = openGfm("press Esc", 6);
  k.textbox.selectionEnd = 9;
  button(k.root, "kbd").dispatch("click", click);
  assert.equal(k.textbox.value, "press <kbd>Esc</kbd>");
  assert.equal(popover(k.root), undefined);
});

// T30: host-backed pickers (labels, citations) and the document dialog.
function openHost(options: {
  value?: string;
  caret?: number;
  requestList?: (kind: string, done: (result: { items: Array<{ value: string; label: string; detail?: string }>; truncated?: boolean; error?: string }) => void) => void;
  pickHost?: (kind: string, done: (value: string | undefined) => void) => void;
} = {}) {
  const h = openFull(options.value ?? "", options.caret ?? 0);
  // openFull builds a strict palette; rebuild a MyST one with the host callbacks.
  const palette = createEditPalette(fakeDocument(), {
    actions: createEditActions([], createMarkdownTableTools()),
    getControl: () => h.textbox,
    applyTextEdit: (edit) => {
      h.edits.push(edit);
      h.textbox.value = h.textbox.value.slice(0, edit.start) + edit.text + h.textbox.value.slice(edit.end);
      palette.closePopover();
    },
    mode: "myst",
    onLeave: () => { h.leaves += 1; },
    isInsideFrame: (node) => h.frame.has(node),
    ...(options.requestList ? { requestList: options.requestList } : {}),
    ...(options.pickHost ? { pickHost: options.pickHost } : {}),
  });
  h.palette = palette;
  h.root = palette.element as unknown as FakeElement;
  return h;
}

const choiceButtons = (menu: FakeElement): FakeElement[] =>
  menu.all().filter((e) => e.getAttribute("data-edit-option") !== null);

test("T30: Reference opens a filter popover, lists the host's labels and inserts the chosen one", () => {
  let asked = "";
  let answer: ((result: { items: Array<{ value: string; label: string; detail?: string }> }) => void) | undefined;
  const h = openHost({
    value: "see ", caret: 4,
    requestList: (kind, done) => { asked = kind; answer = done; },
  });
  button(h.root, "ref").dispatch("click", click);
  const menu = popover(h.root)!;
  assert.equal(asked, "targets");
  assert.equal(menu.getAttribute("data-edit-popover"), "choices");
  assert.equal(choiceButtons(menu).length, 0, "nothing is listed before the host answers");
  assert.match(menu.all().map((e) => e.textContent).join(" "), /Loading/u);
  answer!({ items: [
    { value: "intro", label: "intro", detail: "Introduction" },
    { value: "setup-steps", label: "setup-steps" },
  ] });
  assert.deepEqual(choiceButtons(menu).map((e) => e.getAttribute("data-edit-option")), ["intro", "setup-steps"]);
  // Filter: matches the name and the detail.
  const field = menu.all().find((e) => e.tagName === "input")!;
  field.value = "introd";
  field.dispatch("input");
  const visible = choiceButtons(menu).filter((e) => e.getAttribute("hidden") === null);
  assert.deepEqual(visible.map((e) => e.getAttribute("data-edit-option")), ["intro"]);
  visible[0].dispatch("click", click);
  assert.equal(h.textbox.value, "see {ref}`intro`");
  assert.equal(popover(h.root), undefined);
});

test("T30: Enter in the filter picks the first match; Escape closes", () => {
  const h = openHost({
    requestList: (_kind, done) => done({ items: [{ value: "k1", label: "k1" }, { value: "k2", label: "k2" }] }),
  });
  button(h.root, "cite").dispatch("click", click);
  const menu = popover(h.root)!;
  const field = menu.all().find((e) => e.tagName === "input")!;
  field.value = "k2";
  field.dispatch("input");
  field.dispatch("keydown", { key: "Enter", preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(h.textbox.value, "{cite}`k2`");
  button(h.root, "cite").dispatch("click", click);
  assert.equal(h.palette.handleKey({ key: "Escape", preventDefault: () => undefined }), true);
  assert.equal(popover(h.root), undefined);
});

test("T30: an empty list or a host error is said in the popover; a late answer after closing is ignored", () => {
  const empty = openHost({ requestList: (_kind, done) => done({ items: [] }) });
  button(empty.root, "ref").dispatch("click", click);
  assert.match(popover(empty.root)!.all().map((e) => e.textContent).join(" "), /No label/u);
  const failed = openHost({ requestList: (_kind, done) => done({ items: [], error: "Open a trusted workspace." }) });
  button(failed.root, "cite").dispatch("click", click);
  assert.match(popover(failed.root)!.all().map((e) => e.textContent).join(" "), /trusted workspace/u);
  let late: ((result: { items: Array<{ value: string; label: string }> }) => void) | undefined;
  const closed = openHost({ requestList: (_kind, done) => { late = done; } });
  button(closed.root, "ref").dispatch("click", click);
  closed.palette.closePopover();
  late!({ items: [{ value: "x", label: "x" }] });
  assert.equal(popover(closed.root), undefined);
});

test("T30: Document asks the host for a file and inserts the path; a cancelled pick inserts nothing", () => {
  let done: ((value: string | undefined) => void) | undefined;
  let asked = "";
  const h = openHost({ value: "read ", caret: 5, pickHost: (kind, callback) => { asked = kind; done = callback; } });
  button(h.root, "doc").dispatch("click", click);
  assert.equal(asked, "document");
  assert.equal(popover(h.root), undefined, "no popover: the host shows its own dialog");
  done!("../guide/setup");
  assert.equal(h.textbox.value, "read {doc}`../guide/setup`");
  button(h.root, "doc").dispatch("click", click);
  const before = h.textbox.focused;
  done!(undefined);
  assert.equal(h.edits.length, 1);
  assert.ok(h.textbox.focused > before, "the focus goes back to the text box");
});

test("T31: Image asks the host for an image file and inserts the reference; a failed pick inserts nothing", () => {
  let done: ((value: string | undefined) => void) | undefined;
  let asked = "";
  const h = openHost({ value: "see ", caret: 4, pickHost: (kind, callback) => { asked = kind; done = callback; } });
  button(h.root, "image").dispatch("click", click);
  assert.equal(asked, "image");
  done!("img/logo.png");
  assert.equal(h.textbox.value, "see ![logo](img/logo.png)");
  button(h.root, "figure").dispatch("click", click);
  assert.equal(asked, "image");
  done!(undefined);
  assert.equal(h.edits.length, 1);
});
