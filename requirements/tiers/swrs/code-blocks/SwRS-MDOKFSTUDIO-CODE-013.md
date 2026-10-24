---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-013
uuid: c2b55d26-68ee-4ede-9f74-e293a1184f08
title: Scroll long code lines inside their block
description: When a code line is wider than its block outside Auto width mode,
  the extension SHALL scroll the block horizontally to the line's far end and
  SHALL NOT widen the page, also at a 460 px panel width.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Scroll long code lines inside their block

### Normative behavior

When a code line is wider than its block outside Auto width mode, the extension SHALL scroll the block horizontally to the line's far end and SHALL NOT widen the page, also at a 460 px panel width.

### Scenario: nominal behavior

- GIVEN a Python block with a very long line in a 460 px panel
- WHEN the reader scrolls the block to the right
- THEN the line's far end becomes visible and the page has no horizontal overflow

### Scenario: boundary or refusal behavior

- GIVEN a block whose longest line is exactly as wide as the block
- WHEN the preview renders it
- THEN the block shows no horizontal scrollbar and the page has no overflow

### Verification notes

- Method: Visual scenario with geometry check.
- Criteria: Block scrollWidth exceeds clientWidth for the long line, equals it for the exact-fit line, and the document never overflows.
