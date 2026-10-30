---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-014
uuid: 26f0ddd6-772c-439d-9147-37a3d2a8e3c9
title: "A late Mermaid result for a replaced theme is not shown"
description: "When Mermaid finishes a drawing after a newer pass planned the same
  node for another key, the page SHALL keep that drawing in the cache and show only
  the drawing of the node's current key."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-009; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-009
default_owner_email: gaetan@xeberon.net
---

## A late Mermaid result for a replaced theme is not shown

### Normative behavior

When Mermaid finishes a drawing after a newer pass planned the same node for another key, the page SHALL keep that drawing in the cache and show only the drawing of the node's current key.

### Scenario: Late picture

- GIVEN a diagram being drawn for the dark theme while the theme changes to cream
- WHEN the dark drawing finishes after the cream pass was planned
- THEN the dark drawing is stored in the cache and the node shows only the cream drawing

### Scenario: Same key

- GIVEN a drawing that finishes while its key is still the node's key
- WHEN it finishes
- THEN it is shown

### Known issues

- Known issue: Untested; the guard lives in mermaidPreview.ts.

### Verification notes

- Method: No test: browser entry point.
- Criteria: Only the current key's result reaches the node.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-009](SwRS-MDOKFSTUDIO-DIAG-009.md): Mermaid diagrams are drawn once and late results are dropped
<!-- okf:links:end -->
