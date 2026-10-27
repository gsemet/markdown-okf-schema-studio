/**
 * Requirement tests of the edition palette's popovers (`editPalette.ts`, `editPalettePopovers.ts`)
 * and of the paste modules (`pasteImage.ts`, `pasteHtml.ts`), through the same fake DOM the
 * palette tests use. Each test asserts the behaviour of the current code.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../../src/page/modules/editActions";
import type { EditActionMode, EditActionRegistry } from "../../../src/page/modules/editActions";
import { createEditPalette } from "../../../src/page/modules/editPalette";
import { installPasteHtml } from "../../../src/page/modules/pasteHtml";
import { installPasteImage, type PasteImageWindow } from "../../../src/page/modules/pasteImage";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { isSafeOkfColor } from "../../../src/core/security/spanColors";

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
  public readonly style = { setProperty: (): void => undefined };
  public getBoundingClientRect(): { left: number; top: number } { return { left: 100, top: 50 }; }
  public constructor(public readonly tagName: string) {}
  public setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  public getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  public removeAttribute(name: string): void { this.attributes.delete(name); }
  public focus(): void { /* focus is counted on the text box */ }
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

const fakeDocument = (): Document => ({ createElement: (tag: string) => new FakeElement(tag) } as unknown as Document);
const click = { preventDefault: () => undefined, stopPropagation: () => undefined };

interface HostList { items: Array<{ value: string; label: string; detail?: string }>; truncated?: boolean }

function open(options: {
  mode?: EditActionMode;
  registry?: EditActionRegistry;
  value?: string;
  caret?: number;
  end?: number;
  requestList?: (kind: string, done: (result: HostList) => void) => void;
  onModeChange?: (mode: EditActionMode) => void;
} = {}) {
  const caret = options.caret ?? 0;
  const textbox = {
    value: options.value ?? "", selectionStart: caret, selectionEnd: options.end ?? caret, focused: 0,
    focus() { textbox.focused += 1; },
  };
  const done = { count: 0 };
  const palette = createEditPalette(fakeDocument(), {
    actions: options.registry ?? createEditActions([], createMarkdownTableTools(), isSafeOkfColor),
    getControl: () => textbox,
    applyTextEdit: (edit) => {
      textbox.value = textbox.value.slice(0, edit.start) + edit.text + textbox.value.slice(edit.end);
      palette.closePopover();
    },
    mode: options.mode ?? "strict",
    onDone: () => { done.count += 1; },
    ...(options.requestList ? { requestList: options.requestList } : {}),
    ...(options.onModeChange ? { onModeChange: options.onModeChange } : {}),
  });
  return { palette, root: palette.element as unknown as FakeElement, textbox, done };
}

const button = (root: FakeElement, id: string): FakeElement => {
  const found = root.children.find((child) => child.getAttribute("data-edit-action") === id);
  assert.ok(found, id);
  return found;
};
const popover = (root: FakeElement): FakeElement | undefined =>
  root.children.find((child) => child.getAttribute("role") === "menu");
const byAttr = (menu: FakeElement, name: string): FakeElement[] => menu.all().filter((e) => e.getAttribute(name) !== null);

function openColourField(value = "say foo now") {
  const h = open({ value, caret: 4, end: 7 });
  button(h.root, "color").dispatch("click", click);
  const menu = popover(h.root)!;
  const field = byAttr(menu, "data-color-hex")[0]!;
  field.dispatch("focus");
  return { ...h, menu, field };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-031
test("Escape in the colour code field closes the picker and gives the focus back to the text box", () => {
  const h = openColourField();
  const focused = h.textbox.focused;
  let stopped = false;
  h.field.dispatch("keydown", { key: "Escape", preventDefault: () => undefined, stopPropagation: () => { stopped = true; } });
  assert.equal(popover(h.root), undefined, "the picker is closed");
  assert.equal(h.textbox.focused, focused + 1, "the text box has the focus");
  assert.equal(stopped, true, "the key does not reach the editor, whose next Escape cancels it");
  assert.equal(h.done.count, 0, "the editor is not finished");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-036
test("Cmd or Ctrl with Enter in the colour code field closes the picker and finishes the edit; plain Enter applies", () => {
  for (const modifier of ["ctrlKey", "metaKey"]) {
    const h = openColourField();
    h.field.value = "not a colour";
    h.field.dispatch("keydown", { key: "Enter", [modifier]: true, ...click });
    assert.equal(popover(h.root), undefined, modifier + " closes the picker");
    assert.equal(h.done.count, 1, modifier + " finishes the edit");
    assert.equal(h.textbox.value, "say foo now", "nothing is applied");
  }
  const plain = openColourField();
  plain.field.value = "#12ab34";
  plain.field.dispatch("keydown", { key: "Enter", ...click });
  assert.equal(plain.textbox.value, 'say <span style="color:#12ab34">foo</span> now');
  assert.equal(plain.done.count, 0, "the editor stays open");
});

test("a button that owns a popover announces it with aria-haspopup and an aria-expanded that follows the popover", () => {
  const { root } = open();
  const heading = button(root, "heading");
  assert.equal(heading.getAttribute("aria-haspopup"), "menu");
  assert.equal(heading.getAttribute("aria-expanded"), "false");
  heading.dispatch("click", click);
  assert.ok(popover(root));
  assert.equal(heading.getAttribute("aria-expanded"), "true");
  heading.dispatch("click", click);
  assert.equal(popover(root), undefined);
  assert.equal(heading.getAttribute("aria-expanded"), "false");
  assert.equal(button(root, "bold").getAttribute("aria-haspopup"), null, "a button without a popover is not marked");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-001
test("a select value outside the three modes is put back to the current mode and reported nothing", () => {
  const changes: string[] = [];
  const { root } = open({ mode: "gfm", onModeChange: (mode) => changes.push(mode) });
  const select = root.children.find((child) => child.tagName === "select")!;
  assert.equal(select.value, "gfm");
  select.value = "latex";
  select.dispatch("change");
  assert.equal(select.value, "gfm");
  assert.equal(root.getAttribute("data-palette-mode"), "gfm");
  assert.deepEqual(changes, []);
  select.value = "strict";
  select.dispatch("change");
  assert.deepEqual(changes, ["strict"]);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-140
test("a truncated Reference list ends with the note that more entries exist; a complete one has none", () => {
  const items = [{ value: "intro", label: "intro" }, { value: "setup", label: "setup" }];
  const noteOf = (truncated: boolean | undefined): FakeElement[] => {
    const h = open({
      mode: "myst",
      requestList: (_kind, done) => done({ items, ...(truncated === undefined ? {} : { truncated }) }),
    });
    button(h.root, "ref").dispatch("click", click);
    return popover(h.root)!.all().filter((e) => e.className === "sphinx-preview-edit-choice-note");
  };
  const truncated = noteOf(true);
  assert.equal(truncated.length, 1);
  assert.equal(truncated[0].textContent, "More entries exist. Type to narrow the list.");
  const list = truncated[0].parent!;
  assert.equal(list.children.at(-1), truncated[0], "the note is the last line of the list");
  assert.equal(noteOf(false).length, 0);
  assert.equal(noteOf(undefined).length, 0);
});

interface PasteEnvironment { reader: { onload?: () => void; onerror?: () => void; result?: string } }

function pasteWindow(): { window: PasteImageWindow; env: PasteEnvironment } {
  const env: PasteEnvironment = { reader: {} };
  class FakeReader {
    public result: string | undefined;
    public onload: (() => void) | undefined;
    public onerror: (() => void) | undefined;
    public constructor() { env.reader = this; }
    public readAsDataURL(_file: Blob): void { /* the test fires onload or onerror itself */ }
  }
  return { window: { FileReader: FakeReader }, env };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-203
test("a pasted image that cannot be read shows The image could not be read. and posts nothing; a closed editor is left alone", () => {
  for (const current of [true, false]) {
    const { window, env } = pasteWindow();
    const statuses: string[] = [];
    let sent = 0;
    let prevented = false;
    const taken = installPasteImage(window).handle({
      clipboardData: {
        getData: () => "",
        items: [{ kind: "file", type: "image/png", getAsFile: () => ({ type: "image/png", size: 8 }) }],
      },
      preventDefault: () => { prevented = true; },
    }, { selectionStart: 0, selectionEnd: 0 }, {
      send: () => { sent += 1; },
      status: (text) => statuses.push(text),
      insert: () => undefined,
      isCurrent: () => current,
      restoreStatus: () => undefined,
    });
    assert.equal(taken, true);
    assert.equal(prevented, true);
    assert.deepEqual(statuses, ["Saving image…"]);
    env.reader.onerror!();
    assert.deepEqual(statuses, current ? ["Saving image…", "The image could not be read."] : ["Saving image…"]);
    assert.equal(sent, 0);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-090
test("a rich text conversion answered after the editor closed inserts nothing; an open editor gets the Markdown", () => {
  for (const current of [false, true]) {
    let answer: ((result: { ok?: boolean; markdown?: unknown }) => void) | undefined;
    const inserted: Array<[string, number, number]> = [];
    const taken = installPasteHtml().handle({
      clipboardData: { getData: (type: string) => (type === "text/html" ? "<b>x</b>" : "x") },
      preventDefault: () => undefined,
    }, { selectionStart: 2, selectionEnd: 3 }, {
      send: (_html, done) => { answer = done; },
      insert: (text, start, end) => inserted.push([text, start, end]),
      isCurrent: () => current,
    });
    assert.equal(taken, true);
    answer!({ ok: true, markdown: "**x**" });
    assert.deepEqual(inserted, current ? [["**x**", 2, 3]] : []);
  }
});
