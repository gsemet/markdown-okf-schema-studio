---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-020
uuid: 6f1e930f-09da-4730-be53-f39e35b440e9
title: "Selecting text inside a diagram offers no comment"
description: "When the selection of a writer lies inside a Mermaid or PlantUML figure,
  the page SHALL NOT offer to create a review comment for it."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-REVIEW-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-REVIEW-038
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

### Verification notes

- Method: Unit test `a selection inside a Mermaid or PlantUML figure offers no comment; one in a paragraph does` in `test/page/modules/diagReq.diagrams.requirements.test.ts`.
- Criteria: The compose skip list contains both figure classes.
