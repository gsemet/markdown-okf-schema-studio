---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-019
uuid: b30f4ede-4e66-442e-baa6-0b63486588c3
title: "Comment quotes are never wrapped inside diagrams"
description: "When a review thread anchor falls inside a Mermaid or PlantUML figure,
  the page SHALL NOT wrap text of that figure in a comment quote."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-REVIEW-017; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-REVIEW-017
---

## Comment quotes are never wrapped inside diagrams

### Normative behavior

When a review thread anchor falls inside a Mermaid or PlantUML figure, the page SHALL NOT wrap text of that figure in a comment quote.

### Scenario: Anchor in a diagram

- GIVEN a review thread whose quote text also appears inside a Mermaid figure and a PlantUML figure
- WHEN the page applies the threads
- THEN no comment mark is added inside either figure

### Scenario: Text elsewhere

- GIVEN the same quote text in an ordinary paragraph covering the anchor line
- WHEN the page applies the threads
- THEN the paragraph, not the figure, receives the mark

### Verification notes

- Method: Unit test of the comment threads.
- Criteria: Figure text is unchanged and no mark or badge is placed inside a figure.
