/**
 * Tests of the selections Studio itself asks for (CR 456): expected once, inside a short window.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { STUDIO_SELECTION_WINDOW_MS, StudioSelections } from "../../src/host-vscode/studioSelections";

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S1
test("an expected selection is taken once, with its purpose, by uri and line", () => {
  let now = 1000;
  const selections = new StudioSelections(() => now);
  selections.expect("file:///a.md", 4, "no-mark");
  selections.expect("file:///a.md", 9, "marked-by-session");
  assert.equal(selections.take("file:///b.md", 4), undefined, "another file");
  assert.equal(selections.take("file:///a.md", 5), undefined, "another line");
  assert.equal(selections.take("file:///a.md", 9), "marked-by-session");
  assert.equal(selections.take("file:///a.md", 9), undefined, "used up");
  now += 10;
  assert.equal(selections.take("file:///a.md", 4), "no-mark");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-186#S1
test("an expected selection expires after the window", () => {
  let now = 1000;
  const selections = new StudioSelections(() => now);
  selections.expect("file:///a.md", 4, "no-mark");
  now += STUDIO_SELECTION_WINDOW_MS;
  assert.equal(selections.take("file:///a.md", 4), "no-mark", "at the window edge");
  selections.expect("file:///a.md", 4, "no-mark");
  now += STUDIO_SELECTION_WINDOW_MS + 1;
  assert.equal(selections.take("file:///a.md", 4), undefined, "past the window");
});
