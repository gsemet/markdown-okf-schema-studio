import * as assert from "node:assert/strict";
import { test } from "node:test";

import { lineHunks } from "../../src/core/mapping/lineDiff";
import { installSideBySide } from "../../src/page/modules/sideBySide";
import { DomDocument, DomElement } from "./sideBySideDom";

/**
 * The cards of the side-by-side diff (modules/sideBySide.ts) on a DOM stand-in (sideBySideDom.ts), so
 * the file runs where no browser is installed (the `static` CI job). The module is fed the
 * `previewBaselineDiff` payload (rendered HEAD html plus the line hunks). What needs layout and CSS
 * (the two columns, the hidden original) is checked in Chromium by test/visual/capture_sbs_checks.py.
 */

const BASE_TEXT = ["Alpha stays", "", "The quick red fox", "", "Gone paragraph", "", "Omega tail", ""].join("\n");
const CURRENT_TEXT = ["Alpha stays", "", "The quick brown fox", "", "Omega tail", "", "New paragraph", ""].join("\n");

const BASELINE_HTML = [
  '<p data-line="1">Alpha stays</p>',
  '<p data-line="3">The quick red fox</p>',
  '<p data-line="5">Gone paragraph</p>',
  '<p data-line="7">Omega tail</p>',
].join("");

const PAGE_HTML = `
<button data-sphinx-preview-sbs-toggle></button>
<main id="sphinx-myst-preview-content">
<p data-line="1" id="keep">Alpha stays</p>
<p data-line="3" data-sphinx-preview-changed="true" id="changed">The quick brown fox</p>
<p data-line="5" id="omega">Omega tail</p>
<p data-line="7" data-sphinx-preview-changed="true" id="added">New paragraph</p>
</main>`;

interface Opened {
  document: DomDocument;
  module: ReturnType<typeof installSideBySide>;
  posted: unknown[];
  layouts: { count: number };
  element(id: string): DomElement;
  cards(): DomElement[];
}

function open(): Opened {
  const document = new DomDocument(PAGE_HTML);
  document.documentElement.setAttribute("data-sphinx-preview-sbs", "off");
  const posted: unknown[] = [];
  const layouts = { count: 0 };
  const module = installSideBySide(
    document as unknown as Document,
    { postMessage: (message: unknown) => posted.push(message) },
    { documentId: "file:///a.md", revision: 7, requestId: 1 },
    () => { layouts.count += 1; },
  );
  return {
    document,
    module,
    posted,
    layouts,
    element: (id) => document.getElementById(id)!,
    cards: () => document.body.querySelectorAll("[data-okf-sbs-card]"),
  };
}

function toggle(opened: Opened): void {
  opened.document.querySelector("[data-sphinx-preview-sbs-toggle]")!.click();
}

function sendBaseline(opened: Opened): void {
  opened.module.setBaseline({ html: BASELINE_HTML, hunks: lineHunks(BASE_TEXT, CURRENT_TEXT), revision: 7 });
}

function setEditMode(opened: Opened, on: boolean): void {
  if (on) opened.document.documentElement.setAttribute("data-sphinx-preview-edit-mode", "on");
  else opened.document.documentElement.removeAttribute("data-sphinx-preview-edit-mode");
  opened.module.sync();
}

interface CardView {
  kind: string | null;
  left: string;
  right: string;
  leftWords: string[];
  rightWords: string[];
}

function cardViews(opened: Opened): CardView[] {
  return opened.cards().map((card) => {
    const left = card.querySelector('[data-okf-sbs-side="base"]')!;
    const right = card.querySelector('[data-okf-sbs-side="current"]')!;
    const words = (side: DomElement): string[] => side.querySelectorAll("[data-okf-sbs-word]").map((word) => word.textContent);
    return {
      kind: card.getAttribute("data-okf-sbs-card"),
      left: left.textContent.trim(),
      right: right.textContent.trim(),
      leftWords: words(left),
      rightWords: words(right),
    };
  });
}

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-005
test("CR147: a changed block is a card with HEAD left, now right and the words marked", () => {
  const opened = open();
  toggle(opened);
  sendBaseline(opened);
  const changed = cardViews(opened).find((card) => card.kind === "changed");
  assert.ok(changed, "a changed card exists");
  assert.equal(changed.left, "The quick red fox");
  assert.equal(changed.right, "The quick brown fox");
  assert.deepEqual(changed.leftWords, ["red"]);
  assert.deepEqual(changed.rightWords, ["brown"]);
  // The unchanged blocks get no card and the card copies carry no page id.
  assert.equal(opened.cards().length, 3);
  assert.equal(opened.cards().flatMap((card) => card.querySelectorAll("[id]")).length, 0);
  assert.equal(opened.element("keep").hasAttribute("data-okf-sbs-replaced"), false);
  assert.ok(opened.layouts.count > 0, "the page is told the layout changed");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
test("CR147: an added block has an empty left side and a removed block an empty right side", () => {
  const opened = open();
  toggle(opened);
  sendBaseline(opened);
  const all = cardViews(opened);
  const added = all.find((card) => card.right === "New paragraph");
  assert.ok(added, "the added block has a card");
  assert.equal(added.kind, "added");
  assert.equal(added.left, "");
  assert.deepEqual(added.rightWords, []);
  const removed = all.find((card) => card.left === "Gone paragraph");
  assert.ok(removed, "the removed block comes back");
  assert.equal(removed.kind, "removed");
  assert.equal(removed.right, "");
  // The removed block shows where it was: before the paragraph that followed it.
  const card = opened.cards().find((element) => element.getAttribute("data-okf-sbs-card") === "removed")!;
  assert.equal(card.nextElementSibling?.getAttribute("id"), "omega");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
test("CR147: the original of a changed block is marked replaced while its card shows, and the file text is untouched", () => {
  const opened = open();
  toggle(opened);
  sendBaseline(opened);
  // The CSS hides what carries the mark (checked in Chromium by the visual campaign).
  assert.equal(opened.element("changed").getAttribute("data-okf-sbs-replaced"), "");
  assert.equal(opened.element("keep").hasAttribute("data-okf-sbs-replaced"), false);
  // The green bar mark of the original stays, so the bars come back when the diff goes off.
  assert.equal(opened.element("changed").getAttribute("data-sphinx-preview-changed"), "true");
  assert.equal(opened.element("changed").textContent, "The quick brown fox");
  assert.equal(opened.document.documentElement.getAttribute("data-sphinx-preview-sbs"), "on");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-008
test("CR147: edit mode shows and builds no cards and keeps the green bars; leaving it brings them back", () => {
  const opened = open();
  toggle(opened);
  sendBaseline(opened);
  setEditMode(opened, true);
  assert.equal(opened.cards().length, 0, "no card in edit mode");
  assert.equal(opened.document.body.querySelectorAll("[data-okf-sbs-replaced]").length, 0);
  assert.equal(opened.element("changed").getAttribute("data-sphinx-preview-changed"), "true");
  assert.equal(opened.element("added").getAttribute("data-sphinx-preview-changed"), "true");
  setEditMode(opened, false);
  assert.equal(opened.cards().length, 3, "the cards return after edit mode");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-008
test("CR147: toggling the diff off removes the cards and restores the default", () => {
  const opened = open();
  toggle(opened);
  sendBaseline(opened);
  assert.equal(opened.cards().length, 3);
  toggle(opened);
  assert.equal(opened.cards().length, 0);
  assert.equal(opened.document.body.querySelectorAll("[data-okf-sbs-replaced]").length, 0);
  assert.equal(opened.document.documentElement.getAttribute("data-sphinx-preview-sbs"), "off");
  assert.equal(opened.element("changed").getAttribute("data-sphinx-preview-changed"), "true");
  assert.equal(opened.posted.length, 2, "the host is told about both switches");
});
