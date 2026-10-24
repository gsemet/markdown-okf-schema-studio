---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-040
uuid: 08a74c5e-9f56-4c38-8e93-074279d96968
title: Escape or an outside press closes the rename field
description: When the rename field is open, the extension SHALL close it on
  Escape or on a pointer press outside the popover and the icon.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Escape or an outside press closes the rename field

### Normative behavior

When the rename field is open, the extension SHALL close it on Escape or on a pointer press outside the popover and the icon.

### Scenario: Nominal

- GIVEN the field open
- WHEN Escape is pressed
- THEN the field closes and nothing is sent

### Scenario: Boundary or refusal

- GIVEN the field open
- WHEN the pointer is pressed outside the popover and the icon
- THEN the field closes

### Verification notes

- Method: test
- Criteria: No message is posted either way.
