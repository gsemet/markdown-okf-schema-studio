import * as assert from "node:assert/strict";
import { test } from "node:test";

import { highlightLanguageNames } from "../../src/core/render/highlight";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import {
  allDescendants,
  findButton,
  insertPointAfterLine,
  linkField,
  linkPanelOf,
  messagesAfter,
  openBlockEditorWithSource,
  openTableCellEditorForTab,
  PALETTE_CLASS,
  paletteButton,
  paletteMenu,
  paletteOf,
  shiftKey,
  sourceReply,
  stubExecCommand,
  typeKey,
} from "./runtimeTestSupport";

/**
 * The edition palette: buttons, the link panel, the palette mode, the table grid and the emoji
 * picker (features/editorChrome.ts; modules/editPalette.ts, linkPanel.ts).
 */

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-001
test("T21: the palette sits in a host above the block editor frame, not inside it", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  const palette = paletteOf(harness);
  assert.ok(palette, "a palette exists while editing");
  assert.equal(palette.getAttribute("role"), "toolbar");
  const editor = textarea.parentElement!;
  const host = palette.parentElement!;
  assert.equal(host.getAttribute("data-sphinx-preview-block-editor-host"), "true");
  assert.equal(host.className, "sphinx-preview-block-editor-host");
  assert.deepEqual(host.childElements, [palette, editor], "the bar is on top of the frame, the frame is its sibling");
  assert.equal(editor.contains(palette), false, "the palette is not inside the edit box");
  assert.equal(editor.getAttribute("data-sphinx-preview-block-editor"), "true");
  assert.equal(palette.childElements[0].tagName, "SELECT", "the mode select starts the bar");
  assert.deepEqual(
    palette.childElements.slice(1).map((child) => child.getAttribute("data-edit-action")),
    [
      "heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence", "quote", "rule", "toc", "table",
      "emoji", "todo", "thread", "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd",
      "admonition", "deflist", "math", "sub", "sup", "label",
      "ref", "doc", "cite", "dropdown", "tableCaption", "listTable", "pipeTable", "figure", "roleKbd",
    ],
  );
});

test("T21: no palette before the source arrives and none after the editor closes", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  assert.equal(paletteOf(harness), undefined, "edit mode alone shows no palette");
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(paletteOf(harness), undefined, "still waiting for the source");
  sourceReply(harness, "Second paragraph.\n");
  const palette = paletteOf(harness)!;
  assert.ok(palette);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(palette.removed, true, "the palette leaves with the editor");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-002
test("T21b: every palette button carries the slide-in tooltip of its title", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const buttons = harness.createdElements.filter((element) => element.getAttribute("data-edit-action") !== null);
  assert.ok(buttons.length > 10, "the palette has its buttons");
  for (const button of buttons) {
    const tooltip = button.getAttribute("data-tooltip");
    assert.ok(tooltip, button.getAttribute("data-edit-action") + " has a data-tooltip");
    assert.equal(tooltip, button.getAttribute("title"), String(button.getAttribute("data-edit-action")));
  }
  assert.equal(paletteButton(harness, "bold").getAttribute("data-tooltip"), "Bold (Ctrl+B)");
  assert.equal(paletteButton(harness, "rule").getAttribute("data-tooltip"), "Horizontal rule");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-002
test("T21c: the rule button is three dashes, not the lines of centred text", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const markup = paletteButton(harness, "rule").innerHTML;
  assert.match(markup, /d="M3 12h4M10 12h4M17 12h4"/u);
  assert.doesNotMatch(markup, /M8 7h8/u);
});

test("T21: the palette buttons show the real shortcut in their tooltip", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  assert.equal(paletteButton(harness, "bold").getAttribute("title"), "Bold (Ctrl+B)");
  assert.equal(paletteButton(harness, "italic").getAttribute("title"), "Italic (Ctrl+I)");
  assert.equal(paletteButton(harness, "todo").getAttribute("title"), "Toggle TODO comment");
  assert.equal(paletteButton(harness, "rule").getAttribute("title"), "Horizontal rule");
  const mac = createRuntimeHarness({ platform: "MacIntel" });
  openBlockEditorWithSource(mac);
  assert.equal(paletteButton(mac, "bold").getAttribute("title"), "Bold (Cmd+B)");
  assert.equal(paletteButton(mac, "todo").getAttribute("title"), "Toggle TODO comment");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-036
test("T21: every palette control keeps the focus in the text box on mousedown", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(harness);
  const controls = harness.createdElements.filter((element) =>
    element.getAttribute("data-edit-action") !== null);
  assert.equal(controls.length, 39);
  for (const control of controls) {
    let prevented = false;
    control.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, String(control.getAttribute("data-edit-action")));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-039
test("T21: clicking Bold edits the text in one native step and keeps the editor open", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  const count = harness.messages.length;
  paletteButton(harness, "bold").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "say **foo** now");
  assert.deepEqual(textarea.selectionRange, [6, 9]);
  assert.equal(calls.length, 1, "one undo step");
  assert.equal(calls[0].command, "insertText");
  assert.equal(harness.messages.length, count, "no commit, no blur save");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(paletteOf(harness)!.removed, false);
  assert.equal(textarea.focusOptions?.preventScroll, true, "focus returns to the text box");
  harness.flushTimers();
  assert.equal(harness.messages.at(-1)?.type, "previewEditSave");
  assert.equal(harness.messages.at(-1)?.final, false, "autosave, not a final save");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-043
test("T21: the heading list opens as a menu and choosing a level replaces the prefix", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "# Title";
  textarea.setSelectionRange(3, 3);
  assert.equal(paletteMenu(harness), undefined);
  paletteButton(harness, "heading").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness);
  assert.ok(menu, "the popover opens");
  assert.equal(menu.parentElement, paletteOf(harness));
  assert.deepEqual(
    menu.childElements.map((item) => item.textContent),
    ["Paragraph", "Heading 1", "Heading 2", "Heading 3", "Heading 4", "Heading 5"],
  );
  let prevented = false;
  menu.childElements[0].dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  menu.childElements[3].dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "### Title");
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined, "choosing closes the popover");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-031
test("T21: Escape closes an open popover first and only then cancels the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  paletteButton(harness, "heading").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  let prevented = false;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(paletteMenu(harness), undefined, "the popover is closed");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(paletteOf(harness)!.removed, false, "the editor is still open");
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(paletteOf(harness)!.removed, true);
});

test("T21: opening one popover closes the other and a second click closes it", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  paletteButton(harness, "heading").dispatch("click", { preventDefault: () => undefined });
  paletteButton(harness, "codeFence").dispatch("click", { preventDefault: () => undefined });
  const open = harness.createdElements.filter((element) =>
    element.getAttribute("role") === "menu" && element.parentElement !== undefined);
  assert.equal(open.length, 1);
  assert.equal(open[0].getAttribute("data-edit-popover"), "language");
  paletteButton(harness, "codeFence").dispatch("click", { preventDefault: () => undefined });
  assert.equal(paletteMenu(harness), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-054
test("T21: the code language list is text plus the highlighter languages and aliases", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "x = 1";
  textarea.setSelectionRange(0, 5);
  paletteButton(harness, "codeFence").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const shown = menu.childElements.map((item) => item.getAttribute("data-edit-option"));
  assert.deepEqual(shown, ["text", ...highlightLanguageNames()]);
  assert.ok(shown.includes("python") && shown.includes("py") && shown.includes("yaml"));
  const python = menu.childElements.find((item) => item.getAttribute("data-edit-option") === "python")!;
  python.dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "```python\nx = 1\n```");
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined);
});

test("T21: the palette appears in the insertion editor", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  insertPointAfterLine(harness, 52).childElements[0].dispatch("click", {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  sourceReply(harness, "");
  const palette = paletteOf(harness);
  assert.ok(palette);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  const host = palette.parentElement!;
  assert.deepEqual(host.childElements, [palette, textarea.parentElement!]);
});

test("T21: the table cell editor and the frontmatter editors get no palette", () => {
  const cell = createRuntimeHarness();
  openTableCellEditorForTab(cell);
  assert.equal(paletteOf(cell), undefined);

  const frontmatter = createRuntimeHarness({ mapFrontmatter: true });
  frontmatter.editModeButton.dispatch("click");
  frontmatter.dispatchDocument("click", {
    target: frontmatter.frontmatterNameCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  assert.ok(frontmatter.createdElements.some((element) =>
    element.getAttribute("aria-label") === "Frontmatter key lifecycle"));
  assert.equal(paletteOf(frontmatter), undefined);
});

test("P4: the palette's host wraps the frame and goes with it, also on a content patch", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const palette = paletteOf(harness)!;
  const host = palette.parentElement!;
  assert.equal(host.childElements.includes(textarea.parentElement!), true);
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(host.removed, true, "the host is removed with the editor");
  assert.equal(palette.removed, true);
});

test("T21: the palette root cancels mousedown so a press on its padding keeps the focus", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  let prevented = false;
  paletteOf(harness)!.dispatch("mousedown", { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
});

test("P4: the host takes the first-block clearance class and swallows clicks like the frame", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const host = paletteOf(harness)!.parentElement!;
  let stopped = false;
  host.dispatch("click", { stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true, "a click on the palette does not reach the page's block handling");
  const frame = host.childElements[1];
  assert.equal(frame.className.includes("--first"), host.className.includes("--first"));
});

test("P4: focus moving from the text box into the palette does not save", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const palette = paletteOf(harness)!;
  const before = harness.messages.length;
  textarea.dispatch("blur", { relatedTarget: palette.childElements[0] });
  assert.equal(messagesAfter(harness, before).some((message) => message.type === "previewEditSave"), false);
  assert.equal(palette.removed, false, "the editor stays open");
});

test("P4: a palette taller than 40% of the viewport is not sticky; a small one is", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  const palette = paletteOf(harness)!;
  const host = palette.parentElement!;
  assert.equal(host.getAttribute("data-sphinx-palette-static"), null, "40 px of a 100 px viewport is small enough");
  palette.height = 60;
  harness.dispatchWindow("resize");
  assert.equal(host.getAttribute("data-sphinx-palette-static"), "true");
  palette.height = 30;
  harness.dispatchWindow("resize");
  assert.equal(host.getAttribute("data-sphinx-palette-static"), null);
});

test("P4: the clearance reserve is uncapped at the page top and capped to one bar height when scrolled", () => {
  // @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
  const measure = (scrollY: number): string | undefined => {
    const harness = createRuntimeHarness();
    openBlockEditorWithSource(harness);
    const palette = paletteOf(harness)!;
    const host = palette.parentElement!;
    palette.height = 30;
    // The bar sticks 60 px under the pane top (a five-row toolbar); its host is at the pane top,
    // so the distance (60) is more than one bar height plus 3.
    host.rectProvider = () => ({ top: 0, height: 40, bottom: 40 });
    palette.rectProvider = () => ({ top: 0, height: 30, bottom: 30 });
    harness.window.getComputedStyle = () => ({
      position: "sticky",
      top: "60px",
      getPropertyValue: () => "",
    });
    harness.windowState.scrollY = scrollY;
    harness.dispatchWindow("resize");
    return host.style.getPropertyValue("--sphinx-preview-palette-reserve") || undefined;
  };
  assert.equal(measure(0), "63px", "at the page top the whole distance is reserved");
  assert.equal(measure(200), undefined, "scrolled, a distance past one bar height is already under the bar");
});

function openCompensatedEditor(harness: RuntimeHarness): RuntimeElement {
  harness.windowState.scrollY = 200;
  harness.dispatchWindow("scroll");
  harness.flushFrames();
  harness.windowState.paletteHeight = 44;
  return openBlockEditorWithSource(harness);
}

test("T21: opening scrolls down by the bar height and every close path scrolls back", () => {
  const closers: [string, (harness: RuntimeHarness, textarea: RuntimeElement) => void][] = [
    ["Escape", (_harness, textarea) => {
      textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    }],
    ["Cancel button", (harness) => {
      findButton(harness, "Cancel editing and restore the original text").dispatch("click");
    }],
    ["Done without a change", (harness) => {
      findButton(harness, "Done editing").dispatch("click");
    }],
    ["Cmd+Enter without a change", (_harness, textarea) => {
      textarea.dispatch("keydown", { key: "Enter", metaKey: true, preventDefault: () => undefined });
    }],
    ["blur without a change", (_harness, textarea) => {
      textarea.dispatch("blur");
    }],
    ["Escape after an autosave", (harness, textarea) => {
      textarea.value = "Second paragraph. more";
      textarea.dispatch("input");
      harness.flushTimers();
      textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    }],
  ];
  for (const [name, close] of closers) {
    const harness = createRuntimeHarness();
    const textarea = openCompensatedEditor(harness);
    assert.equal(harness.windowState.scrollY, 244, name + ": the page scrolled by the bar height");
    close(harness, textarea);
    harness.flushFrames();
    assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null, name);
    assert.equal(harness.windowState.scrollY, 200, name + ": the scroll is restored");
  }
});

function linkButton(harness: RuntimeHarness, name: "insert" | "cancel"): RuntimeElement {
  const button = harness.createdElements.find((element) =>
    element.tagName === "BUTTON" && element.getAttribute("data-link-action") === name);
  assert.ok(button, "link button " + name);
  return button;
}

/** Records which element took the focus last, since the fake has no active element. */
function trackFocus(harness: RuntimeHarness): { last: () => RuntimeElement | undefined } {
  let last: RuntimeElement | undefined;
  const wrap = (element: RuntimeElement): void => {
    const original = element.focus.bind(element);
    element.focus = (options?: FocusOptions): void => {
      last = element;
      original(options);
    };
  };
  harness.createdElements.forEach(wrap);
  const create = harness.document.createElement as (tagName: string) => RuntimeElement;
  harness.document.createElement = (tagName: string): RuntimeElement => {
    const element = create(tagName);
    wrap(element);
    return element;
  };
  return { last: () => last };
}

const linkModifier = new WeakMap<RuntimeHarness, Record<string, boolean>>();

function openLinkPanel(harness: RuntimeHarness, textarea: RuntimeElement, selection: [number, number], value = "say foo now") {
  textarea.value = value;
  textarea.setSelectionRange(selection[0], selection[1]);
  const key = linkModifier.get(harness) ?? { ctrlKey: true };
  let prevented = false;
  let stopped = false;
  textarea.dispatch("keydown", {
    key: "k",
    code: "KeyK",
    ...key,
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  return { prevented, stopped };
}

function linkHarness(platform?: string) {
  const harness = createRuntimeHarness(platform === undefined ? {} : { platform });
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  linkModifier.set(harness, platform === undefined ? { ctrlKey: true } : { metaKey: true });
  return { harness, textarea, calls, focus };
}

test("T22: Ctrl+K opens the link panel under the palette with the selection as the text", () => {
  const { harness, textarea, focus } = linkHarness();
  const result = openLinkPanel(harness, textarea, [4, 7]);
  assert.equal(result.prevented, true);
  assert.equal(result.stopped, true);
  const panel = linkPanelOf(harness);
  assert.ok(panel, "the panel opens");
  assert.equal(panel.getAttribute("aria-label"), "Insert link");
  const frame = textarea.parentElement!;
  assert.equal(panel.parentElement, frame);
  assert.equal(frame.childElements.indexOf(panel), frame.childElements.indexOf(paletteOf(harness)!) + 1);
  assert.equal(linkField(harness, "text").value, "foo");
  assert.equal(linkField(harness, "url").value, "");
  assert.equal(focus.last(), linkField(harness, "url"), "focus goes to the first empty field");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-083
test("T22: Cmd+K on macOS opens the panel and Ctrl+K there does not", () => {
  const mac = linkHarness("MacIntel");
  assert.equal(openLinkPanel(mac.harness, mac.textarea, [4, 7]).prevented, true);
  assert.ok(linkPanelOf(mac.harness));
  const other = linkHarness("MacIntel");
  linkModifier.set(other.harness, { ctrlKey: true });
  assert.equal(openLinkPanel(other.harness, other.textarea, [4, 7]).prevented, false);
  assert.equal(linkPanelOf(other.harness), undefined);
});

test("T22: a selected URL fills the URL field and focus goes to the empty text", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 23], "see https://example.org ok");
  assert.equal(linkField(harness, "url").value, "https://example.org");
  assert.equal(linkField(harness, "text").value, "");
  assert.equal(focus.last(), linkField(harness, "text"));
});

test("T22: with no selection both fields are empty and the text takes the focus", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 4]);
  assert.equal(linkField(harness, "text").value, "");
  assert.equal(linkField(harness, "url").value, "");
  assert.equal(focus.last(), linkField(harness, "text"));
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-089
test("T22: the Link button opens the same panel and keeps the focus rule", () => {
  const { harness, textarea } = linkHarness();
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  const button = paletteButton(harness, "link");
  assert.equal(button.getAttribute("title"), "Link (Ctrl+K)");
  assert.equal(button.getAttribute("aria-label"), "Link");
  button.dispatch("click", { preventDefault: () => undefined });
  assert.ok(linkPanelOf(harness));
  assert.equal(linkField(harness, "text").value, "foo");
  // A second click on the button leaves a single panel.
  button.dispatch("click", { preventDefault: () => undefined });
  assert.equal(harness.createdElements.filter((e) => e.getAttribute("role") === "dialog" && !e.removed).length, 1);
});

test("T22: the panel has labelled fields, Insert and Cancel in the tab order", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  assert.equal(linkField(harness, "text").getAttribute("aria-label"), "Text");
  assert.equal(linkField(harness, "url").getAttribute("aria-label"), "URL");
  assert.equal(linkButton(harness, "insert").textContent, "Insert");
  assert.equal(linkButton(harness, "cancel").textContent, "Cancel");
  const order = linkPanelOf(harness)!.childElements.flatMap((child) => [child, ...child.childElements])
    .filter((e) => e.tagName === "INPUT" || e.tagName === "BUTTON");
  assert.deepEqual(order.map((e) => e.getAttribute("data-link-field") ?? e.getAttribute("data-link-action")),
    ["text", "url", "insert", "cancel"]);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-092
test("T22: Enter in the URL field inserts [text](url) as one undo step and returns to the text box", () => {
  const { harness, textarea, calls, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").value = "https://x.org";
  const before = harness.messages.length;
  let prevented = false;
  linkField(harness, "url").dispatch("keydown", { key: "Enter", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(textarea.value, "say [foo](https://x.org) now");
  assert.equal(textarea.selectionStart, 24, "caret after the link");
  assert.equal(textarea.selectionEnd, 24);
  assert.equal(calls.length, 1, "one native step");
  assert.equal(focus.last(), textarea);
  assert.equal(linkPanelOf(harness), undefined, "the panel closes");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(harness.messages.length, before, "no save yet");
  harness.flushTimers();
  assert.equal(harness.messages.filter((m) => m.type === "previewEditSave" && m.final === true).length, 0);
  assert.equal(harness.messages.filter((m) => m.type === "previewEditSave").length, 1, "one autosave");
});

test("T22: Enter in the Text field and the Insert button also insert", () => {
  const viaText = linkHarness();
  openLinkPanel(viaText.harness, viaText.textarea, [4, 7]);
  linkField(viaText.harness, "text").value = "bar";
  linkField(viaText.harness, "url").value = "u";
  linkField(viaText.harness, "text").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(viaText.textarea.value, "say [bar](u) now");

  const viaButton = linkHarness();
  openLinkPanel(viaButton.harness, viaButton.textarea, [4, 7]);
  linkField(viaButton.harness, "url").value = "u";
  linkButton(viaButton.harness, "insert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(viaButton.textarea.value, "say [foo](u) now");
  assert.equal(linkPanelOf(viaButton.harness), undefined);
});

test("T22: an empty URL inserts [text]() with the caret inside the parentheses", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "text").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(textarea.value, "say [foo]() now");
  assert.equal(textarea.selectionStart, 10);
  assert.equal(textarea.selectionEnd, 10);
});

test("T22: an IME composition Enter does not insert", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").dispatch("keydown", { key: "Enter", isComposing: true, preventDefault: () => undefined });
  assert.equal(textarea.value, "say foo now");
  assert.ok(linkPanelOf(harness));
});

test("T22: a selection inside an existing link prefills both fields and replaces that link", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [8, 8], "a [label](https://old.org) b");
  assert.equal(linkField(harness, "text").value, "label");
  assert.equal(linkField(harness, "url").value, "https://old.org");
  linkField(harness, "url").value = "https://new.org";
  linkField(harness, "url").dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal(textarea.value, "a [label](https://new.org) b");
});

test("T22: Escape in the panel returns to the text box without any change and keeps the editor", () => {
  const { harness, textarea, calls, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").value = "typed";
  textarea.setSelectionRange(0, 0);
  let prevented = false;
  let stopped = false;
  linkField(harness, "url").dispatch("keydown", {
    key: "Escape",
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true, "the editor does not see this Escape");
  assert.equal(textarea.value, "say foo now");
  assert.deepEqual(textarea.selectionRange, [4, 7], "the selection is restored");
  assert.equal(calls.length, 0);
  assert.equal(focus.last(), textarea);
  assert.equal(linkPanelOf(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(harness.messages.some((m) => m.type === "previewEditSave" || m.type === "previewEditCancel"), false);
  harness.flushTimers();
  assert.equal(harness.messages.some((m) => m.type === "previewEditSave"), false, "nothing changed, nothing saved");
});

test("T22: Cancel behaves like Escape", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkButton(harness, "cancel").dispatch("click", { preventDefault: () => undefined });
  assert.equal(linkPanelOf(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.deepEqual(textarea.selectionRange, [4, 7]);
  assert.equal(textarea.value, "say foo now");
});

test("T22: Tab cycles Text, URL, Insert, Cancel and back, and Shift+Tab goes the other way", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 4]);
  const text = linkField(harness, "text");
  const url = linkField(harness, "url");
  const insert = linkButton(harness, "insert");
  const cancel = linkButton(harness, "cancel");
  let prevented = false;
  cancel.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(focus.last(), text, "Tab on Cancel wraps to Text");
  prevented = false;
  text.dispatch("keydown", { key: "Tab", shiftKey: true, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(focus.last(), cancel, "Shift+Tab on Text wraps to Cancel");
  prevented = false;
  url.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented = true; } });
  insert.dispatch("keydown", { key: "Tab", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false, "the browser moves between the inner stops");
});

test("T22: a press on the panel's padding or buttons keeps the focus, a press on a field focuses it", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const press = (target: RuntimeElement | undefined): boolean => {
    let prevented = false;
    linkPanelOf(harness)!.dispatch("mousedown", { target, preventDefault: () => { prevented = true; } });
    return prevented;
  };
  assert.equal(press(undefined), true, "padding");
  assert.equal(press(linkButton(harness, "insert")), true, "button");
  assert.equal(press(linkField(harness, "url")), false, "the field needs its default so it takes the focus");
});

test("T22: moving the focus from the text box into the panel does not save", () => {
  const { harness, textarea } = linkHarness();
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  openLinkPanel(harness, textarea, [4, 7]);
  const before = harness.messages.length;
  textarea.dispatch("blur", { relatedTarget: linkField(harness, "url") });
  textarea.dispatch("blur", { relatedTarget: paletteButton(harness, "bold") });
  assert.equal(harness.messages.length, before);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

test("T22: the text box blur with no target or a target outside the frame still saves", () => {
  for (const outside of ["none", "null", "body"]) {
    const harness = createRuntimeHarness();
    const relatedTarget = outside === "none" ? undefined : outside === "null" ? null : harness.body;
    const textarea = openBlockEditorWithSource(harness);
    textarea.value = "Second paragraph. changed";
    textarea.dispatch("blur", { relatedTarget });
    const saves = harness.messages.filter((m) => m.type === "previewEditSave");
    assert.equal(saves.length, 1, outside);
    assert.equal(saves[0].final, true);
  }
});

test("T22: focus leaving the panel for outside the frame runs the final save once", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  textarea.value = "say foo now!";
  const before = harness.messages.length;
  linkField(harness, "url").dispatch("blur", { relatedTarget: null });
  const saves = harness.messages.slice(before).filter((m) => m.type === "previewEditSave");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].final, true);
  assert.equal(saves[0].editedText, "say foo now!\n");
});

test("T22: focus moving between the panel fields or back to the text box does not save", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const before = harness.messages.length;
  linkField(harness, "url").dispatch("blur", { relatedTarget: linkField(harness, "text") });
  linkField(harness, "text").dispatch("blur", { relatedTarget: linkButton(harness, "insert") });
  linkButton(harness, "insert").dispatch("blur", { relatedTarget: textarea });
  assert.equal(harness.messages.length, before);
});

test("T22: closing the panel never produces a blur save, whatever blur the browser fires", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const url = linkField(harness, "url");
  url.value = "u";
  const before = harness.messages.length;
  url.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  url.dispatch("blur", { relatedTarget: null });
  textarea.dispatch("blur", { relatedTarget: null });
  // The textarea blur above is a real focus loss and saves once; the panel added no second save.
  const saves = harness.messages.slice(before).filter((m) => m.type === "previewEditSave");
  assert.equal(saves.length, 1);
});

test("T22: the panel is removed with the editor", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const panel = linkPanelOf(harness)!;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), null);
  assert.equal(panel.removed, true);
});

test("T22: opening and closing the panel keep the edited text in place", () => {
  const harness = createRuntimeHarness();
  const textarea = openCompensatedEditor(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  assert.equal(harness.windowState.scrollY, 244);
  harness.windowState.panelHeight = 30;
  paletteButton(harness, "link").dispatch("click", { preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 274, "the page scrolled by the panel height");
  linkButton(harness, "cancel").dispatch("click", { preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 244, "closing the panel scrolls back");
  paletteButton(harness, "link").dispatch("click", { preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(harness.windowState.scrollY, 274);
  // Escape in the text box closes the editor and the panel with it; the page returns to 200.
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  harness.flushFrames();
  assert.equal(linkPanelOf(harness), undefined);
  assert.equal(harness.windowState.scrollY, 200);
});

test("T22: typing in the text box closes the panel and a later Insert cannot corrupt the text", () => {
  const { harness, textarea, calls } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  const url = linkField(harness, "url");
  const insert = linkButton(harness, "insert");
  url.value = "https://x.org";
  textarea.value = "NEW say foo now";
  textarea.setSelectionRange(8, 8);
  textarea.dispatch("input");
  assert.equal(linkPanelOf(harness), undefined, "the panel closed on input");
  assert.deepEqual(textarea.selectionRange, [8, 8], "the caret of the text box was not restored over");
  insert.dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "NEW say foo now");
  assert.equal(calls.length, 0);
});

test("T22: a mousedown in the text box closes the panel without touching the selection", () => {
  const { harness, textarea } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  textarea.setSelectionRange(1, 1);
  textarea.dispatch("mousedown", {});
  assert.equal(linkPanelOf(harness), undefined);
  assert.deepEqual(textarea.selectionRange, [1, 1]);
});

test("T22: Insert on a text that changed without an input event aborts without editing", () => {
  const { harness, textarea, calls } = linkHarness();
  openLinkPanel(harness, textarea, [4, 7]);
  linkField(harness, "url").value = "u";
  textarea.value = "other text";
  linkButton(harness, "insert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "other text");
  assert.equal(calls.length, 0);
  assert.equal(linkPanelOf(harness), undefined);
});

test("T22: Cmd/Ctrl+K inside a panel field is consumed and moves to the URL field", () => {
  const { harness, textarea, focus } = linkHarness();
  openLinkPanel(harness, textarea, [4, 4]);
  let prevented = false;
  let stopped = false;
  linkField(harness, "text").dispatch("keydown", {
    key: "k",
    ctrlKey: true,
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  assert.equal(prevented && stopped, true);
  assert.equal(focus.last(), linkField(harness, "url"));
  assert.ok(linkPanelOf(harness), "the panel stays open");
});

// T23: the palette mode select, its persistence and its message.
function paletteSelect(harness: RuntimeHarness): RuntimeElement {
  const select = paletteOf(harness)!.childElements.find((child) => child.tagName === "SELECT");
  assert.ok(select, "the palette has a mode select");
  return select;
}

function choosePaletteMode(harness: RuntimeHarness, mode: string): void {
  const select = paletteSelect(harness);
  select.value = mode;
  select.dispatch("change");
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-170
test("T23: the palette mode starts as GFM without a stored value or saved state", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  assert.equal(paletteOf(harness)!.getAttribute("data-palette-mode"), "gfm");
  assert.equal(paletteSelect(harness).value, "gfm");
});

test("T23: the stored workspace mode is used, and the saved webview state wins over it", () => {
  const stored = createRuntimeHarness({ initialPaletteMode: "strict" });
  openBlockEditorWithSource(stored);
  assert.equal(paletteOf(stored)!.getAttribute("data-palette-mode"), "strict");

  const saved = createRuntimeHarness({ initialPaletteMode: "strict", savedState: { paletteMode: "gfm" } });
  openBlockEditorWithSource(saved);
  assert.equal(paletteOf(saved)!.getAttribute("data-palette-mode"), "gfm");

  const myst = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(myst);
  assert.equal(paletteOf(myst)!.getAttribute("data-palette-mode"), "myst", "a stored MyST mode wins over the GFM default");

  const invalid = createRuntimeHarness({ initialPaletteMode: "bogus" as "strict", savedState: { paletteMode: 3 } });
  openBlockEditorWithSource(invalid);
  assert.equal(paletteOf(invalid)!.getAttribute("data-palette-mode"), "gfm");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-265
test("CR 149: the Full mode is a mode of the page: stored, saved, chosen in the select and reported to the host", () => {
  const stored = createRuntimeHarness({ initialPaletteMode: "full" });
  openBlockEditorWithSource(stored);
  assert.equal(paletteOf(stored)!.getAttribute("data-palette-mode"), "full");
  assert.equal(paletteSelect(stored).value, "full");
  assert.equal(stored.getWebviewState().paletteMode, "full");

  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  openBlockEditorWithSource(harness);
  const before = harness.messages.length;
  choosePaletteMode(harness, "full");
  const posted = harness.messages.slice(before).filter((message) => message.type === "previewPaletteModeChanged");
  assert.equal(posted.length, 1);
  assert.equal(posted[0].mode, "full");
  assert.equal(paletteOf(harness)!.getAttribute("data-palette-mode"), "full");
  assert.equal(harness.getWebviewState().paletteMode, "full");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-169
test("T23: choosing a mode posts previewPaletteModeChanged once and keeps the editor open", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "myst" });
  const textarea = openBlockEditorWithSource(harness);
  const count = harness.messages.length;
  choosePaletteMode(harness, "gfm");
  const posted = harness.messages.slice(count);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].type, "previewPaletteModeChanged");
  assert.equal(posted[0].mode, "gfm");
  assert.equal(posted[0].documentId, "file:///active.md");
  assert.equal(posted[0].revision, 7);
  assert.equal(posted[0].requestId, 11);
  assert.equal(paletteOf(harness)!.getAttribute("data-palette-mode"), "gfm");
  assert.equal(harness.getWebviewState().paletteMode, "gfm");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.focusOptions?.preventScroll, true, "focus returns to the text box");
  choosePaletteMode(harness, "gfm");
  assert.equal(harness.messages.length, count + 1, "choosing the same mode again posts nothing");
});

test("T23: a mode change does not save the block, and the next editor opens in the new mode", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  choosePaletteMode(harness, "strict");
  harness.flushTimers();
  assert.equal(harness.messages.some((message) => message.type === "previewEditSave"), false);
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  textarea.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  sourceReply(harness, "Second paragraph.\n");
  const palettes = harness.createdElements.filter((element) =>
    element.className === PALETTE_CLASS && !element.removed);
  assert.equal(palettes.at(-1)?.getAttribute("data-palette-mode"), "strict");
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-001
test("T23: a read-only preview has no palette and never posts the message", () => {
  const harness = createRuntimeHarness({ editingEnabled: false, initialPaletteMode: "strict" });
  harness.dispatchDocument("click", { target: harness.mappings[1], preventDefault: () => undefined });
  assert.equal(paletteOf(harness), undefined);
  assert.equal(harness.messages.some((message) => message.type === "previewPaletteModeChanged"), false);
});

// T23 round 2: the select must never strand the focus.
function finalSaves(harness: RuntimeHarness): number {
  return harness.messages.filter((message) =>
    message.type === "previewEditSave" && message.final === true).length;
}

test("T23: opening and dismissing the select without a change hands the focus back", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  const count = harness.messages.length;
  select.dispatch("blur", { relatedTarget: select });
  textarea.dispatch("blur", { relatedTarget: select });
  select.dispatch("focus");
  select.dispatch("click");
  textarea.focusOptions = undefined;
  assert.equal(textarea.focusOptions, undefined, "the open list keeps the focus in the select");
  select.dispatch("click");
  assert.equal((textarea.focusOptions as FocusOptions | undefined)?.preventScroll, true, "closing the list returns to the text box");
  assert.equal(harness.messages.length, count, "nothing posted, nothing saved");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  // Back in the text box, leaving the frame saves as usual: the editor is not stuck.
  textarea.dispatch("blur", { relatedTarget: null });
  assert.equal(finalSaves(harness), 1);
});

test("T23: focus leaving the frame from the select runs one final save; moving inside does not", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  select.dispatch("focus");
  select.dispatch("blur", { relatedTarget: textarea });
  assert.equal(finalSaves(harness), 0, "focus moving to the text box keeps the editor open");
  select.dispatch("blur", { relatedTarget: null });
  assert.equal(finalSaves(harness), 1, "focus leaving the frame saves once");
});

test("T23: Escape on the select returns to the text box, Cmd/Ctrl+Enter finishes the edit", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  select.dispatch("focus");
  textarea.focusOptions = undefined;
  let prevented = false;
  select.dispatch("keydown", { key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal((textarea.focusOptions as FocusOptions | undefined)?.preventScroll, true);
  assert.equal(finalSaves(harness), 0);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  textarea.focusOptions = undefined;
  select.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  assert.equal((textarea.focusOptions as FocusOptions | undefined)?.preventScroll, true, "plain Enter returns to the text box");
  assert.equal(finalSaves(harness), 0);
  select.dispatch("keydown", { key: "Enter", ctrlKey: true, preventDefault: () => undefined });
  assert.equal(finalSaves(harness), 1);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-017
test("T23: Ctrl+Shift+M focuses the select, Cmd+Shift+M on macOS, and the tooltip shows it", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const select = paletteSelect(harness);
  textarea.value = "Second paragraph, changed.";
  assert.equal(select.getAttribute("title"), "Palette buttons (Ctrl+Shift+M)");
  select.focusOptions = undefined;
  textarea.dispatch("keydown", { key: "M", code: "KeyM", ctrlKey: true, shiftKey: true, preventDefault: () => undefined });
  assert.equal((select.focusOptions as FocusOptions | undefined)?.preventScroll, true);
  const mac = createRuntimeHarness({ platform: "MacIntel" });
  const macArea = openBlockEditorWithSource(mac);
  const macSelect = paletteSelect(mac);
  assert.equal(macSelect.getAttribute("title"), "Palette buttons (Cmd+Shift+M)");
  macArea.dispatch("keydown", { key: "M", code: "KeyM", ctrlKey: true, shiftKey: true, preventDefault: () => undefined });
  assert.equal(macSelect.focusOptions, undefined, "Ctrl does nothing on macOS");
  macArea.dispatch("keydown", { key: "M", code: "KeyM", metaKey: true, shiftKey: true, preventDefault: () => undefined });
  assert.equal((macSelect.focusOptions as FocusOptions | undefined)?.preventScroll, true);
});

// T24: the size grid and the emoji picker in the real page script.
function gridCell(menu: RuntimeElement, row: number, col: number): RuntimeElement {
  const found = allDescendants(menu).find((e) =>
    e.getAttribute("data-grid-row") === String(row) && e.getAttribute("data-grid-col") === String(col));
  assert.ok(found);
  return found;
}

function litCells(menu: RuntimeElement): number {
  return allDescendants(menu).filter((e) => e.getAttribute("data-grid-on") === "true").length;
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-078
test("T24: the Table button opens the grid; hovering lights rows x columns and shows the size", () => {
  const harness = createRuntimeHarness();
  openBlockEditorWithSource(harness);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.equal(menu.getAttribute("data-edit-popover"), "grid");
  assert.equal(allDescendants(menu).filter((e) => e.getAttribute("data-grid-row") !== null).length, 81);
  menu.dispatch("mouseover", { target: gridCell(menu, 3, 4) });
  assert.equal(litCells(menu), 12);
  const label = allDescendants(menu).find((e) => e.className === "sphinx-preview-edit-grid-label")!;
  assert.equal(label.textContent, "3 \u00d7 4");
  menu.dispatch("mouseover", { target: gridCell(menu, 9, 9) });
  assert.equal(litCells(menu), 81);
});

test("T24: one click on a grid cell inserts the table as one undo step and keeps the editor open", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "Intro";
  textarea.setSelectionRange(5, 5);
  const count = harness.messages.length;
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  menu.dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined, target: gridCell(menu, 3, 4) });
  assert.equal(
    textarea.value,
    "Intro\n\n| Column 1 | Column 2 | Column 3 | Column 4 |\n| --- | --- | --- | --- |\n|  |  |  |  |\n|  |  |  |  |",
  );
  assert.equal(calls.length, 1, "one undo step");
  assert.equal(paletteMenu(harness), undefined, "the grid closes");
  assert.equal(harness.messages.length, count, "no commit, no blur save");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.focusOptions?.preventScroll, true, "focus is in the text box");
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), "Column 1");
});

test("T24: Escape closes the grid first; arrows and Enter drive it from the text box", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "";
  textarea.setSelectionRange(0, 0);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  assert.equal(typeKey(textarea, "ArrowDown"), true);
  typeKey(textarea, "ArrowRight");
  assert.equal(litCells(menu), 2, "1 x 2");
  typeKey(textarea, "Enter");
  assert.equal(textarea.value, "| Column 1 | Column 2 |\n| --- | --- |");
  assert.equal(paletteMenu(harness), undefined);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  typeKey(textarea, "Escape");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "the editor stays");
});

test("T24: typing in the text box closes the grid without losing the editor", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  paletteButton(harness, "table").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  textarea.dispatch("input");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

function emojiField(harness: RuntimeHarness): RuntimeElement {
  const field = harness.createdElements.find((e) =>
    e.tagName === "INPUT" && e.getAttribute("data-emoji-filter") !== null && !e.removed);
  assert.ok(field);
  return field;
}

test("T24: the emoji filter takes focus without saving; leaving the frame from it saves once", () => {
  const harness = createRuntimeHarness();
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  textarea.value = "Second paragraph, changed.";
  const count = harness.messages.length;
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  assert.equal(focus.last(), emojiField(harness));
  // The text box loses focus to the filter: inside the frame, so nothing is saved.
  textarea.dispatch("blur", { relatedTarget: emojiField(harness) });
  assert.equal(harness.messages.length, count, "no save when focus moves into the picker");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  emojiField(harness).dispatch("blur", { relatedTarget: null });
  const saves = harness.messages.slice(count).filter((m) => m.type === "previewEditSave");
  assert.equal(saves.length, 1, "one final save");
  assert.equal(saves[0].final, true);
});

test("T24: choosing an emoji inserts it in the text box and returns the focus there", () => {
  const harness = createRuntimeHarness();
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "say foo now";
  textarea.setSelectionRange(4, 7);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const field = emojiField(harness);
  field.value = "check mark button";
  field.dispatch("input");
  field.dispatch("keydown", { key: "Enter", preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, "say \u2705 now");
  assert.equal(calls.length, 1);
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});

test("T24: Shift+click on an emoji keeps the picker open, a plain click closes it", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "";
  textarea.setSelectionRange(0, 0);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  const menu = paletteMenu(harness)!;
  const emojis = allDescendants(menu).filter((e) => e.getAttribute("data-emoji") !== null);
  emojis[0].dispatch("click", { preventDefault: () => undefined, shiftKey: true });
  emojis[1].dispatch("click", { preventDefault: () => undefined, shiftKey: true });
  assert.equal(textarea.value, emojis[0].textContent + emojis[1].textContent);
  assert.ok(paletteMenu(harness), "still open after the input events");
  emojis[2].dispatch("click", { preventDefault: () => undefined });
  assert.equal(paletteMenu(harness), undefined);
});

test("T24: Escape in the filter closes the picker, focuses the text box and keeps the editor", () => {
  const harness = createRuntimeHarness();
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  const count = harness.messages.length;
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  emojiField(harness).dispatch("keydown", {
    key: "Escape", preventDefault: () => undefined, stopPropagation: () => undefined,
  });
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(harness.messages.length, count);
});

test("T24: a mouse press in the text box closes the picker and the editor stays usable", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  textarea.dispatch("mousedown");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness), "the picker opens again");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-072
test("T24: an emoji chosen after the text changed is inserted at the live caret, never a stale one", () => {
  const harness = createRuntimeHarness();
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "abcdef";
  textarea.setSelectionRange(2, 2);
  paletteButton(harness, "emoji").dispatch("click", { preventDefault: () => undefined });
  // The text changes and the caret moves while the picker is open (an incoming edit).
  textarea.value = "XY";
  textarea.setSelectionRange(2, 2);
  const emoji = allDescendants(paletteMenu(harness)!).find((e) => e.getAttribute("data-emoji") !== null)!;
  emoji.dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "XY" + emoji.textContent);
});

// T25: the Alert dropdown in the real page script.
function withCaretMarker(harness: RuntimeHarness, textarea: RuntimeElement): void {
  // The page measures the caret with a hidden mirror: give its marker span a layout.
  const create = harness.document.createElement as (tagName: string) => RuntimeElement;
  harness.document.createElement = (tagName: string): RuntimeElement => {
    const element = create(tagName);
    if (tagName === "span") {
      Object.assign(element, { offsetLeft: 120, offsetTop: 18, offsetHeight: 18 });
    }
    return element;
  };
  textarea.rectProvider = () => ({ top: 200, left: 40, height: 60, bottom: 260, width: 400 });
}

function menuOption(menu: RuntimeElement, value: string): RuntimeElement {
  const found = allDescendants(menu).find((e) => e.getAttribute("data-edit-option") === value);
  assert.ok(found, value);
  return found;
}

test("T25: strict mode shows no GitHub buttons; GFM shows Alert, Checkbox and HTML table", () => {
  const strict = createRuntimeHarness({ initialPaletteMode: "strict" });
  openBlockEditorWithSource(strict);
  assert.equal(strict.createdElements.some((e) => e.getAttribute("data-edit-action") === "alert"), false);
  const gfm = createRuntimeHarness({ initialPaletteMode: "gfm" });
  openBlockEditorWithSource(gfm);
  for (const id of ["alert", "checkbox", "htmlTable"]) assert.ok(paletteButton(gfm, id), id);
});

test("T25: Alert writes the head, opens the type list near the caret and picking changes the type", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "gfm" });
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  withCaretMarker(harness, textarea);
  textarea.value = "Mind the gap";
  textarea.setSelectionRange(4, 4);
  const count = harness.messages.length;
  paletteButton(harness, "alert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "> [!NOTE]\n> Mind the gap");
  const menu = paletteMenu(harness)!;
  assert.ok(menu, "the list survives the insertion's input event");
  assert.equal(menu.getAttribute("data-edit-popover"), "alert");
  assert.equal(menu.getAttribute("data-edit-popover-at"), "caret");
  assert.equal(menu.style.getPropertyValue("inset-inline-start"), "160px", "40 + 120");
  const barTop = paletteOf(harness)!.getBoundingClientRect().top;
  assert.equal(menu.style.getPropertyValue("inset-block-start"), String(236 - barTop + 2) + "px", "caret bottom 236, in the bar's coordinates");
  menuOption(menu, "WARNING").dispatch("click", { preventDefault: () => undefined, stopPropagation: () => undefined });
  assert.equal(textarea.value, "> [!WARNING]\n> Mind the gap");
  assert.equal(calls.length, 2, "one undo step for the alert, one for the type");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(harness.messages.length, count, "no commit");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
  assert.equal(textarea.focusOptions?.preventScroll, true);
  assert.equal(textarea.selectionStart, "> [!WARNING]\n> Mind".length, "the caret stayed on its text");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-115
test("T25: dismissing the type list leaves NOTE, the focus in the text box and the editor open", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "gfm" });
  const focus = trackFocus(harness);
  const textarea = openBlockEditorWithSource(harness);
  stubExecCommand(harness, textarea);
  textarea.value = "";
  textarea.setSelectionRange(0, 0);
  paletteButton(harness, "alert").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "> [!NOTE]\n> ");
  assert.ok(paletteMenu(harness));
  assert.equal(typeKey(textarea, "Escape"), true);
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(focus.last(), textarea);
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true", "Escape closed the list only");
  // Clicking into the text instead also dismisses it.
  paletteButton(harness, "alert").dispatch("click", { preventDefault: () => undefined });
  assert.ok(paletteMenu(harness));
  textarea.dispatch("mousedown");
  assert.equal(paletteMenu(harness), undefined);
  assert.equal(textarea.value, "> [!NOTE]\n> ", "the second click only opened the list on the existing alert");
});

test("T25: Checkbox and HTML table edit the text box as one undo step each", () => {
  const harness = createRuntimeHarness({ initialPaletteMode: "gfm" });
  const textarea = openBlockEditorWithSource(harness);
  const calls = stubExecCommand(harness, textarea);
  textarea.value = "buy milk";
  textarea.setSelectionRange(3, 3);
  paletteButton(harness, "checkbox").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "- [ ] buy milk");
  assert.equal(calls.length, 1);
  paletteButton(harness, "checkbox").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value, "- buy milk");
  textarea.value = "| a | b |\n| :--- | ---: |\n| 1 | 2 |";
  textarea.setSelectionRange(2, 2);
  calls.length = 0;
  paletteButton(harness, "htmlTable").dispatch("click", { preventDefault: () => undefined });
  assert.equal(textarea.value.startsWith("<table>\n  <thead>"), true);
  assert.equal(textarea.value.includes('<td align="right">2</td>'), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "insertText");
  assert.equal(harness.mappings[1].getAttribute("data-sphinx-preview-editing"), "true");
});
