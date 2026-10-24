---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-033
uuid: 54730c6d-2f8e-446f-960a-dc5467a4800e
title: Figure width values are validated
description: When a `{figure}` or `{image}` has `:width:`, the extension SHALL
  keep a number or a number with px, %, em or rem as data-okf-width and drop any
  other value.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Figure width values are validated

### Normative behavior

When a `{figure}` or `{image}` has `:width:`, the extension SHALL keep a number or a number with px, %, em or rem as data-okf-width and drop any other value.

### Scenario: Nominal

- GIVEN `:width: 60%`
- WHEN the preview renders
- THEN data-okf-width is 60% and the width attribute is removed

### Scenario: Boundary or refusal

- GIVEN `:width: 60%;position:fixed` or `auto`, or a hand-edited bad value
- WHEN the preview renders
- THEN the value is dropped and the sanitizer reports Removed an unsupported figure width

### Verification notes

- Method: test
- Criteria: A plain number means pixels.
