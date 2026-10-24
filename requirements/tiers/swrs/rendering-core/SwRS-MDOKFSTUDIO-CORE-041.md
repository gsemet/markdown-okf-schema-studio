---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-041
uuid: 93d63231-240e-4a20-a067-c018f304c354
title: Align right-to-left text to the right
description: When a paragraph holds Hebrew or Arabic text, the extension SHALL
  align it to the right edge of the column, setting `dir="auto"`.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Align right-to-left text to the right

### Normative behavior

When a paragraph holds Hebrew or Arabic text, the extension SHALL align it to the right edge of the column, setting `dir="auto"`.

### Scenario: Nominal align right-to-left text to the right

- GIVEN a Hebrew paragraph
- WHEN it is shown
- THEN its text ends at the right edge of the column

### Scenario: Boundary or refusal of align right-to-left text to the right

- GIVEN an English paragraph
- WHEN it is shown
- THEN its text starts at the left edge

### Verification notes

- Method: test
- Criteria: Right-to-left paragraphs are right-aligned.
