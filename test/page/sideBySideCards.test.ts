import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
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

function open(pageHtml = PAGE_HTML): Opened {
  const document = new DomDocument(pageHtml);
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

/**
 * CR 234: the buffer of the real-window scenario incoming-changes (test/integration/realWindowGaps.ts)
 * after its last edit: one paragraph edited, one added, and the paragraph before the edited one removed.
 */
const INCOMING_FIXTURE = path.resolve(__dirname, "../../../test/integration/fixtures/incoming-changes.md");

function incomingTexts(): { committed: string; current: string } {
  const committed = fs.readFileSync(INCOMING_FIXTURE, "utf8");
  const lines = committed.split("\n");
  const edited = lines.findIndex((line) => line.startsWith("This paragraph will change"));
  lines[edited] = "This paragraph changed in the buffer and is not saved.";
  lines.splice(lines.length - 1, 0, "", "A paragraph added after the commit.");
  const removed = lines.findIndex((line) => line.startsWith("This paragraph stays as committed"));
  lines.splice(removed, 2);
  return { committed, current: lines.join("\n") };
}

const INCOMING_BASELINE_HTML = [
  '<h1 data-line="1">Incoming changes</h1>',
  '<p data-line="3">This paragraph stays as committed.</p>',
  '<p data-line="5">This paragraph will change in the buffer.</p>',
  '<ul data-line="7" data-end-line="8"><li data-line="7">a committed item</li><li data-line="8">another committed item</li></ul>',
  '<p data-line="10">The last committed paragraph.</p>',
].join("");

const INCOMING_PAGE_HTML = `
<button data-sphinx-preview-sbs-toggle></button>
<main id="sphinx-myst-preview-content">
<h1 data-line="1" id="title">Incoming changes</h1>
<p data-line="3" data-sphinx-preview-changed="true" id="edited">This paragraph changed in the buffer and is not saved.</p>
<ul data-line="5" data-end-line="6" id="list"><li data-line="5">a committed item</li><li data-line="6">another committed item</li></ul>
<p data-line="8" id="last">The last committed paragraph.</p>
<p data-line="10" data-sphinx-preview-changed="true" id="added">A paragraph added after the commit.</p>
</main>`;

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
test("CR234: a paragraph removed next to an edited one is a removed card, the edited one is paired with its own last-commit text", () => {
  const { committed, current } = incomingTexts();
  assert.equal(current.split("\n")[2], "This paragraph changed in the buffer and is not saved.", "the page lines follow the buffer");
  const opened = open(INCOMING_PAGE_HTML);
  toggle(opened);
  opened.module.setBaseline({ html: INCOMING_BASELINE_HTML, hunks: lineHunks(committed, current), revision: 7 });
  const all = cardViews(opened);
  assert.deepEqual(all.map((card) => [card.kind, card.left, card.right]), [
    ["removed", "This paragraph stays as committed.", ""],
    ["changed", "This paragraph will change in the buffer.", "This paragraph changed in the buffer and is not saved."],
    ["added", "", "A paragraph added after the commit."],
  ]);
  const edited = all[1];
  assert.deepEqual(edited.leftWords, ["will change", "buffer."]);
  assert.deepEqual(edited.rightWords, ["changed", "buffer and is not saved."]);
  // The removed card stands where the removed paragraph was: right before the card of the edited one.
  const cards = opened.cards();
  assert.equal(cards[0].nextElementSibling, cards[1]);
  assert.equal(cards[1].nextElementSibling?.getAttribute("id"), "edited");
  assert.equal(opened.element("list").hasAttribute("data-okf-sbs-replaced"), false, "the unchanged list has no card");
});

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-009
test("CR234: two blocks inside one hunk do not share a last-commit block: the closer keeps it, the other is added", () => {
  const base = ["Alpha stays", "", "The quick red fox", "", "Omega tail", ""].join("\n");
  const current = ["Alpha stays", "", "The quick brown fox", "", "A new paragraph", "", "Omega tail", ""].join("\n");
  const hunks = lineHunks(base, current);
  assert.deepEqual(hunks, [{ baseStart: 3, baseEnd: 3, start: 3, end: 5 }], "one hunk holds both blocks");
  const opened = open(`
<button data-sphinx-preview-sbs-toggle></button>
<main id="sphinx-myst-preview-content">
<p data-line="1">Alpha stays</p>
<p data-line="3">The quick brown fox</p>
<p data-line="5">A new paragraph</p>
<p data-line="7">Omega tail</p>
</main>`);
  toggle(opened);
  opened.module.setBaseline({
    html: '<p data-line="1">Alpha stays</p><p data-line="3">The quick red fox</p><p data-line="5">Omega tail</p>',
    hunks,
    revision: 7,
  });
  assert.deepEqual(cardViews(opened).map((card) => [card.kind, card.left, card.right]), [
    ["changed", "The quick red fox", "The quick brown fox"],
    ["added", "", "A new paragraph"],
  ]);
});
