---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-273
uuid: 99c1e05e-c56e-449b-bf26-0b2fc33152ac
title: The MyST palette mode adds a Tabs command
description: When the palette mode is MyST or Full, the extension SHALL list a
  Content tabs action in the edition palette and the slash menu (/tab-set,
  /tabs) that inserts a MyST tab-set of two tab-item tabs after the selection,
  set apart from the text around it, with the first tab title selected.
project: MDOKFSTUDIO
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/slashSyntaxCoverage.test.ts
default_owner_email: gaetan@xeberon.net
---

## The MyST palette mode adds a Tabs command

### Normative behavior

When the palette mode is MyST or Full, the extension SHALL list a Content tabs action in the edition palette and the slash menu (/tab-set, /tabs) that inserts a MyST tab-set of two tab-item tabs after the selection, set apart from the text around it, with the first tab title selected.

### Scenario (nominal): The command inserts a tab set

- GIVEN a paragraph and the caret at its end, in the MyST or Full palette mode
- WHEN the writer picks Content tabs in the palette or types /tab-set in the slash menu
- THEN a blank line and a `::::{tab-set}` container holding two `:::{tab-item}` tabs (Tab 1 and Tab 2, each with the body Content) are inserted after the selection, set apart from the text around it, with the words Tab 1 selected, and the block renders as a tab set

### Scenario (refusal): Strict and GFM modes do not list it

- GIVEN the palette in the Strict or GFM mode
- WHEN the palette is shown or the slash menu is typed with /tab-set
- THEN no Tabs command is offered; the tab sets of the document are rendered all the same

### Verification notes

- Method: test/page/modules/slashSyntaxCoverage.test.ts (the inserted text and selection; the mode filter of the slash entry)
- Method: test/core/palette/paletteActions.test.ts and test/page/modules/editActions.test.ts (the registry order and modes)
- Criteria: The Content tabs action is listed from the MyST mode up and inserts a tab set that renders.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
