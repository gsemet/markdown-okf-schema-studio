import * as assert from "node:assert/strict";
import { test } from "node:test";

import { EDIT_MODE_CSS } from "../../../src/core/preview/styles/editModeStyles";

/**
 * Edit mode rules of the preview stylesheet (BLOCK scope): the rules are read from the stylesheet
 * text, because a real browser is needed to compute them (the visual scenarios do that for a few).
 */

interface Rule {
  selectors: string[];
  declarations: Map<string, string>;
}

/** The flat rules of the edit mode stylesheet: comments dropped, one entry per `{}` block. */
function rules(): Rule[] {
  const css = EDIT_MODE_CSS.replace(/\/\*[\s\S]*?\*\//gu, "");
  const found: Rule[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const declarations = new Map<string, string>();
    for (const declaration of match[2]!.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon > 0) declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
    }
    found.push({ selectors: match[1]!.split(",").map((selector) => selector.trim()), declarations });
  }
  return found;
}

/** The rules that list `selector` among their selectors. */
function rulesFor(selector: string): Rule[] {
  return rules().filter((rule) => rule.selectors.includes(selector));
}

const BAR_BUTTON = ".sphinx-preview-insert-point button";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-087#S4
test("the plus button is transparent and becomes opaque on hover of a block, of the button and on focus", () => {
  const idle = rulesFor(BAR_BUTTON);
  assert.equal(idle.length, 1);
  assert.equal(idle[0]!.declarations.get("opacity"), "0");
  for (const selector of [
    "[data-sphinx-source-line]:hover + .sphinx-preview-insert-point button",
    ".sphinx-preview-insert-point button:hover",
    ".sphinx-preview-insert-point button:focus-visible",
  ]) {
    const shown = rulesFor(selector);
    assert.equal(shown.length, 1, selector);
    assert.equal(shown[0]!.declarations.get("opacity"), "1", selector);
  }
  // The button stays a real button: it is transparent, not removed, so the keyboard still reaches it.
  assert.equal(idle[0]!.declarations.get("display"), "flex");
  assert.equal(rules().some((rule) => rule.selectors.includes(BAR_BUTTON) && rule.declarations.get("visibility") === "hidden"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S5
test("the move arrows are hidden only while a block editor is open", () => {
  const hiding = rulesFor('html[data-sphinx-preview-block-editing="true"] .sphinx-preview-insert-point .sphinx-preview-move');
  assert.equal(hiding.length, 1);
  assert.equal(hiding[0]!.declarations.get("display"), "none");
  const otherHiders = rules().filter((rule) => rule.declarations.get("display") === "none"
    && rule.selectors.some((selector) => selector.includes("sphinx-preview-move")));
  assert.equal(otherHiders.length, 1, "no other rule hides the arrows");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-017#S7
test("mapped blocks show the text cursor in edit mode only", () => {
  const edit = rulesFor('html[data-sphinx-preview-edit-mode="on"] [data-sphinx-source-file][data-sphinx-source-line]');
  assert.equal(edit.length, 1);
  assert.equal(edit[0]!.declarations.get("cursor"), "text");
  const textCursors = rules().filter((rule) => rule.declarations.get("cursor") === "text"
    && rule.selectors.some((selector) => selector.includes("data-sphinx-source-line")));
  assert.deepEqual(textCursors, edit, "no rule gives a mapped block the text cursor outside edit mode");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S9
test("the block actions of a hovered block yield to the keyboard selection, which shows its own bar", () => {
  const keyboard = 'html[data-sphinx-preview-actions-owner="keyboard"]';
  const yielding = rules().filter((rule) => rule.selectors.some((selector) =>
    selector.startsWith(keyboard + " [data-sphinx-source-line]:hover")));
  assert.equal(yielding.length, 1);
  assert.equal(yielding[0]!.declarations.get("opacity"), "0");
  const shown = rulesFor(keyboard + ' .sphinx-preview-insert-point[data-sphinx-actions-shown="true"] button');
  assert.equal(shown.length, 1);
  assert.equal(shown[0]!.declarations.get("opacity"), "1");
  const ring = rulesFor('html[data-sphinx-preview-edit-mode="on"][data-sphinx-preview-actions-owner="pointer"] [data-sphinx-preview-block-selected="true"]');
  assert.equal(ring.length, 1);
  assert.equal(ring[0]!.declarations.get("outline"), "none");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-265#S2
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-109#S4
test("the Delete block button touches the down arrow, the move status never overlaps it, and it hides while editing", () => {
  const arrow = rulesFor(".sphinx-preview-insert-point button.sphinx-preview-move--down")[0]!;
  const remove = rulesFor(".sphinx-preview-insert-point button.sphinx-preview-delete")[0]!;
  const status = rulesFor(".sphinx-preview-move-status")[0]!;
  const em = (value: string | undefined): number => Number.parseFloat(value ?? "NaN");
  // The buttons are 1.4em wide: the arrow ends where the delete button starts, the status starts after it.
  assert.ok(Math.abs(em(remove.declarations.get("left")) - (em(arrow.declarations.get("left")) + 1.4)) < 1e-9);
  assert.ok(em(status.declarations.get("left")) >= em(remove.declarations.get("left")) + 1.4);
  const hiding = rulesFor('html[data-sphinx-preview-block-editing="true"] .sphinx-preview-insert-point .sphinx-preview-delete');
  assert.equal(hiding.length, 1);
  assert.equal(hiding[0]!.declarations.get("display"), "none");
});
