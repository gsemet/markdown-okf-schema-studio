---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-020
uuid: 6f1e930f-09da-4730-be53-f39e35b440e9
title: "Selecting text inside a diagram offers no comment"
description: "When the selection of a writer lies inside a Mermaid or PlantUML figure,
  the page SHALL NOT offer to create a review comment for it."
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
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-REVIEW-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-REVIEW-038
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
  - [StRS-MDOKFSTUDIO-DIAG-006](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-006.md): A writer reads PlantUML diagrams without any setup
- Superseded by:
  - [SwRS-MDOKFSTUDIO-REVIEW-038](../review-annotations/SwRS-MDOKFSTUDIO-REVIEW-038.md): Selected body text offers a Comment button and a keyboard shortcut
<!-- okf:links:end -->
