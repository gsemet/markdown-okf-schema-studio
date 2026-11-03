---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-271
uuid: c1497b7b-91bf-4ec8-b5db-eac213db783a
title: Grid form inserts a MyST grid of cards
description: When the writer chooses Grid from the MyST palette or the slash
  menu, the extension SHALL open a form for the grid columns, gutter, number of
  cards and the header, footer and link of each card and, on Insert, write a
  {grid} directive holding that many {grid-item-card} directives after the
  selection.
project: markdown-okf-schema-studio
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
- src/page/features/editorChrome.ts
- src/page/modules/cardGridDirectives.ts
- src/page/modules/directivePanel.ts
tested_in_files:
- test/page/modules/cardGridDirectives.test.ts
- test/page/runtimePaletteActions.test.ts
- test/visual/cardGridFormScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Grid form inserts a MyST grid of cards

### Normative behavior

When the writer chooses Grid from the MyST palette or the slash menu, the extension SHALL open a form for the grid columns, gutter, number of cards and the header, footer and link of each card and, on Insert, write a {grid} directive holding that many {grid-item-card} directives after the selection.

### Scenario (nominal): Open the form and insert

- GIVEN a block editor in the MyST palette mode
- WHEN the writer presses the Grid button, or chooses Grid in the slash menu (the typed /query is removed first)
- THEN a form opens under the palette with the fields Columns, Gutter, Cards, Headers, Footers and Links; Insert writes a {grid} directive after the selection, with the columns as its argument, a :gutter: option when the gutter is filled, and one {grid-item-card} per requested card, and selects the title of the first card. Headers, Footers and Links hold one entry per card, separated by |: entry N becomes the :header:, :footer: or :link: option of card N, as in the Card form (SwRS-MDOKFSTUDIO-PALETTE-270), and an empty or missing entry leaves the option out

### Scenario (boundary): Refusals and cancel

| Input | Outcome |
| --- | --- |
| Columns that are not one to four numbers from 1 to 12 | The form stays open and says why; nothing is written |
| A gutter that is not a number from 0 to 5 (empty is allowed) | The form stays open and says why; nothing is written |
| A number of cards outside 1 to 24 | The form stays open and says why; nothing is written |
| Headers, Footers or Links with more entries than cards | The form stays open and says why; nothing is written |
| Escape or Cancel | The form closes and the text is unchanged |

The vertical bar character inside a value is read as the separator between cards.

### Verification notes

- Method: test/page/modules/cardGridDirectives.test.ts (generated MyST of the grid, including the per-card header, footer and link, and the validation of each field)
- Method: test/page/runtimePaletteActions.test.ts (the form opens from the toolbar button and from the slash menu, Insert writes the grid with the per-card options, an invalid value keeps the form open)
- Criteria: The text written is the {grid} directive the renderer draws as a grid of cards; the Grid button shows in the MyST and Full palette modes only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
