---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-012
uuid: a3539cab-429c-428a-bb5c-eb2a2802caf7
title: Style fenced code blocks with one font scale and the code background
description: When a fenced code block is shown, the extension SHALL use the
  editor foreground colour, a font size of 0.92em, a 4 px radius, a border and
  the code-block background, with no box of its own on the inner code.
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

## Style fenced code blocks with one font scale and the code background

### Normative behavior

When a fenced code block is shown, the extension SHALL use the editor foreground colour, a font size of 0.92em, a 4 px radius, a border and the code-block background, with no box of its own on the inner code.

### Scenario: nominal behavior

- GIVEN any fenced block in the preview
- WHEN the page renders
- THEN the block has the code-block background, border and radius and the inner code has no own box

### Scenario: boundary or refusal behavior

- GIVEN a block nested in a list or admonition
- WHEN the page renders
- THEN it uses the same style as a top-level block

### Verification notes

- Method: Stylesheet unit test and computed-style visual check.
- Criteria: Computed values equal the stated style on top-level and nested blocks.
