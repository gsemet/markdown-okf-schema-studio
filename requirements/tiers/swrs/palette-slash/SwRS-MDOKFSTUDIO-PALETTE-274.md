---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-274
uuid: 2d07b571-18c3-4737-8c75-7883e9ff8832
title: The Full palette mode adds a PlantUML diagram command
description: When the palette mode is Full, the extension SHALL list a PlantUML
  diagram action in the edition palette and the slash menu (/plantuml, /uml)
  that inserts a fenced plantuml sequence diagram after the selection, set apart
  from the text around it, with the first message selected, and no other mode
  SHALL list it.
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

## The Full palette mode adds a PlantUML diagram command

### Normative behavior

When the palette mode is Full, the extension SHALL list a PlantUML diagram action in the edition palette and the slash menu (/plantuml, /uml) that inserts a fenced plantuml sequence diagram after the selection, set apart from the text around it, with the first message selected, and no other mode SHALL list it.

### Scenario (nominal): The command inserts a PlantUML diagram

- GIVEN a paragraph and the caret at its end, in the Full palette mode
- WHEN the writer picks PlantUML diagram in the palette or types /plantuml or /uml in the slash menu
- THEN a blank line and a fenced `plantuml` block with a two-actor sequence diagram (`@startuml` to `@enduml`) are inserted after the selection, set apart from the text around it, with the word Hello selected, and the block renders as a diagram

### Scenario (refusal): Other modes do not list it

- GIVEN the palette in the Strict, GFM or MyST mode
- WHEN the palette is shown or the slash menu is typed with /plantuml
- THEN no PlantUML command is offered; the PlantUML diagrams of the document are rendered all the same

### Verification notes

- Method: test/page/modules/slashSyntaxCoverage.test.ts (the inserted text and selection; the mode filter of the slash entry)
- Method: test/core/palette/paletteActions.test.ts, test/page/modules/editActions.test.ts and test/page/modules/editPalette.test.ts (the registry order, the Full mode buttons)
- Criteria: The PlantUML diagram action is listed in the Full mode only and inserts a diagram that renders.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-001](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-001.md): A writer formats and inserts Markdown, GFM and MyST constructs from the palette
<!-- okf:links:end -->
