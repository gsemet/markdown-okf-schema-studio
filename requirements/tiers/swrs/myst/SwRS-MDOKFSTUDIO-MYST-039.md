---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-039
uuid: 6c7eb056-654c-4623-af57-4f4e93c4cf3e
title: Enter sends the label rename and an unchanged name sends nothing
description: When the Label name field is submitted with Enter, the extension
  SHALL send one rename with the label line, and close without sending when the
  name is unchanged.
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
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-038
default_owner_email: gaetan@xeberon.net
---

## Enter sends the label rename and an unchanged name sends nothing

### Normative behavior

When the Label name field is submitted with Enter, the extension SHALL send one rename with the label line, and close without sending when the name is unchanged.

### Scenario: Nominal

- GIVEN a changed valid name in the field
- WHEN Enter is pressed
- THEN one rename with the label line is posted

### Scenario: Boundary or refusal

- GIVEN the name left unchanged
- WHEN Enter is pressed
- THEN the field closes and nothing is posted

### Verification notes

- Method: Unit test "Enter posts one rename with the label line; Escape cancels" in test/page/modules/labelRename.test.ts
- Criteria: Verified in the page unit suite.
