---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-022
uuid: 6c3b3300-f2f1-4a3b-8a84-03fb3cdb87aa
title: Offer no copy button for edited blocks, editors, diagram sources and
  blocks outside the content
description: When a code block is being edited, lies inside a block editor,
  holds the source of a Mermaid or PlantUML diagram or lies outside the preview
  content, the extension SHALL NOT show a copy button for it.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Offer no copy button for edited blocks, editors, diagram sources and blocks outside the content

### Normative behavior

When a code block is being edited, lies inside a block editor, holds the source of a Mermaid or PlantUML diagram or lies outside the preview content, the extension SHALL NOT show a copy button for it.

### Scenario: nominal behavior

- GIVEN a block that is open for editing
- WHEN the pointer enters it
- THEN no copy button appears

### Scenario: boundary or refusal behavior

- GIVEN a code block in the toolbar or a panel outside the preview content, or a Mermaid source block
- WHEN the pointer enters it
- THEN no copy button appears

### Verification notes

- Method: Unit test of the block filter.
- Criteria: No button for the excluded block kinds or for blocks outside the content element.
