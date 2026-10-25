import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

// @tests_req SwRS-MDOKFSTUDIO-TABLE-048
test("the table bar status takes no room when it is empty", () => {
  assert.match(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu \[data-sphinx-preview-edit-status\]:empty\s*\{\s*display: none;\s*\}/u,
  );
  // A status with text matches no rule that hides it: only the :empty selector sets display: none.
  assert.doesNotMatch(
    PREVIEW_THEME_CSS,
    /\.sphinx-preview-table-menu \[data-sphinx-preview-edit-status\]\s*\{[^}]*display: none/u,
  );
});
