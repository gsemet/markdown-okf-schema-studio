---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-040
uuid: 08a74c5e-9f56-4c38-8e93-074279d96968
title: Escape or an outside press closes the rename field
description: When the rename field is open, the extension SHALL close it on
  Escape or on a pointer press outside the popover and the icon.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-038; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-038
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

- Method: Unit test "Enter posts one rename with the label line; Escape cancels" in test/page/modules/labelRename.test.ts
- Criteria: No message is posted either way.
