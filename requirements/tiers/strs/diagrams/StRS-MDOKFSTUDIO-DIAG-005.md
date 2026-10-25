---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-005
uuid: 31c349e7-40a2-48fe-a125-10b8c7a194d4
title: Insert a Mermaid diagram from the edit tools
description: When a writer picks Mermaid in the edition palette or the slash
  menu, the Studio SHALL insert a starter flowchart fence that renders at once.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: StRS
annotation_exemption: true
exemption_reason: "Superseded by StRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derives_from: []
user_need: As a writer, I add a diagram in one step and start editing a working
  example instead of an empty block.
derived_by: []
superseded_by: StRS-MDOKFSTUDIO-DIAG-001
---

## Insert a Mermaid diagram from the edit tools

### Normative behavior

When a writer picks Mermaid in the edition palette or the slash menu, the Studio SHALL insert a starter flowchart fence that renders at once.

### Preserved stakeholder intent

Writers expect the edit tools to give them a valid starting diagram rather than a blank fence they must remember the syntax for.

As a writer, I add a diagram in one step and start editing a working example instead of an empty block.

### Rationale and constraints

- The "Mermaid" button (GitHub group of the edition palette, tooltip "Mermaid diagram") and the "/Mermaid" slash entry (aliases diagram, chart, graph, flowchart) insert a fenced `mermaid` flowchart set apart after the selection, with its first label "Start" selected.
- Only the GFM palette mode offers it: not Strict, not MyST, and no `{mermaid}` directive button exists.
