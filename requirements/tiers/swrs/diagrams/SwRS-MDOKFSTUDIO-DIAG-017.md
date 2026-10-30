---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-017
uuid: 309dea1a-1462-48cf-a653-8f69219c50c4
title: "The Mermaid action inserts a starter flowchart in GFM mode"
description: "When a writer picks the Mermaid action of the edition palette or the
  Mermaid slash entry, which the extension offers in GFM mode only, the extension
  SHALL insert a fenced mermaid block with a top-down flowchart from a node labelled
  Start to a node labelled End, set apart from the text around it and placed after
  the selection, with the label Start selected."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
depends_on:
- SwRS-MDOKFSTUDIO-BLOCK-041
- SwRS-MDOKFSTUDIO-BLOCK-058
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/core/palette/paletteActions.test.ts
- test/core/render/mystPaletteRendering.test.ts
- test/page/modules/editActions.test.ts
- test/page/modules/editPalette.test.ts
- test/page/modules/slashMenu.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-DIAG-018
---

## The Mermaid action inserts a starter flowchart in GFM mode

### Normative behavior

When a writer picks the Mermaid action of the edition palette or the Mermaid slash entry, which the extension offers in GFM mode only, the extension SHALL insert a fenced mermaid block with a top-down flowchart from a node labelled Start to a node labelled End, set apart from the text around it and placed after the selection, with the label Start selected.

### Scenario (nominal): Insert after text

- GIVEN the caret at the end of a paragraph
- WHEN the writer picks Mermaid
- THEN a blank line and the fenced mermaid flowchart are inserted after the selection and the word Start is selected

### Scenario (boundary): Empty document

- GIVEN an empty document
- WHEN the writer picks Mermaid
- THEN the fence is inserted with no leading blank line and the word Start is selected

### Scenario (nominal): GFM mode offers Mermaid

- GIVEN the edition palette in GFM mode on a block selection
- WHEN the palette is shown and the writer types /diagram in the slash menu
- THEN a one-click Mermaid button with the tooltip "Mermaid diagram" is in the GitHub group and the slash menu finds Mermaid first; the slash aliases are diagram, chart, graph and flowchart

### Scenario (refusal): Other palette modes do not offer Mermaid

- GIVEN the palette in Strict or MyST mode
- WHEN the palette is shown
- THEN no Mermaid action is offered and no button inserts a {mermaid} directive

### Known issues

- Known issue: The palette and slash registry rows belong to palette-slash; this requirement owns the inserted content.
- Known issue: No button exists for the {mermaid} directive in the MyST palette mode.

### Verification notes

- Method: test/core/render/mystPaletteRendering.test.ts (insert after text, empty document: the inserted text renders as a Mermaid diagram figure)
- Method: test/page/modules/editActions.test.ts (insert after text, empty document: the edit action)
- Method: test/core/palette/paletteActions.test.ts (GFM mode offers Mermaid, other modes: the registry entry lists mode gfm only)
- Method: test/page/modules/editPalette.test.ts (GFM mode offers Mermaid, other modes do not: the palette)
- Method: test/page/modules/slashMenu.test.ts (the aliases diagram, chart, graph and flowchart resolve to Mermaid)
- Criteria: The inserted text renders as a Mermaid diagram figure; the registry entry lists mode gfm only and the aliases resolve to it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
- Depends on:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
  - [SwRS-MDOKFSTUDIO-BLOCK-058](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-058.md): Every host source edit is one undo step, renders once and reports a failed apply
- Supersedes:
  - [SwRS-MDOKFSTUDIO-DIAG-018](SwRS-MDOKFSTUDIO-DIAG-018.md): Mermaid is offered in the GFM palette mode only
<!-- okf:links:end -->
