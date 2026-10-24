---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-020
uuid: 6f1e930f-09da-4730-be53-f39e35b440e9
title: "Selecting text inside a diagram offers no comment"
description: "When the selection of a writer lies inside a Mermaid or PlantUML figure,
  the page SHALL NOT offer to create a review comment for it."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Selecting text inside a diagram offers no comment

### Normative behavior

When the selection of a writer lies inside a Mermaid or PlantUML figure, the page SHALL NOT offer to create a review comment for it.

### Scenario: Selection in a figure

- GIVEN text selected inside a Mermaid figure
- WHEN the selection settles
- THEN no comment button is shown

### Scenario: Selection in a paragraph

- GIVEN text selected inside an ordinary paragraph
- WHEN the selection settles
- THEN the comment button is offered

### Known issues

- Known issue: No test asserts this; the evidence is the shared skip selector.

### Verification notes

- Method: Inspection of the skip selector in commentCompose.ts; no test names it.
- Criteria: The compose skip list contains both figure classes.
