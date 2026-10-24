---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-018
uuid: 9168279f-e1a8-4d0b-80fe-b687bc184c4e
title: Mermaid is offered in the GFM palette mode only
description: When the edition palette or the slash menu is in GFM mode, the
  extension SHALL offer a Mermaid action in the GitHub group with the tooltip
  "Mermaid diagram" and the slash aliases diagram, chart, graph and flowchart,
  and SHALL NOT offer it in the other palette modes.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Mermaid is offered in the GFM palette mode only

### Normative behavior

When the edition palette or the slash menu is in GFM mode, the extension SHALL offer a Mermaid action in the GitHub group with the tooltip "Mermaid diagram" and the slash aliases diagram, chart, graph and flowchart, and SHALL NOT offer it in the other palette modes.

### Scenario: GFM mode

- GIVEN the edition palette in GFM mode on a block selection
- WHEN the palette is shown and the writer types /diagram in the slash menu
- THEN a one-click Mermaid button with the tooltip "Mermaid diagram" is in the GitHub group and the slash menu finds Mermaid first

### Scenario: Other modes

- GIVEN the palette in Strict or MyST mode
- WHEN the palette is shown
- THEN no Mermaid action is offered and no button inserts a {mermaid} directive

### Known issues

- Known issue: No button exists for the {mermaid} directive in the MyST palette mode.

### Verification notes

- Method: Unit tests of the palette registry, the palette and the slash menu aliases.
- Criteria: The registry entry lists mode gfm only and the aliases resolve to it.
