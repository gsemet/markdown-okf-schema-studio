---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-033
uuid: 0e79ac91-5723-4411-b0b7-215e356f2dee
title: Unsupported raw HTML is dropped
description: When a document contains raw HTML outside the supported subset, the
  extension SHALL omit it from the rendering.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Unsupported raw HTML is dropped

### Normative behavior

When a document contains raw HTML outside the supported subset, the extension SHALL omit it from the rendering.

### Scenario: Unsupported tag dropped

- GIVEN a div block with text and an inline marquee element
- WHEN the preview is rendered
- THEN the elements are absent from the HTML

### Scenario: Supported subset kept

- GIVEN a kbd element beside an unsupported tag
- WHEN the preview is rendered
- THEN kbd is kept and the unsupported tag is absent

### Verification notes

- Method: Unit test (currently none).
- Criteria: Unsupported tags are absent.
