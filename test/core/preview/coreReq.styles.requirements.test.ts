/**
 * Requirement tests of rendering-core stylesheet rows no other test checked: the 3 px offset from
 * which a popover or the slash menu fades in. Each test asserts the stylesheet of the current code.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";

const MOTION_ON = 'html[data-sphinx-preview-motion="on"]';
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// @tests_req SwRS-MDOKFSTUDIO-CORE-050#S3
test("a popover or the slash menu starts transparent 3 px above its place and fades in over 120 ms", () => {
  const starting = /@starting-style \{([\s\S]*?)\n\}/u.exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  const menus = ":is(.sphinx-preview-edit-palette-menu, .sphinx-preview-slash-menu, .sphinx-preview-frontmatter-picker)";
  const start = new RegExp(`${escape(`${MOTION_ON} ${menus}`)}\\s*\\{([^}]*)\\}`, "u").exec(starting)?.[1] ?? "";
  assert.match(start, /opacity:\s*0;/u, "the menu starts transparent");
  assert.match(start, /translate:\s*0 -3px;/u, "the menu starts 3 px above its place");

  const moving = new RegExp(`${escape(`${MOTION_ON} ${menus}`)}\\s*\\{([^}]*)\\}`, "u").exec(PREVIEW_THEME_CSS)?.[1] ?? "";
  assert.match(moving, /opacity var\(--sphinx-preview-motion-fast\)/u);
  assert.match(moving, /translate var\(--sphinx-preview-motion-fast\)/u, "the offset closes over the fast motion time");
  assert.match(PREVIEW_THEME_CSS, /--sphinx-preview-motion-fast:\s*120ms;/u);

  const palette = new RegExp(`${escape(`${MOTION_ON} :is(.sphinx-preview-edit-palette, `)}[^{]*\\{([^}]*)\\}`, "u").exec(starting)?.[1] ?? "";
  assert.match(palette, /opacity:\s*0;/u, "the edition palette starts transparent");
  assert.doesNotMatch(palette, /translate/u, "the edition palette does not move");
});
