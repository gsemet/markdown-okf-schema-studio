import * as assert from "node:assert/strict";
import { test } from "node:test";

import { escapeUntilClosed } from "../integration/escapeClose";

/** The editor as the page behaves: Escape in the figure form closes the form, then the editor. */
function editorWithFigureForm(): { press: () => Promise<void>; isOpen: () => Promise<boolean>; presses: () => number } {
  let formOpen = true;
  let editorOpen = true;
  let count = 0;
  return {
    press: async () => {
      count += 1;
      if (formOpen) formOpen = false;
      else editorOpen = false;
    },
    isOpen: async () => editorOpen,
    presses: () => count,
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
test("one Escape in the figure form leaves the block editor open; the helper presses again", async () => {
  const single = editorWithFigureForm();
  await single.press();
  assert.equal(await single.isOpen(), true, "a single Escape only closes the figure form");

  const editor = editorWithFigureForm();
  const presses = await escapeUntilClosed(editor.press, editor.isOpen, async () => undefined);
  assert.equal(presses, 2);
  assert.equal(await editor.isOpen(), false);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-021
test("a text-box editor closes with the first Escape", async () => {
  let open = true;
  const presses = await escapeUntilClosed(async () => { open = false; }, async () => open, async () => undefined);
  assert.equal(presses, 1);
});
