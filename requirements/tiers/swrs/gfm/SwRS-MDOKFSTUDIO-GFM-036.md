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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-034; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-GFM-034
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "span style keeps only hex and rgb colour and background-color as data attributes" in test/security/html-policy.test.ts.
- Criteria: Diagnostic present only when something is removed.
