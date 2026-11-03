import * as assert from "node:assert/strict";
import { test } from "node:test";

import { cardEdit, cardText, gridEdit, gridText, validateGrid } from "../../../src/page/modules/cardGridDirectives";
import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";
import { isSafeOkfColor } from "../../../src/core/security/spanColors";

const ctx = (value: string, at = value.length) =>
  ({ value, selectionStart: at, selectionEnd: at, scope: "block" as const });

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-270
test("the card form writes a {card} with the filled options only", () => {
  const full = cardText({ title: "Decision", header: "Accepted", footer: "Revisit later", link: "https://example.org" });
  assert.equal(
    full.text,
    ":::{card} Decision\n:header: Accepted\n:footer: Revisit later\n:link: https://example.org\n\nContent\n:::",
  );
  assert.equal(full.text.slice(full.bodyAt, full.bodyAt + 7), "Content");
  assert.equal(cardText({ title: "", header: "", footer: "", link: "" }).text, ":::{card}\n\nContent\n:::");
  assert.equal(
    cardText({ title: "A\n  B", header: " H\nI ", footer: "", link: "" }).text,
    ":::{card} A B\n:header: H I\n\nContent\n:::",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-270
test("the card is inserted after the selection and its body placeholder is selected", () => {
  const edit = cardEdit(ctx("Intro."), { title: "T", header: "", footer: "F", link: "" });
  const written = "Intro." + edit.text;
  assert.equal(written, "Intro.\n\n:::{card} T\n:footer: F\n\nContent\n:::");
  assert.equal(written.slice(edit.selectionStart, edit.selectionEnd), "Content");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
test("the grid form writes a {grid} of numbered {grid-item-card}s", () => {
  const { text, titleAt } = gridText({ columns: "1 2 3 3", gutter: "2", cards: "2" });
  assert.equal(
    text,
    [
      "::::{grid} 1 2 3 3", ":gutter: 2", "",
      ":::{grid-item-card} Card 1", "", "Content", ":::", "",
      ":::{grid-item-card} Card 2", "", "Content", ":::",
      "::::",
    ].join("\n"),
  );
  assert.equal(text.slice(titleAt, titleAt + 6), "Card 1");
  assert.equal(gridText({ columns: "3", gutter: "", cards: "1" }).text.split("\n")[1], "");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
test("the grid is inserted after the selection and the first title is selected", () => {
  const edit = gridEdit(ctx("Intro.\n\nOutro.", 6), { columns: "2", gutter: "", cards: "1" });
  assert.equal(edit.start, 6);
  const written = "Intro." + edit.text + "\n\nOutro.";
  assert.match(written, /^Intro\.\n\n::::\{grid\} 2\n\n:::\{grid-item-card\} Card 1\n/u);
  assert.equal(("Intro." + edit.text).slice(edit.selectionStart, edit.selectionEnd), "Card 1");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
test("the grid form refuses columns, gutter and card counts out of range", () => {
  assert.equal(validateGrid({ columns: "1 2 3 3", gutter: "2", cards: "3" }), undefined);
  assert.equal(validateGrid({ columns: "2", gutter: "", cards: "24" }), undefined);
  assert.match(validateGrid({ columns: "", gutter: "", cards: "2" }) ?? "", /^Columns/u);
  assert.match(validateGrid({ columns: "1 2 3 4 5", gutter: "", cards: "2" }) ?? "", /^Columns/u);
  assert.match(validateGrid({ columns: "13", gutter: "", cards: "2" }) ?? "", /^Columns/u);
  assert.match(validateGrid({ columns: "x", gutter: "", cards: "2" }) ?? "", /^Columns/u);
  assert.match(validateGrid({ columns: "2", gutter: "6", cards: "2" }) ?? "", /^Gutter/u);
  assert.match(validateGrid({ columns: "2", gutter: "a", cards: "2" }) ?? "", /^Gutter/u);
  assert.match(validateGrid({ columns: "2", gutter: "", cards: "0" }) ?? "", /^Cards/u);
  assert.match(validateGrid({ columns: "2", gutter: "", cards: "25" }) ?? "", /^Cards/u);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-270
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
test("the registry lists Card and Grid, with their panel, in the MyST palette only", () => {
  const actions = createEditActions(["js"], createMarkdownTableTools(), isSafeOkfColor);
  for (const id of ["card", "grid"]) {
    const action = actions.byId.get(id)!;
    assert.ok(action, id);
    assert.equal(action.panel, id);
    assert.deepEqual(action.modes, ["myst"]);
    assert.equal(action.group, "myst");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
test("the grid form writes each card's header, footer and link as the card form does", () => {
  const { text, titleAt } = gridText({
    columns: "2", gutter: "", cards: "3",
    headers: "Alpha | Beta", footers: "|Footer 2", links: "https://example.org",
  });
  assert.equal(
    text,
    [
      "::::{grid} 2", "",
      ":::{grid-item-card} Card 1", ":header: Alpha", ":link: https://example.org", "", "Content", ":::", "",
      ":::{grid-item-card} Card 2", ":header: Beta", ":footer: Footer 2", "", "Content", ":::", "",
      ":::{grid-item-card} Card 3", "", "Content", ":::",
      "::::",
    ].join("\n"),
  );
  assert.equal(text.slice(titleAt, titleAt + 6), "Card 1");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-271
test("the grid form refuses more header, footer or link entries than cards", () => {
  const base = { columns: "2", gutter: "", cards: "2" };
  assert.equal(validateGrid({ ...base, headers: "A|B", footers: "|F", links: "" }), undefined);
  assert.match(validateGrid({ ...base, headers: "A|B|C" }) ?? "", /^Headers/u);
  assert.match(validateGrid({ ...base, footers: "A|B|C" }) ?? "", /^Footers/u);
  assert.match(validateGrid({ ...base, links: "A|B|C" }) ?? "", /^Links/u);
});
