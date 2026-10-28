import * as assert from "node:assert/strict";
import { test } from "node:test";

import { PALETTE_MODES } from "../../../src/core/configuration/settingsRegistry";
import { EMOJI_CATEGORIES } from "../../../src/core/palette/emoji";
import {
  ADMONITION_TYPES,
  ALERT_TYPES,
  PALETTE_ACTION_IDS,
  PALETTE_ACTIONS,
  type PaletteActionDescriptor,
} from "../../../src/core/palette/paletteActions";
import { PALETTE_ICONS } from "../../../src/core/palette/paletteIcons";

const descriptors = PALETTE_ACTION_IDS.map((id) => [id, PALETTE_ACTIONS[id] as PaletteActionDescriptor] as const);

// @tests_req SwRS-MDOKFSTUDIO-DIAG-017
// @tests_req SwRS-MDOKFSTUDIO-PALETTE-001
test("the registry lists every palette action once, in display order", () => {
  assert.deepEqual(PALETTE_ACTION_IDS, [
    "heading", "bold", "italic", "strikethrough", "color", "colorCode", "link", "image", "codeFence",
    "bulletList", "numberedList", "quote", "rule", "toc", "table", "emoji", "todo", "thread",
    "alert", "checkbox", "htmlTable", "details", "footnote", "mermaid", "columnAlign", "kbd",
    "admonition", "deflist", "math", "sub", "sup", "label", "ref", "doc", "cite", "dropdown",
    "tableCaption", "listTable", "pipeTable", "figure", "roleKbd", "vegaLite", "vega",
  ]);
});

test("every descriptor names a known icon, mode and scope, and every icon is used", () => {
  const used = new Set<string>();
  for (const [id, descriptor] of descriptors) {
    assert.ok(Object.hasOwn(PALETTE_ICONS, descriptor.icon), id);
    used.add(descriptor.icon);
    assert.ok(descriptor.modes.length > 0 && descriptor.modes.every((mode) => PALETTE_MODES.includes(mode)), id);
    assert.ok(descriptor.scopes.length > 0 && descriptor.scopes.every((scope) => scope === "block" || scope === "cell"), id);
    assert.ok(descriptor.label.trim() !== "", id);
  }
  assert.deepEqual([...Object.keys(PALETTE_ICONS)].filter((icon) => !used.has(icon)), []);
});

test("a popover descriptor carries what its popover shows", () => {
  for (const [id, descriptor] of descriptors) {
    if (descriptor.popover === "grid") assert.ok(descriptor.grid, id);
    if (descriptor.popover === "emoji") assert.equal(descriptor.emoji, EMOJI_CATEGORIES, id);
    if (descriptor.popover === "color") assert.ok(descriptor.colors && descriptor.colors.length > 0, id);
    if (descriptor.popover === "choices") assert.ok(descriptor.hostList, id);
    if (descriptor.slash?.menuOnly) assert.equal(descriptor.shortcut, undefined, id);
  }
  assert.deepEqual(PALETTE_ACTIONS.alert.options.map((option) => option.value), ALERT_TYPES);
  assert.deepEqual(PALETTE_ACTIONS.admonition.options.map((option) => option.value), [...ADMONITION_TYPES, "custom"]);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-265
test("the two chart actions are listed for Full only, in the Full group, with the chart slash names", () => {
  for (const id of ["vegaLite", "vega"] as const) {
    const descriptor = PALETTE_ACTIONS[id] as PaletteActionDescriptor;
    assert.deepEqual(descriptor.modes, ["full"], id);
    assert.equal(descriptor.group, "full", id);
    assert.deepEqual(descriptor.scopes, ["block"], id);
    assert.ok(descriptor.slash?.aliases?.includes("chart"), id);
  }
  assert.equal(PALETTE_ACTIONS.vegaLite.label, "Vega-Lite chart");
  assert.equal(PALETTE_ACTIONS.vega.label, "Vega chart");
  assert.deepEqual([...PALETTE_MODES], ["strict", "gfm", "myst", "full"]);
  assert.ok(PALETTE_ACTION_IDS.every((id) => id === "vegaLite" || id === "vega" || !(PALETTE_ACTIONS[id] as PaletteActionDescriptor).modes.includes("full")));
});
