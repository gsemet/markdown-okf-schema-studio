---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-265
uuid: acc86b3c-3ce2-4abe-bb5b-7c3aa41a9d01
title: The Full palette mode adds Vega-Lite and Vega chart commands
description: When the palette mode is Full, the extension SHALL list the
  Vega-Lite chart and Vega chart actions in the edition palette and the slash
  menu (/chart and /vega), each inserting a fenced starter chart after the
  selection, and no other mode SHALL list them.
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
- test/core/palette/paletteActions.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/page/modules/chartActions.test.ts
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/slashMenu.test.ts
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## The Full palette mode adds Vega-Lite and Vega chart commands

### Normative behavior

When the palette mode is Full, the extension SHALL list the Vega-Lite chart and Vega chart actions in the edition palette and the slash menu (/chart and /vega), each inserting a fenced starter chart after the selection, and no other mode SHALL list them.

### Scenario (nominal): The Full mode lists the chart commands

- GIVEN the edition palette in the Full mode on a block selection
- WHEN the palette is shown and the writer types /chart or /vega in the slash menu
- THEN the buttons of the MyST mode are followed by Vega-Lite chart and Vega chart (group full, one-click buttons with their label as tooltip) and the slash menu lists both commands under Full, /vega finding Vega first and /chart listing both (the alias chart is shared with Mermaid)

### Scenario (nominal): The commands insert a starter chart

- GIVEN a paragraph and the caret at its end
- WHEN the writer picks Vega-Lite chart or Vega chart
- THEN a blank line and a fenced block (vega-lite or vega) with a three-bar chart with inline data are inserted after the selection, set apart from the text around it, with the words Chart title selected, and the block renders as a chart

### Scenario (refusal): Other modes do not list them

- GIVEN the palette in the Strict, GFM or MyST mode
- WHEN the palette is shown or the slash menu is typed with /vega
- THEN no chart command is offered; the charts of the document are drawn all the same (see SwRS-MDOKFSTUDIO-DIAG-121)

| Input | Outcome |
| --- | --- |
| the select of the palette | offers Strict Markdown, GitHub (GFM), MyST and Full |
| the setting defaultPaletteMode or a stored choice full | the page starts in the Full mode |
| a message previewPaletteModeChanged with mode full | accepted and stored for the workspace |

### Verification notes

- Method: test/core/palette/paletteActions.test.ts (the two actions list the Full mode only, group full, chart aliases)
- Method: test/page/modules/chartActions.test.ts (the inserted starter charts, set apart, title selected); test/page/modules/editActions.test.ts (the registry order and modes)
- Method: test/page/modules/editPalette.test.ts (the select offers four modes, Full adds the two buttons after MyST, no other mode lists them); test/page/runtimeEditPalette.test.ts (the Full mode is stored, saved and reported to the host); test/core/protocol/pageToHost.test.ts and test/core/configuration/editingConfiguration.test.ts (full is a valid mode)
- Method: test/page/modules/slashMenu.test.ts (/vega and /vega-lite find the commands in Full, none in MyST)
- Criteria: The Full mode adds exactly the two chart commands to the MyST buttons, each inserting a rendering starter chart, and no other mode lists them.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
