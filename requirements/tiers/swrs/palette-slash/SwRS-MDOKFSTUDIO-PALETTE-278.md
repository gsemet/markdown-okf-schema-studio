---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-278
uuid: 11d93c17-d768-484a-aade-916c06f5365e
title: Starter blocks insert a chart, a diagram or content tabs
description: When the writer picks Vega-Lite chart, Vega chart, PlantUML diagram
  or Content tabs in the palette or the slash menu, the extension SHALL insert a
  fenced starter block that renders, after the selection and set apart from the
  text around it, with its first placeholder word selected.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-021
annotation_exemption: false
exemption_reason:
derived_by: []
supersedes:
- SwRS-MDOKFSTUDIO-PALETTE-265
- SwRS-MDOKFSTUDIO-PALETTE-273
- SwRS-MDOKFSTUDIO-PALETTE-274
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/core/render/mystPaletteRendering.test.ts
- test/page/modules/chartActions.test.ts
- test/page/modules/slashSyntaxCoverage.test.ts
default_owner_email: gaetan@xeberon.net
---

## Starter blocks insert a chart, a diagram or content tabs

### Normative behavior

When the writer picks Vega-Lite chart, Vega chart, Content tabs or PlantUML diagram in the edition palette or the slash menu (/chart, /vega, /tab-set, /tabs, /plantuml, /uml), the extension SHALL insert the starter block of that action after the selection, set apart from the text around it by a blank line, with the first editable words selected: a fenced vega-lite or vega block with a three-bar chart, a MyST tab-set of two tab-item tabs, or a fenced plantuml sequence diagram. Which modes list each action is specified in SwRS-MDOKFSTUDIO-PALETTE-001.

### Scenario (nominal): The chart commands insert a starter chart

- GIVEN a paragraph and the caret at its end, in the Full palette mode
- WHEN the writer picks Vega-Lite chart or Vega chart
- THEN a blank line and a fenced block (vega-lite or vega) with a three-bar chart with inline data are inserted after the selection, set apart from the text around it, with the words Chart title selected, and the block renders as a chart

- GIVEN the edition palette in the Full mode on a block selection
- WHEN the palette is shown and the writer types /chart or /vega in the slash menu
- THEN the buttons of the MyST mode are followed by Vega-Lite chart and Vega chart (group full, one-click buttons with their label as tooltip) and the slash menu lists both commands under Full, /vega finding Vega first and /chart listing both (the alias chart is shared with Mermaid)

### Scenario (nominal): Content tabs inserts a tab set

- GIVEN a paragraph and the caret at its end, in the MyST or Full palette mode
- WHEN the writer picks Content tabs in the palette or types /tab-set in the slash menu
- THEN a blank line and a `::::{tab-set}` container holding two `:::{tab-item}` tabs (Tab 1 and Tab 2, each with the body Content) are inserted after the selection, set apart from the text around it, with the words Tab 1 selected, and the block renders as a tab set

### Scenario (nominal): PlantUML diagram inserts a sequence diagram

- GIVEN a paragraph and the caret at its end, in the Full palette mode
- WHEN the writer picks PlantUML diagram in the palette or types /plantuml or /uml in the slash menu
- THEN a blank line and a fenced `plantuml` block with a two-actor sequence diagram (`@startuml` to `@enduml`) are inserted after the selection, set apart from the text around it, with the word Hello selected, and the block renders as a diagram

### Scenario (refusal): A mode that does not list the action offers no command

- GIVEN the palette in a mode below the one that lists the action (Strict, GFM or MyST for the chart and PlantUML commands; Strict or GFM for Content tabs)
- WHEN the palette is shown or the slash menu is typed with /vega, /tab-set or /plantuml
- THEN no such command is offered; the charts, tab sets and diagrams of the document are rendered all the same (see SwRS-MDOKFSTUDIO-DIAG-121)

### Verification notes

- Method: test/core/palette/paletteActions.test.ts (the actions list the Full or MyST mode only, group full, chart aliases); test/page/modules/editActions.test.ts (the registry order and modes)
- Method: test/page/modules/chartActions.test.ts (the inserted starter charts, set apart, title selected)
- Method: test/page/modules/slashSyntaxCoverage.test.ts (the inserted tab set and PlantUML text and selection; the mode filter of the slash entry); test/page/modules/slashMenu.test.ts (/vega and /vega-lite find the commands in Full, none in MyST)
- Method: test/page/modules/editPalette.test.ts (Full adds the two chart buttons after MyST, no other mode lists them)
- Criteria: Each action inserts a starter block that renders, set apart from the text, with its first words selected, and is listed only in the modes of its row of SwRS-MDOKFSTUDIO-PALETTE-001.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-021](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-021.md): A writer inserts MyST constructs
- Supersedes:
  - [SwRS-MDOKFSTUDIO-PALETTE-265](SwRS-MDOKFSTUDIO-PALETTE-265.md): The Full palette mode adds Vega-Lite and Vega chart commands
  - [SwRS-MDOKFSTUDIO-PALETTE-273](SwRS-MDOKFSTUDIO-PALETTE-273.md): The MyST palette mode adds a Content tabs command
  - [SwRS-MDOKFSTUDIO-PALETTE-274](SwRS-MDOKFSTUDIO-PALETTE-274.md): The Full palette mode adds a PlantUML diagram command
<!-- okf:links:end -->
