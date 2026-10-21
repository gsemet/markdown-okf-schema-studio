import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../src/webview/editActions";
import type { EditActionMode } from "../../src/webview/editActions";
import { createEditPalette } from "../../src/webview/editPalette";
import type { EditPaletteMenuEntry } from "../../src/webview/editPalette";
import { createMarkdownTableTools } from "../../src/webview/markdownTable";
import { createSlashMenu } from "../../src/webview/slashMenu";
import type { TextEdit } from "../../src/webview/textEditing";
import { isSafeOkfColor } from "../../src/webview/spanColors";
import { FakeDocument, FakeElement } from "./fakeDom";

/** A text box that applies edits like the page's native path: one replacement per call. */
class FakeBox {
  public selectionStart = 0;
  public selectionEnd = 0;
  public readonly attrs = new Map<string, string>();
  public readonly edits: TextEdit[] = [];
  public caret = { left: 140, top: 120, bottom: 138 };
  public constructor(public value = "") {
    this.selectionStart = value.length;
    this.selectionEnd = value.length;
  }
  public focus(): void {}
  public setAttribute(name: string, value: string): void { this.attrs.set(name, value); }
  public removeAttribute(name: string): void { this.attrs.delete(name); }
  public getBoundingClientRect() { return { left: 100, top: 100, bottom: 400 }; }
  public apply(edit: TextEdit): void {
    this.edits.push(edit);
    this.value = this.value.slice(0, edit.start) + edit.text + this.value.slice(edit.end);
    this.selectionStart = edit.selectionStart;
    this.selectionEnd = edit.selectionEnd;
  }
}

class FakeWindow {
  public innerHeight = 800;
  public innerWidth = 1000;
  public readonly listeners = new Map<string, Array<() => void>>();
  public addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  public removeEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== listener));
  }
  public fire(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener(); }
}

interface Setup {
  doc: FakeDocument;
  box: FakeBox;
  win: FakeWindow;
  palette: ReturnType<typeof createEditPalette>;
  slash: ReturnType<typeof createSlashMenu>;
  panels: string[];
  hostPicks: string[];
  type(text: string): void;
  key(key: string, extra?: Record<string, unknown>): { consumed: boolean; prevented: number };
  menu(): FakeElement | undefined;
  ids(): string[];
  active(): string | null;
}

const tools = createMarkdownTableTools();

function setup(mode: EditActionMode, initial = "", scope: "block" | "cell" = "block"): Setup {
  const doc = new FakeDocument();
  const box = new FakeBox(initial);
  const win = new FakeWindow();
  const panels: string[] = [];
  const hostPicks: string[] = [];
  const palette = createEditPalette(doc as unknown as Document, {
    actions: createEditActions(["python", "js"], tools, isSafeOkfColor),
    getControl: () => box,
    applyTextEdit: (edit) => box.apply(edit),
    openPanel: (action) => { panels.push(action.id); },
    pickHost: (kind, done) => { hostPicks.push(kind); done("pic.png"); },
    mode,
    scope,
  });
  const slash = createSlashMenu(doc as unknown as Document, win as unknown as Window, {
    getControl: () => box,
    getEntries: () => palette.menuEntries(),
    run: (key, range) => palette.runMenuEntry(key, range),
    getCaretRect: () => box.caret,
  });
  const menu = (): FakeElement | undefined => doc.body.querySelector("[data-slash-menu]") ?? undefined;
  return {
    doc, box, win, palette, slash, panels, hostPicks, menu,
    type(text) {
      for (const char of text) {
        const at = box.selectionStart;
        box.value = box.value.slice(0, at) + char + box.value.slice(box.selectionEnd);
        box.selectionStart = at + 1;
        box.selectionEnd = at + 1;
        slash.handleInput({ data: char, inputType: "insertText" });
      }
    },
    key(key, extra = {}) {
      let prevented = 0;
      const consumed = slash.handleKey({ key, preventDefault: () => { prevented += 1; }, stopPropagation: () => undefined, ...extra });
      return { consumed, prevented };
    },
    ids: () => (menu()?.querySelectorAll("[data-slash-id]") ?? []).map((option) => option.getAttribute("data-slash-id") ?? ""),
    active: () => menu()?.querySelectorAll("[data-slash-id]").find((option) => option.getAttribute("aria-selected") === "true")?.getAttribute("data-slash-id") ?? null,
  };
}

function backspace(h: Setup): void {
  const at = h.box.selectionStart;
  h.box.value = h.box.value.slice(0, at - 1) + h.box.value.slice(at);
  h.box.selectionStart = at - 1;
  h.box.selectionEnd = at - 1;
  h.slash.handleInput({ data: null, inputType: "deleteContentBackward" });
}

/** Calls the listeners registered on the element (the fake `fire` only reaches the document). */
function emit(element: FakeElement, type: string, event: Record<string, unknown> = {}): void {
  for (const listener of element.listeners.get(type) ?? []) {
    listener({ preventDefault: () => undefined, stopPropagation: () => undefined, ...event });
  }
}

function reset(h: Setup): void {
  h.slash.close();
  h.box.value = "";
  h.box.selectionStart = h.box.selectionEnd = 0;
}

const buttonIds = (root: FakeElement): string[] =>
  root.childNodes.flatMap((child) => {
    const id = (child as FakeElement).getAttribute?.("data-edit-action");
    return id ? [id] : [];
  });

// ---------------------------------------------------------------------------------------------
// Trigger rules

test("P11: a slash at a line start or after whitespace may open the menu, other slashes may not", () => {
  const { slash } = setup("gfm");
  assert.equal(slash.canOpenAt("/", 0), true);
  assert.equal(slash.canOpenAt("word /", 5), true);
  assert.equal(slash.canOpenAt("line\n/", 5), true);
  assert.equal(slash.canOpenAt("a/b", 1), false, "a path");
  assert.equal(slash.canOpenAt("see http://x", 10), false, "the second slash of a scheme");
  assert.equal(slash.canOpenAt("see http://x", 9), false, "the first slash of a scheme");
  assert.equal(slash.canOpenAt("</div>", 1), false);
  assert.equal(slash.canOpenAt("//", 1), false, "typing // does not open it");
});

test("P11: no menu inside inline code, a fenced block or a fence info string", () => {
  const { slash } = setup("gfm");
  assert.equal(slash.canOpenAt("`a /`", 3), false, "inside a code span with its closing tick after the caret");
  assert.equal(slash.canOpenAt("``a ` /``", 7), false, "a double-tick span");
  assert.equal(slash.canOpenAt("`a` /", 4), true, "after a closed span");
  assert.equal(slash.canOpenAt("`a /", 3), true, "an unmatched tick is no span");
  assert.equal(slash.canOpenAt("```js\n/\n```", 6), false, "inside a fence");
  assert.equal(slash.canOpenAt("```js\nx\n```\n/", 12), true, "after a closed fence");
  assert.equal(slash.canOpenAt("~~~\n  /", 6), false, "a tilde fence");
  assert.equal(slash.canOpenAt("```js /", 6), false, "the info string");
  assert.equal(slash.canOpenAt("`a\n\n/ `", 4), true, "a blank line ends the paragraph");
});

test("P11: typing a slash opens the menu; a slash in a word, URL or code does not", () => {
  let h = setup("gfm");
  h.type("/");
  assert.ok(h.menu(), "opened");
  h = setup("gfm");
  h.type("path/");
  assert.equal(h.menu(), undefined);
  h = setup("gfm");
  h.type("http://");
  assert.equal(h.menu(), undefined);
  h = setup("gfm", "`code ");
  h.type("/");
  assert.ok(h.menu(), "an unmatched tick is no code span");
  h = setup("gfm", "`code  `");
  h.box.selectionStart = h.box.selectionEnd = 6;
  h.type("/");
  assert.equal(h.menu(), undefined, "inside the span");
  h = setup("gfm", "```\n");
  h.type("/");
  assert.equal(h.menu(), undefined, "inside a fenced block being edited");
});

test("P11: // and / followed by a space close the menu; a paste or composition does not open it", () => {
  let h = setup("gfm");
  h.type("/");
  h.type("/");
  assert.equal(h.menu(), undefined, "// closes");
  h = setup("gfm");
  h.type("/ ");
  assert.equal(h.menu(), undefined, "/ plus space closes");
  h = setup("gfm");
  h.box.value = "/";
  h.box.selectionStart = h.box.selectionEnd = 1;
  h.slash.handleInput({ data: null, inputType: "insertFromPaste" });
  assert.equal(h.menu(), undefined, "paste");
  h.slash.handleInput({ data: "/", inputType: "insertCompositionText", isComposing: true });
  assert.equal(h.menu(), undefined, "composition");
  h = setup("gfm");
  h.type("/");
  h.slash.handleInput({ data: "h", inputType: "insertCompositionText", isComposing: true });
  assert.equal(h.menu(), undefined, "a composition started while open closes it");
});

test("P11: a slash typed while text is selected does not open the menu", () => {
  const g = setup("gfm", "x /");
  g.box.selectionStart = 2;
  g.box.selectionEnd = 4;
  g.slash.handleInput({ data: "/", inputType: "insertText" });
  assert.equal(g.menu(), undefined);
});

// ---------------------------------------------------------------------------------------------
// One source of truth: the palette's registry and mode filter

test("P11: the menu lists exactly the actions of the palette for each mode", () => {
  const expected: Record<string, string[]> = {};
  for (const mode of ["strict", "gfm", "myst"] as const) {
    const h = setup(mode);
    const buttons = buttonIds(h.palette.element as unknown as FakeElement);
    assert.equal(buttons.includes("bulletList") || buttons.includes("numberedList"), false, "the list entries have no button");
    const fromPalette = buttons.filter((id) => id !== "colorCode");
    const fromMenu = [...new Set(h.palette.menuEntries().map((entry) => entry.id))];
    // The palette's actions in the same order, plus exactly the two menu-only list entries.
    assert.deepEqual(fromMenu.filter((id) => id !== "bulletList" && id !== "numberedList"), fromPalette, mode + ": same actions, same order");
    assert.deepEqual(fromMenu.filter((id) => id === "bulletList" || id === "numberedList"), ["bulletList", "numberedList"]);
    expected[mode] = fromMenu;
    h.type("/");
    assert.deepEqual([...new Set(h.ids().map((key) => key.split(":")[0]))].sort(), [...fromPalette, "bulletList", "numberedList"].sort(), mode + ": the open menu");
  }
  assert.equal(expected.strict.includes("alert"), false);
  assert.equal(expected.gfm.includes("alert"), true);
  assert.equal(expected.gfm.includes("admonition"), false);
  assert.equal(expected.myst.includes("admonition"), true);
  assert.equal(expected.myst.includes("figure"), true);
});

test("P11: the table cell palette lists only the actions allowed in a cell", () => {
  const h = setup("myst", "", "cell");
  const entries = h.palette.menuEntries();
  const ids = [...new Set(entries.map((entry) => entry.id))];
  assert.deepEqual(ids, buttonIds(h.palette.element as unknown as FakeElement).filter((id) => id !== "colorCode"));
  assert.equal(ids.includes("bulletList") || ids.includes("numberedList"), false, "no list entries in a cell");
  for (const blockOnly of ["table", "codeFence", "quote", "rule", "alert", "admonition", "figure", "image"]) {
    assert.equal(ids.includes(blockOnly), false, blockOnly + " is a block action");
  }
  assert.equal(ids.includes("bold"), true);
});

test("P11: heading is offered as Heading 1 to 5 and Paragraph, alerts and admonitions as their types", () => {
  const entries = setup("myst").palette.menuEntries();
  const keys = entries.map((entry) => entry.key);
  assert.equal(keys.includes("heading"), false, "the level popover itself is not listed");
  assert.deepEqual(keys.filter((key) => key.startsWith("heading:")), ["heading:1", "heading:2", "heading:3", "heading:4", "heading:5", "heading:0"]);
  assert.equal(keys.includes("alert"), true);
  assert.equal(keys.includes("alert:WARNING"), true);
  assert.equal(keys.includes("admonition:note"), true);
  assert.equal(keys.includes("codeFence"), true, "pickers stay listed as their palette button");
  const heading = entries.find((entry) => entry.key === "heading:2")!;
  assert.deepEqual(heading.aliases, ["h2", "heading2"]);
  assert.equal(heading.group, "block");
  assert.ok(heading.icon.includes("<svg"));
});

test("P11: the colour-code button is listed only with the caret inside a colour code", () => {
  const plain = setup("strict", "text ");
  assert.equal(plain.palette.menuEntries().some((entry) => entry.id === "colorCode"), false);
  const inside = setup("strict", "a #ff0000 b");
  inside.box.selectionStart = inside.box.selectionEnd = 4;
  assert.equal(inside.palette.menuEntries().some((entry) => entry.id === "colorCode"), true);
});

// ---------------------------------------------------------------------------------------------
// Ranking

test("P11: ranking puts a prefix before a word start before a subsequence", () => {
  const { slash } = setup("gfm");
  const entry = (label: string, aliases: string[] = []): EditPaletteMenuEntry =>
    ({ key: label, id: label, label, group: "block", icon: "", shortcut: "", aliases });
  const entries = [entry("Xaxlxp"), entry("Zebra Alpha"), entry("Alpine"), entry("Other", ["alp"]), entry("Nothing")];
  assert.deepEqual(slash.match("alp", entries).map((item) => item.label), ["Other", "Alpine", "Zebra Alpha"],
    "a subsequence must start at a word start: Xaxlxp no longer matches");
  assert.deepEqual(slash.match("cbl", [entry("Code block"), entry("Cable")]).map((item) => item.label), ["Cable", "Code block"]);
  assert.deepEqual(slash.match("hz", [entry("Horizontal rule")]), [], "two scattered letters never match");
  assert.deepEqual(slash.match("tdo", [entry("Custom admonition")]).map((item) => item.label), [],
    "scattered letters are not a match (t..d..o)");
  assert.deepEqual(slash.match("", entries).map((item) => item.label), entries.map((item) => item.label), "no query keeps the order");
  assert.deepEqual(slash.match("ALPINE", entries).map((item) => item.label), ["Alpine"], "case-insensitive");
  assert.deepEqual(slash.match("q", entries), [], "no match");
  assert.deepEqual(slash.match("a", entries).map((item) => item.label), ["Alpine", "Other", "Zebra Alpha", "Xaxlxp"],
    "one letter: prefix, word start, then contained");
});

test("P11: the registry's aliases find the expected command first", () => {
  const first = (mode: EditActionMode, query: string): string | undefined => {
    const h = setup(mode);
    return h.slash.match(query, h.palette.menuEntries())[0]?.key;
  };
  assert.equal(first("strict", "h1"), "heading:1");
  assert.equal(first("strict", "h2"), "heading:2");
  assert.equal(first("strict", "h3"), "heading:3");
  assert.equal(first("strict", "title"), "heading:1");
  assert.equal(first("strict", "table"), "table");
  assert.equal(first("strict", "tab"), "table");
  assert.equal(first("strict", "code"), "codeFence");
  assert.equal(first("strict", "quote"), "quote");
  assert.equal(first("strict", "hr"), "rule");
  assert.equal(first("strict", "link"), "link");
  assert.equal(first("strict", "image"), "image");
  assert.equal(first("strict", "bold"), "bold");
  assert.equal(first("gfm", "todo"), "todo", "the TODO comment, an exact label");
  assert.equal(first("gfm", "task"), "todo");
  assert.equal(first("gfm", "note"), "alert:NOTE");
  assert.equal(first("gfm", "tip"), "alert:TIP");
  assert.equal(first("gfm", "warning"), "alert:WARNING");
  assert.equal(first("gfm", "mermaid"), "mermaid");
  assert.equal(first("myst", "math"), "math");
  assert.equal(first("myst", "figure"), "figure");
  assert.equal(first("myst", "ref"), "ref");
  assert.equal(first("myst", "admonition"), "admonition", "the picker itself");
  assert.equal(first("myst", "cite"), "cite");
  assert.equal(first("strict", "mermaid"), undefined, "a GFM command is not in Strict");
  assert.equal(first("strict", "zzzz"), undefined);
});

// ---------------------------------------------------------------------------------------------
// Keyboard, mouse, accessibility

test("P11: the arrows move through the list and wrap; typing filters and resets the highlight", () => {
  const h = setup("gfm");
  h.type("/");
  const all = h.ids();
  assert.ok(all.length > 20);
  assert.equal(all[0], "heading:1");
  assert.equal(h.active(), all[0]);
  assert.equal(h.key("ArrowDown").consumed, true);
  assert.equal(h.active(), all[1]);
  h.key("ArrowUp");
  h.key("ArrowUp");
  assert.equal(h.active(), all[all.length - 1], "wraps to the end");
  h.key("ArrowDown");
  assert.equal(h.active(), all[0], "and back to the start");
  h.key("ArrowDown");
  h.type("h");
  assert.equal(h.active(), h.ids()[0], "a new query highlights the best match");
  h.type("2");
  assert.equal(h.ids()[0], "heading:2");
});

test("P11: the empty query groups by category, a query lists best match first with the category", () => {
  const h = setup("myst");
  h.type("/");
  const groups = h.menu()!.querySelectorAll("[data-slash-group]").map((group) => group.getAttribute("data-slash-group"));
  assert.deepEqual(groups, ["block", "inline", "insert", "annotation", "github", "myst"], "each category once, in order of appearance");
  const headings = h.menu()!.querySelectorAll("[role]").filter((node) => node.getAttribute("role") === "group").length;
  assert.equal(headings, groups.length);
  h.type("n");
  assert.equal(h.menu()!.querySelectorAll("[data-slash-group]").length, 0, "flat while filtering");
});

test("P11: Enter applies the highlighted command and removes the /query text in one native edit", () => {
  const h = setup("strict", "Intro\n");
  h.type("/h2");
  const outcome = h.key("Enter");
  assert.equal(outcome.consumed, true);
  assert.equal(outcome.prevented, 1);
  assert.equal(h.box.value, "Intro\n## ");
  assert.equal(h.box.selectionStart, 9);
  assert.equal(h.box.edits.length, 1, "one undo step");
  assert.equal(h.menu(), undefined, "closed");
  assert.equal(h.box.attrs.size, 0, "aria attributes removed");
});

test("P11: Tab applies too, and the menu runs the action as its palette button does", () => {
  // [mode, typed query, action id, text before the slash]
  const cases: Array<[EditActionMode, string, string, string]> = [
    ["strict", "quote", "quote", "Intro\n"],
    ["strict", "hr", "rule", "Intro\n"],
    ["strict", "bold", "bold", "Intro "],
    ["strict", "italic", "italic", "Intro "],
    ["gfm", "checkbox", "checkbox", "Intro\n"],
    ["gfm", "collapsible", "details", "Intro\n"],
    ["gfm", "mermaid", "mermaid", "Intro\n"],
    ["gfm", "footnote", "footnote", "Intro "],
    ["myst", "dl", "deflist", "Intro\n"],
    ["myst", "label", "label", "Intro\n"],
    ["myst", "subscript", "sub", "Intro "],
  ];
  for (const [mode, query, id, before] of cases) {
    const viaMenu = setup(mode, before);
    viaMenu.type("/" + query);
    assert.equal(viaMenu.ids()[0], id, query + " finds " + id);
    assert.equal(viaMenu.key("Tab").consumed, true);
    const viaButton = setup(mode, before);
    const button = (viaButton.palette.element as unknown as FakeElement).childNodes
      .find((child) => (child as FakeElement).getAttribute?.("data-edit-action") === id) as FakeElement;
    emit(button, "click");
    assert.equal(viaMenu.box.value, viaButton.box.value, id + ": same Markdown");
    assert.equal(viaMenu.box.selectionStart, viaButton.box.selectionStart, id + ": same caret");
    assert.equal(viaMenu.box.selectionEnd, viaButton.box.selectionEnd, id + ": same selection");
    assert.equal(viaMenu.box.edits.length, 1, id + ": one undo step");
  }
});

test("P11: variants write what choosing the option in the palette popover writes", () => {
  const h = setup("gfm", "Intro\n");
  h.type("/warning");
  h.key("Enter");
  assert.equal(h.box.value, "Intro\n> [!WARNING]\n> ");
  assert.equal(h.box.edits.length, 1);
  const m = setup("myst", "");
  m.type("/tip adm");
  assert.ok(m.menu() === undefined, "a space ended the command");
  const n = setup("myst", "");
  n.type("/");
  n.type("tip");
  assert.equal(n.ids()[0], "alert:TIP");
  n.key("ArrowDown");
  assert.equal(n.active(), "admonition:tip");
  n.key("Enter");
  assert.match(n.box.value, /^:::\{tip\}/u);
  assert.equal(n.box.edits.length, 1);
});

test("P11: the query is removed from the middle of a text and the rest stays", () => {
  const h = setup("strict", "first\nsecond");
  h.box.selectionStart = h.box.selectionEnd = 6;
  h.type("/h1");
  h.key("Enter");
  assert.equal(h.box.value, "first\n# second");
  const g = setup("strict", "word ");
  g.type("/h3");
  g.key("Enter");
  assert.equal(g.box.value, "### word ", "the heading applies to the line");
});

test("P11: a command with a picker removes the /query then behaves like its palette button", () => {
  const table = setup("strict", "Intro\n");
  table.type("/table");
  table.key("Enter");
  assert.equal(table.box.value, "Intro\n", "the text without the query");
  const popup = (table.palette.element as unknown as FakeElement).querySelector("[data-edit-popover]");
  assert.equal(popup?.getAttribute("data-edit-popover"), "grid", "the size grid opens");
  table.palette.handleKey({ key: "ArrowRight" });
  table.palette.handleKey({ key: "ArrowRight" });
  table.palette.handleKey({ key: "ArrowDown" });
  table.palette.handleKey({ key: "Enter" });
  assert.match(table.box.value, /^Intro\n\n?\|/u, "the table is inserted where the query was");

  const code = setup("strict", "");
  code.type("/code");
  code.key("Enter");
  assert.equal(code.box.value, "");
  assert.equal((code.palette.element as unknown as FakeElement).querySelector("[data-edit-popover]")?.getAttribute("data-edit-popover"), "language");

  const link = setup("strict", "see ");
  link.type("/link");
  link.key("Enter");
  assert.equal(link.box.value, "see ");
  assert.deepEqual(link.panels, ["link"], "the link panel opens");

  const image = setup("strict", "");
  image.type("/image");
  image.key("Enter");
  assert.deepEqual(image.hostPicks, ["image"], "the image dialog opens");
  assert.match(image.box.value, /pic\.png/u);

  const alert = setup("gfm", "");
  alert.type("/alert");
  alert.key("Enter");
  assert.equal(alert.box.value, "> [!NOTE]\n> ", "the alert is written");
  assert.equal((alert.palette.element as unknown as FakeElement).querySelector("[data-edit-popover]")?.getAttribute("data-edit-popover"), "alert");
});

test("P11: Escape closes and keeps the typed text; the next Escape is not consumed", () => {
  const h = setup("gfm");
  h.type("/ta");
  const first = h.key("Escape");
  assert.equal(first.consumed, true);
  assert.equal(first.prevented, 1);
  assert.equal(h.box.value, "/ta");
  assert.equal(h.menu(), undefined);
  assert.equal(h.key("Escape").consumed, false, "the editor's own Escape");
  h.type("b");
  assert.equal(h.menu(), undefined, "typing on does not reopen it");
});

test("P11: Backspace past the slash closes the menu; Backspace inside the query narrows it", () => {
  const h = setup("gfm");
  h.type("/ta");
  backspace(h);
  assert.ok(h.menu(), "still open at /t");
  backspace(h);
  assert.ok(h.menu(), "open at /");
  assert.equal(h.ids().length > 20, true, "the empty query lists everything");
  backspace(h);
  assert.equal(h.menu(), undefined, "closed once the slash is gone");
});

test("P11: no command shows a No command row; Enter and Tab are left to the editor", () => {
  const h = setup("gfm");
  h.type("/zzzz");
  const none = h.menu()!.querySelector("[data-slash-none]")!;
  assert.equal(none.textContent, "No command");
  assert.equal(h.ids().length, 0);
  assert.equal(h.box.attrs.get("aria-activedescendant"), undefined);
  assert.equal(h.doc.body.querySelector("[aria-live]")!.textContent, "No command");
  const enter = h.key("Enter");
  assert.equal(enter.consumed, false);
  assert.equal(enter.prevented, 0);
  assert.equal(h.menu(), undefined);
  assert.equal(h.box.value, "/zzzz", "the text is untouched");
});

test("P11: click applies, hover highlights, mousedown keeps the focus in the text box", () => {
  const h = setup("strict", "x\n");
  h.type("/");
  const quote = h.menu()!.querySelectorAll("[data-slash-id]").find((option) => option.getAttribute("data-slash-id") === "quote")!;
  emit(quote, "mousemove");
  assert.equal(h.active(), "quote");
  let prevented = 0;
  emit(h.menu()!, "mousedown", { preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1, "the press does not move the focus");
  emit(quote, "click");
  assert.equal(h.box.value, "x\n> ");
  assert.equal(h.menu(), undefined);
});

test("P11: modifier chords, composition and the other keys are not taken", () => {
  const h = setup("gfm");
  h.type("/");
  assert.equal(h.key("Enter", { isComposing: true }).consumed, false, "IME composition");
  assert.ok(h.menu(), "composition keys leave it open");
  assert.equal(h.key("Shift").consumed, false);
  assert.ok(h.menu());
  assert.equal(h.key("a").consumed, false, "typing is left to the text box");
  assert.equal(h.key("ArrowUp", { altKey: true, metaKey: true }).consumed, false, "block move chord");
  assert.equal(h.menu(), undefined, "a chord closes it");
  const g = setup("gfm");
  g.type("/");
  assert.equal(g.key("a", { metaKey: true }).consumed, false, "Cmd+A");
  assert.equal(g.menu(), undefined);
  const k = setup("gfm");
  k.type("/");
  assert.equal(k.key("m", { altKey: true, metaKey: true }).consumed, false, "comment chord");
  const s = setup("gfm");
  s.type("/");
  assert.equal(s.key("Enter", { shiftKey: true }).consumed, false);
  assert.equal(s.menu(), undefined);
});

test("P11: the Alert shortcut's slash chord never opens the menu", () => {
  const h = setup("gfm");
  h.type("x ");
  h.slash.handleKey({ key: "/", metaKey: true });
  assert.equal(h.menu(), undefined);
});

test("P11: moving the caret out of the /query closes the menu", () => {
  const h = setup("gfm");
  h.type("/ta");
  h.box.selectionStart = h.box.selectionEnd = 0;
  h.slash.sync();
  assert.equal(h.menu(), undefined, "caret before the slash");
  const g = setup("gfm");
  g.type("/ta");
  g.box.selectionStart = 1;
  g.box.selectionEnd = 3;
  g.slash.sync();
  assert.equal(g.menu(), undefined, "a selection");
  const i = setup("gfm");
  i.type("/ta");
  i.box.selectionStart = i.box.selectionEnd = 2;
  i.slash.sync();
  assert.ok(i.menu(), "inside the query stays open");
  assert.equal(i.ids()[0], "todo", "and filters by the text up to the caret: /t");
});

test("P11: ARIA: listbox, options, activedescendant on the text box and a polite live count", () => {
  const h = setup("gfm");
  h.type("/");
  const box = h.menu()!.querySelectorAll("[role]").find((node) => node.getAttribute("role") === "listbox")!;
  assert.equal(h.box.attrs.get("aria-expanded"), "true");
  assert.equal(h.box.attrs.get("aria-controls"), box.getAttribute("id"));
  const options = h.menu()!.querySelectorAll("[data-slash-id]");
  assert.ok(options.every((option) => option.getAttribute("role") === "option"));
  assert.equal(options.filter((option) => option.getAttribute("aria-selected") === "true").length, 1);
  assert.equal(h.box.attrs.get("aria-activedescendant"), options[0].getAttribute("id"));
  h.key("ArrowDown");
  assert.equal(h.box.attrs.get("aria-activedescendant"), options[1].getAttribute("id"));
  const live = h.doc.body.querySelector("[aria-live]")!;
  assert.equal(live.getAttribute("aria-live"), "polite");
  assert.equal(live.textContent, options.length + " commands available");
  h.type("h2");
  assert.equal(live.textContent.endsWith("available"), true);
  const count = h.ids().length;
  assert.equal(live.textContent, count + (count === 1 ? " command" : " commands") + " available");
  h.slash.close();
  assert.equal(h.box.attrs.size, 0);
});

test("P11: entry text is set as text, never as markup", () => {
  const h = setup("myst");
  h.type("/");
  const marked = h.menu()!.descendants().filter((node) => ((node as unknown as { innerHTML?: string }).innerHTML ?? "") !== "");
  assert.ok(marked.length > 0);
  // Only the icon holders carry markup: the palette's own static icons.
  assert.ok(marked.every((node) => /^<(svg|span) /u.test((node as unknown as { innerHTML: string }).innerHTML)));
  for (const option of h.menu()!.querySelectorAll("[data-slash-id]")) {
    assert.ok(option.textContent.length > 0);
  }
});

// ---------------------------------------------------------------------------------------------
// Placement

test("P11: the menu opens under the caret inside the viewport and flips above near the bottom", () => {
  const h = setup("gfm");
  const body = h.doc.body as unknown as { appendChild(node: FakeElement): FakeElement };
  const original = body.appendChild.bind(h.doc.body);
  body.appendChild = (node: FakeElement) => {
    (node as unknown as { offsetHeight: number }).offsetHeight = 300;
    (node as unknown as { offsetWidth: number }).offsetWidth = 360;
    return original(node);
  };
  h.type("/");
  const menu = h.menu()!;
  assert.equal(menu.getAttribute("data-slash-placement"), "below");
  assert.equal(menu.styles.get("top"), "142px", "4 px under the caret line");
  assert.equal(menu.styles.get("left"), "140px", "at the caret");
  reset(h);

  h.box.caret = { left: 140, top: 700, bottom: 718 };
  h.type("/");
  const flipped = h.menu()!;
  assert.equal(flipped.getAttribute("data-slash-placement"), "above");
  assert.equal(flipped.styles.get("top"), "396px", "its bottom edge 4 px above the caret line");
  reset(h);

  h.box.caret = { left: 900, top: 100, bottom: 118 };
  h.type("/");
  const edge = h.menu()!;
  assert.equal(Number.parseInt(edge.styles.get("left") ?? "0", 10) <= 1000 - 360 - 8, true, "kept inside the right edge");
});

test("P11: the menu follows the caret on scroll and closes when the caret scrolls out of view", () => {
  const h = setup("gfm");
  h.type("/");
  assert.ok((h.win.listeners.get("scroll") ?? []).length > 0, "listens while open");
  h.box.caret = { left: 140, top: 200, bottom: 218 };
  h.win.fire("scroll");
  assert.equal(h.menu()!.styles.get("top"), "222px");
  h.box.caret = { left: 140, top: -80, bottom: -62 };
  h.win.fire("scroll");
  assert.equal(h.menu(), undefined, "caret above the viewport");
  assert.equal((h.win.listeners.get("scroll") ?? []).length, 0, "listener removed");
});

test("P11: the menu keeps the same left edge as the query grows", () => {
  const h = setup("gfm");
  h.type("/");
  const left = h.menu()!.styles.get("left");
  h.box.caret = { left: 190, top: 120, bottom: 138 };
  h.type("ta");
  assert.equal(h.menu()!.styles.get("left"), left);
});

// ---------------------------------------------------------------------------------------------
// Round 2: list entries, mode-native ranking, weak matches, scroll inside the menu

test("P11 r2: /bullet /ul /- find the Bulleted list, /num /ol /numbered the Numbered list, /list both", () => {
  const first = (mode: EditActionMode, query: string): string[] => {
    const h = setup(mode);
    return h.slash.match(query, h.palette.menuEntries()).map((entry) => entry.key);
  };
  for (const mode of ["strict", "gfm", "myst"] as const) {
    for (const query of ["bullet", "ul", "-", "unordered"]) assert.equal(first(mode, query)[0], "bulletList", mode + " /" + query);
    for (const query of ["num", "ol", "numbered", "1.", "ordered"]) assert.equal(first(mode, query)[0], "numberedList", mode + " /" + query);
    assert.deepEqual(first(mode, "list").slice(0, 2), ["bulletList", "numberedList"], mode + " /list");
  }
  assert.ok(first("gfm", "list").includes("checkbox") === false || first("gfm", "list").indexOf("checkbox") > 1);
  assert.ok(first("myst", "list").indexOf("deflist") > 1);
});

test("P11 r2: choosing the list entries writes the list prefix as one edit", () => {
  const h = setup("strict", "Intro\n");
  h.type("/bullet");
  h.key("Enter");
  assert.equal(h.box.value, "Intro\n- ");
  assert.equal(h.box.edits.length, 1);
  const n = setup("gfm", "Intro\n");
  n.type("/numbered");
  n.key("Tab");
  assert.equal(n.box.value, "Intro\n1. ");
});

test("P11 r2: in MyST the MyST entry ranks before its GFM equivalent; GFM and exact labels are unchanged", () => {
  const first = (mode: EditActionMode, query: string): string | undefined => {
    const h = setup(mode);
    const preferred = mode === "myst" ? "myst" : undefined;
    return h.slash.match(query, h.palette.menuEntries(), preferred)[0]?.key;
  };
  for (const query of ["note", "tip", "warn", "warning", "important", "caution"]) {
    assert.match(first("myst", query) ?? "", /^admonition:/u, "myst /" + query);
  }
  assert.equal(first("myst", "kbd"), "roleKbd");
  assert.equal(first("gfm", "kbd"), "kbd");
  assert.equal(first("gfm", "note"), "alert:NOTE", "GFM keeps the alert");
  assert.equal(first("myst", "table"), "table", "an exact label still wins");
  assert.equal(first("myst", "tab"), "table", "and so does a clearly better prefix");
  assert.equal(first("gfm", "tab"), "table");
  assert.equal(first("myst", "image"), "image");
  assert.equal(first("myst", "img"), "image");
  assert.equal(first("myst", "link"), "link");
  assert.equal(first("myst", "alert"), "alert", "an exact label of the picker");
});

test("P11 r2: the best match being only fuzzy leaves Enter and Tab to the text unless the user moved", () => {
  const h = setup("strict", "x ");
  h.type("/cbl");
  assert.ok(h.ids().length > 0, "a fuzzy match is listed");
  const enter = h.key("Enter");
  assert.equal(enter.consumed, false, "a literal word is not swallowed");
  assert.equal(h.menu(), undefined);
  assert.equal(h.box.value, "x /cbl");
  const g = setup("strict", "x ");
  g.type("/cbl");
  g.key("ArrowDown");
  g.key("ArrowUp");
  assert.equal(g.key("Enter").consumed, true, "after moving the highlight Enter applies");
  const w = setup("strict", "x ");
  w.type("/ori");
  assert.ok(w.ids().length > 0, "/ori lists the commands that contain it");
  assert.equal(w.key("Enter").consumed, false, "a match inside a word is loose: Enter stays a newline");
  assert.equal(w.box.value, "x /ori");
  const p = setup("strict", "x ");
  p.type("/qu");
  assert.equal(p.key("Enter").consumed, true, "a prefix match applies");
});

test("P11 r2: scrolling inside the menu does not move it; page scroll does", () => {
  const h = setup("gfm");
  h.type("/");
  const menu = h.menu()!;
  h.box.caret = { left: 140, top: 300, bottom: 318 };
  for (const listener of h.win.listeners.get("scroll") ?? []) (listener as (event: unknown) => void)({ target: menu.querySelector("[data-slash-id]") });
  assert.equal(menu.styles.get("top"), "142px", "unchanged");
  h.win.fire("scroll");
  assert.equal(menu.styles.get("top"), "322px");
});

test("P11 r3: the MyST preference needs 3+ letters: /h and /h1 still find Heading first", () => {
  const h = setup("myst");
  const first = (query: string): string | undefined => h.slash.match(query, h.palette.menuEntries(), "myst")[0]?.key;
  assert.match(first("h") ?? "", /^heading:/u);
  assert.equal(first("h1"), "heading:1");
  assert.equal(first("h2"), "heading:2");
  for (const query of ["note", "tip", "warn", "kbd"]) assert.match(first(query) ?? "", /^(admonition:|roleKbd)/u, query);
  assert.equal(first("tab"), "table");
});
