---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-002
uuid: e07509d3-c0d9-463d-baf5-258b09b85ac8
title: Every edit bar button shows the slide-in tooltip and the rule button a
  dashes icon
description: While a block editor is open, the extension SHALL give every button
  of its edit bar the data-tooltip attribute with the text of its title, so that
  hovering or focusing the button shows the same sliding tooltip bubble as the
  floating toolbar, and SHALL draw the Horizontal rule button as three dashes.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteIcons.ts
- src/core/preview/styles/pageChromeStyles.ts
- src/page/modules/editPalette.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/runtimeEditPalette.test.ts
- test/visual/scenarioDefinitions1.ts
---

## Every edit bar button shows the slide-in tooltip and the rule button a dashes icon

### Normative behavior

While a block editor is open, the extension SHALL give every button of its edit bar the data-tooltip attribute with the text of its title, so that hovering or focusing the button shows the same sliding tooltip bubble as the floating toolbar, and SHALL draw the Horizontal rule button as three dashes.

### Scenario (nominal): Hovering a button

- GIVEN a paragraph editor open with its edit bar
- WHEN the pointer rests on the Horizontal rule button
- THEN the button carries data-tooltip "Horizontal rule" and a bubble with that text slides in under it within 100 ms, as under a floating toolbar button

### Scenario (boundary): Shortcut and rule icon

- GIVEN the edit bar of a paragraph editor
- WHEN the buttons are built
- THEN each data-tooltip equals the title of its button, including the shortcut in parentheses (for example "Bold (Ctrl+B)"), the title stays for the accessible hint, and the Horizontal rule icon is three separate dashes on one line, not the lines of centred text

### Verification notes

- Method: test/page/runtimeEditPalette.test.ts (T21b: every palette button carries a data-tooltip equal to its title; the rule icon is dashes); test/core/preview/previewStyles.test.ts (the edit bar tooltip rules); visual scenarios palette-slash/v23-edit-bar-tooltip-rule-cream-900 and v24-edit-bar-tooltip-rule-dark-900 (hovered rule button shows its bubble)
- Criteria: Every direct button of the edit bar has a non-empty data-tooltip equal to its title; the computed ::after of the hovered button is visible, opaque and contains the button's name; the rule icon path has no segment other than three short horizontal dashes.
