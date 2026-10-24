---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-036
uuid: 0c362121-b544-49c5-9303-50ffe2585925
title: Removed span styles record a diagnostic
description: When a colour span style contains a removed declaration, the
  extension SHALL record the sanitizer diagnostic 'Removed unsafe style
  attribute.'.
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

## Removed span styles record a diagnostic

### Normative behavior

When a colour span style contains a removed declaration, the extension SHALL record the sanitizer diagnostic 'Removed unsafe style attribute.'.

### Scenario: Diagnostic recorded

- GIVEN a span style 'color:#f00; position:fixed'
- WHEN the HTML is sanitized
- THEN the diagnostic is recorded

### Scenario: Fully safe style

- GIVEN a span style 'color:#f00'
- WHEN the HTML is sanitized
- THEN no diagnostic is recorded

### Verification notes

- Method: Unit test (currently none).
- Criteria: Diagnostic present only when something is removed.
