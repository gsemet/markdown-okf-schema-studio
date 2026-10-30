---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-019
uuid: b30f4ede-4e66-442e-baa6-0b63486588c3
title: "Comment quotes are never wrapped inside diagrams"
description: "When a review thread anchor falls inside a Mermaid or PlantUML figure,
  the page SHALL NOT wrap text of that figure in a comment quote."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
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
superseded_by:
- SwRS-MDOKFSTUDIO-REVIEW-017
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Superseded by:
  - [SwRS-MDOKFSTUDIO-REVIEW-017](../review-annotations/SwRS-MDOKFSTUDIO-REVIEW-017.md): The quote of a thread is highlighted once in its block
<!-- okf:links:end -->
