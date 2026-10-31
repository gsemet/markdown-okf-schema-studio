import * as assert from "node:assert/strict";
import { test } from "node:test";

import { EDIT_MODE_CSS } from "../../src/core/preview/styles/editModeStyles";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { NEXT_IDENTIFIERS, patchMessage, sourceReply, t21ClickEvent } from "./runtimeTestSupport";

/**
 * CR 217: in edit mode a plain click, Enter or Space on a link opens the editor of the block that
 * holds the link; Cmd/Ctrl+click and Cmd/Ctrl+Enter follow it. In reading mode a click follows the
 * link. The page runs in the fake DOM of `runtimeHarness.ts`.
 */

/** A link of the content: answers `a` for `closest` like a real anchor. */
class LinkElement extends RuntimeElement {
  public constructor(harness: RuntimeHarness, request: string) {
    super({ "data-sphinx-preview-navigation": request }, harness.windowState, 0, 20, "a");
  }

  public override closest(selector: string): RuntimeElement | null {
    return selector === "a" ? this : super.closest(selector);
  }
}

function posts(harness: RuntimeHarness, type: string): Array<Record<string, unknown>> {
  return harness.messages.filter((message) => message.type === type);
}

/** Harness with edit mode (or not) and a link inside mapped block `index`. */
function withLink(editMode: boolean, index = 1): { harness: RuntimeHarness; link: LinkElement } {
  const harness = createRuntimeHarness();
  if (editMode) harness.editModeButton.dispatch("click");
  const link = new LinkElement(harness, "related-target.md");
  harness.mappings[index].appendChild(link);
  return { harness, link };
}

function click(harness: RuntimeHarness, target: RuntimeElement, extra: Record<string, unknown> = {}): void {
  harness.dispatchDocument("click", {
    target, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra,
  });
}

function press(harness: RuntimeHarness, target: RuntimeElement, name: string, extra: Record<string, unknown> = {}): void {
  harness.dispatchDocument("keydown", {
    key: name, target, preventDefault: () => undefined, stopPropagation: () => undefined, ...extra,
  });
}

function assertOpensParagraphOnly(harness: RuntimeHarness, line: number, endLine: number): void {
  const opens = posts(harness, "previewEditOpen");
  assert.equal(opens.length, 1, "the block editor of the paragraph opens");
  assert.equal(opens[0]!.line, line);
  assert.equal(opens[0]!.endLine, endLine);
  assert.deepEqual(posts(harness, "previewLink"), [], "the link is not followed");
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: a plain click on a link inside a paragraph opens the paragraph editor and does not follow", () => {
  const { harness, link } = withLink(true);
  click(harness, link);
  assertOpensParagraphOnly(harness, 50, 52);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: a plain click on a link-only paragraph opens its editor and does not follow", () => {
  const { harness, link } = withLink(true, 2);
  click(harness, link);
  const opens = posts(harness, "previewEditOpen");
  assert.equal(opens.length, 1, "the block editor of the link-only paragraph opens");
  assert.equal(opens[0]!.line, Number(harness.mappings[2].getAttribute("data-sphinx-source-line")));
  assert.deepEqual(posts(harness, "previewLink"), [], "the link is not followed");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: Enter on a focused link inside a paragraph opens the editor and does not follow", () => {
  const { harness, link } = withLink(true);
  press(harness, link, "Enter");
  assertOpensParagraphOnly(harness, 50, 52);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: Space on a focused link inside a paragraph opens the editor and does not follow", () => {
  const { harness, link } = withLink(true);
  press(harness, link, " ");
  assertOpensParagraphOnly(harness, 50, 52);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: Cmd click and Ctrl click on a link follow it and open no editor", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const { harness, link } = withLink(true);
    click(harness, link, modifier);
    assert.deepEqual(posts(harness, "previewEditOpen"), [], "no editor opens");
    assert.equal(posts(harness, "previewLink").length, 1, "the link is followed");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: Cmd+Enter and Ctrl+Enter on a focused link follow it and open no editor", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const { harness, link } = withLink(true);
    press(harness, link, "Enter", modifier);
    assert.deepEqual(posts(harness, "previewEditOpen"), [], "no editor opens");
    assert.equal(posts(harness, "previewLink").length, 1, "the link is followed");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("reading mode: a plain click on a link follows it and opens no editor", () => {
  const { harness, link } = withLink(false);
  click(harness, link);
  assert.deepEqual(posts(harness, "previewEditOpen"), [], "no editor opens");
  assert.equal(posts(harness, "previewLink").length, 1, "the link is followed");
});

/** A mapped element of the fake page on source lines `line`..`endLine`. */
function mapped(harness: RuntimeHarness, line: number, endLine = line, tagName = "div"): RuntimeElement {
  return new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": String(line),
    "data-sphinx-source-end-line": String(endLine),
  }, harness.windowState, 0, 20, tagName);
}

/**
 * A `:link:` card as the renderer maps it (fixture 46-grid-cards): the title on the directive line
 * holds the card link; the body paragraph and the footer have their own lines. In edit mode the
 * stretched overlay of the link no longer catches the pointer, so the click lands on the part.
 */
function linkedCard(harness: RuntimeHarness): { title: RuntimeElement; link: LinkElement; body: RuntimeElement; footer: RuntimeElement } {
  const card = harness.mappings[2];
  card.setAttribute("data-sphinx-source-line", "14");
  card.setAttribute("data-sphinx-source-end-line", "22");
  const title = mapped(harness, 14);
  const link = new LinkElement(harness, "targets/alpha.md");
  title.appendChild(link);
  const body = mapped(harness, 19, 19, "p");
  const footer = mapped(harness, 21);
  [title, body, footer].forEach((part) => card.appendChild(part));
  return { title, link, body, footer };
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: a click on a linked card's title, body or footer opens that part's line, never the link", () => {
  for (const [part, line] of [["title", 14], ["body", 19], ["footer", 21]] as const) {
    const harness = createRuntimeHarness();
    harness.editModeButton.dispatch("click");
    const card = linkedCard(harness);
    click(harness, part === "title" ? card.link : card[part]);
    const opens = posts(harness, "previewEditOpen");
    assert.equal(opens.length, 1, `a click on the ${part} opens one editor`);
    assert.equal(opens[0]!.line, line, `the ${part} editor opens on line ${line}`);
    assert.deepEqual(posts(harness, "previewLink"), [], `a click on the ${part} does not follow the card link`);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-258
test("edit mode: a Cmd or Ctrl click on a linked card's title follows the card link", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    const harness = createRuntimeHarness();
    harness.editModeButton.dispatch("click");
    const { link } = linkedCard(harness);
    click(harness, link, modifier);
    assert.deepEqual(posts(harness, "previewEditOpen"), []);
    assert.deepEqual(posts(harness, "previewLink").map((message) => message.request), ["targets/alpha.md"]);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-077
test("edit mode: a middle click on a link follows it and opens no editor", () => {
  const { harness, link } = withLink(true);
  harness.dispatchDocument("auxclick", { type: "auxclick", button: 1, target: link, preventDefault: () => undefined });
  assert.deepEqual(posts(harness, "previewEditOpen"), [], "no editor opens");
  assert.equal(posts(harness, "previewLink").length, 1, "the link is followed");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-041
test("edit mode: a click on a link while another block editor is open saves it first and follows nothing", () => {
  const { harness, link } = withLink(true, 2);
  click(harness, harness.mappings[1]);
  assert.equal(posts(harness, "previewEditOpen").length, 1, "the first block editor opens");
  sourceReply(harness, "Second paragraph.\n");
  const textarea = harness.createdElements.find((element) => element.tagName === "TEXTAREA")!;
  textarea.value = "Second paragraph, changed.\n";
  click(harness, link);
  assert.deepEqual(posts(harness, "previewLink"), [], "the link is not followed: no other file opens");
  assert.equal(posts(harness, "previewEditSave").length, 1, "the open editor is saved first, as for any block");
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-001
test("edit mode: a link of the properties table keeps its field editor and its Cmd click", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true, propertiesMapped: true });
  harness.editModeButton.dispatch("click");
  const link = new RuntimeElement(
    { "data-sphinx-preview-navigation": "okf-link:abc", class: "okf-frontmatter-link" },
    harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  harness.dispatchDocument("click", t21ClickEvent(link));
  assert.deepEqual(posts(harness, "previewEditOpen"), [], "no block editor opens on the properties table");
  assert.deepEqual(posts(harness, "previewLink"), []);
  assert.equal(harness.createdElements.filter((element) =>
    element.getAttribute("data-okf-frontmatter-editor") === "true").length, 1, "the field editor opens");
  const reading = createRuntimeHarness({ mapFrontmatter: true, propertiesMapped: true });
  reading.editModeButton.dispatch("click");
  reading.frontmatterRow.setAttribute("data-okf-editable", "false");
  const fixed = new RuntimeElement({ "data-sphinx-preview-navigation": "okf-link:abc" }, reading.windowState, 0, 20, "a");
  reading.frontmatterValueDisplay.appendChild(fixed);
  click(reading, fixed);
  assert.deepEqual(posts(reading, "previewEditOpen"), [], "a link of a read-only field never opens a block editor");
  assert.equal(posts(reading, "previewLink").length, 1, "and is followed");
});

const HINT_LINE = "\nCtrl+click to follow";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: a link carries a Cmd/Ctrl+click to follow tooltip line; reading mode does not", () => {
  const harness = createRuntimeHarness();
  const link = new LinkElement(harness, "related-target.md");
  link.setAttribute("title", "/ws/related-target.md");
  harness.mappings[1].appendChild(link);
  harness.contentLinks.push(link);
  harness.editModeButton.dispatch("click");
  assert.equal(link.getAttribute("title"), `/ws/related-target.md${HINT_LINE}`);
  harness.editModeButton.dispatch("click");
  assert.equal(link.getAttribute("title"), "/ws/related-target.md", "reading mode keeps the original title only");

  const untitled = createRuntimeHarness();
  const bare = new LinkElement(untitled, "related-target.md");
  untitled.mappings[1].appendChild(bare);
  untitled.contentLinks.push(bare);
  untitled.editModeButton.dispatch("click");
  assert.equal(bare.getAttribute("title"), "Ctrl+click to follow");
  untitled.editModeButton.dispatch("click");
  assert.equal(bare.getAttribute("title"), null);

  const apple = createRuntimeHarness({ platform: "MacIntel" });
  const macLink = new LinkElement(apple, "related-target.md");
  apple.mappings[1].appendChild(macLink);
  apple.contentLinks.push(macLink);
  apple.editModeButton.dispatch("click");
  assert.equal(macLink.getAttribute("title"), "Cmd+click to follow", "macOS says Cmd");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: the follow hint survives a later target hint and a content render", () => {
  const harness = createRuntimeHarness();
  harness.editModeButton.dispatch("click");
  const fresh = new LinkElement(harness, "related-target.md");
  harness.mappings[1].appendChild(fresh);
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => { harness.contentLinks.splice(0, harness.contentLinks.length, fresh); },
  });
  harness.dispatchMessage(patchMessage());
  assert.equal(fresh.getAttribute("title"), "Ctrl+click to follow", "the new content's link has the hint");
  harness.dispatchMessage({
    type: "previewLinkTargets",
    ...NEXT_IDENTIFIERS,
    targets: [{ request: "related-target.md", kind: "local", path: "/ws/related-target.md" }],
  });
  assert.equal(fresh.getAttribute("title"), `/ws/related-target.md${HINT_LINE}`, "the target stays the first line");
  harness.editModeButton.dispatch("click");
  assert.equal(fresh.getAttribute("title"), "/ws/related-target.md", "leaving edit mode keeps the target only");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: a content render that rebuilds a hinted link with a known target keeps one hint line", () => {
  const harness = createRuntimeHarness();
  const link = new LinkElement(harness, "related-target.md");
  link.setAttribute("data-sphinx-preview-link-state", "local");
  link.setAttribute("title", "/ws/related-target.md");
  harness.mappings[1].appendChild(link);
  harness.contentLinks.push(link);
  harness.editModeButton.dispatch("click");
  assert.equal(link.getAttribute("title"), `/ws/related-target.md${HINT_LINE}`);
  // Each patch rebuilds the link: the new element has neither the target hint nor the follow hint.
  let current: LinkElement = link;
  Object.defineProperty(harness.previewContent, "innerHTML", {
    configurable: true,
    get: () => "",
    set: () => {
      current = new LinkElement(harness, "related-target.md");
      harness.mappings[1].appendChild(current);
      harness.contentLinks.splice(0, harness.contentLinks.length, current);
    },
  });
  harness.dispatchMessage(patchMessage());
  assert.notEqual(current, link, "the patch rebuilt the link");
  assert.equal(current.getAttribute("title"), `/ws/related-target.md${HINT_LINE}`, "one hint line after a render");
  harness.dispatchMessage(patchMessage({ revision: 8, requestId: 12, next: { revision: 9, requestId: 13 } }));
  harness.dispatchMessage(patchMessage({ revision: 9, requestId: 13, next: { revision: 10, requestId: 14 } }));
  assert.equal(current.getAttribute("title"), `/ws/related-target.md${HINT_LINE}`, "repeated renders add no line");
  harness.editModeButton.dispatch("click");
  assert.equal(current.getAttribute("title"), "/ws/related-target.md", "reading mode gets the bare target back");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-014
test("edit mode: a link of the properties table gets no follow hint", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true, propertiesMapped: true });
  const link = new RuntimeElement({ "data-sphinx-preview-navigation": "okf-link:abc", title: "abc" },
    harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  harness.contentLinks.push(link);
  harness.editModeButton.dispatch("click");
  assert.equal(link.getAttribute("title"), "abc");
});

/** The element of the fake page that carries the edit hover outline, if any. */
function outlined(harness: RuntimeHarness): RuntimeElement[] {
  const all = (element: RuntimeElement): RuntimeElement[] =>
    [element, ...element.childElements.flatMap((child) => all(child))];
  return [...harness.mappings.flatMap((element) => all(element)), ...all(harness.frontmatterProperties)]
    .filter((element) => element.getAttribute("data-sphinx-preview-edit-hover") !== null);
}

/** The edit mode rules of the stylesheet that set `cursor: text`, one selector each, comments dropped. */
function textCursorSelectors(): string[] {
  const css = EDIT_MODE_CSS.replace(/\/\*[\s\S]*?\*\//gu, "");
  return Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/gu))
    .filter((match) => /cursor:\s*text/u.test(match[2]!))
    .flatMap((match) => match[1]!.split(",").map((selector) => selector.trim()));
}

const LINK_EDITS = "data-sphinx-preview-link-edits";

/**
 * A link inside a comment-thread body that sits in mapped paragraph 1 (as `commentMarkers.ts`
 * renders it): `.okf-comment > .okf-comment-body > a`. The page knows it from the start.
 */
function commentLink(harness: RuntimeHarness): LinkElement {
  const comment = new RuntimeElement({ class: "okf-comment", "data-okf-comment-kind": "thread" }, harness.windowState, 0, 20, "span");
  const body = new RuntimeElement({ class: "okf-comment-body" }, harness.windowState, 0, 20, "div");
  const link = new LinkElement(harness, "https://example.com/");
  comment.appendChild(body);
  body.appendChild(link);
  harness.mappings[1].appendChild(comment);
  harness.contentLinks.push(link);
  return link;
}

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017
test("edit mode: hovering a link in a comment-thread body shows no edit outline and keeps the pointer cursor", () => {
  const harness = createRuntimeHarness();
  const link = commentLink(harness);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("mouseover", { target: link });
  assert.deepEqual(outlined(harness), [], "no block is outlined: a click there follows the link");
  assert.equal(link.getAttribute(LINK_EDITS), null, "no text cursor marker: the link keeps its pointer cursor");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017
test("edit mode: hovering a link of the properties table shows no edit outline and keeps the pointer cursor", () => {
  const harness = createRuntimeHarness({ mapFrontmatter: true, propertiesMapped: true });
  const link = new RuntimeElement({ "data-sphinx-preview-navigation": "okf-link:abc", class: "okf-frontmatter-link" },
    harness.windowState, 0, 20, "a");
  harness.frontmatterValueDisplay.appendChild(link);
  harness.contentLinks.push(link);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("mouseover", { target: link });
  assert.deepEqual(outlined(harness), [], "the properties table is not outlined");
  assert.equal(link.getAttribute(LINK_EDITS), null, "no text cursor marker on a properties link");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017
test("edit mode: hovering a link inside a paragraph outlines the paragraph and gives it the text cursor", () => {
  const harness = createRuntimeHarness();
  const link = new LinkElement(harness, "related-target.md");
  harness.mappings[1].appendChild(link);
  harness.contentLinks.push(link);
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("mouseover", { target: link });
  assert.deepEqual(outlined(harness), [harness.mappings[1]], "the paragraph is outlined");
  assert.equal(link.getAttribute(LINK_EDITS), "true", "the link is marked: a plain click edits");
  harness.editModeButton.dispatch("click");
  assert.equal(link.getAttribute(LINK_EDITS), null, "reading mode drops the marker");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017
test("edit mode stylesheet: only links a plain click edits get the text cursor; every other link keeps its pointer", () => {
  const linkSelectors = textCursorSelectors().filter((selector) => /(^|\s)a(\[|$|\s|:)/u.test(selector));
  assert.deepEqual(linkSelectors, [`html[data-sphinx-preview-edit-mode="on"] a[${LINK_EDITS}="true"]`],
    "the text cursor on a link follows the marker set where the click rule applies, nothing else");
});
