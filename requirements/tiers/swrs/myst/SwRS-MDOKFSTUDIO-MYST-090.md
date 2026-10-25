---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-090
uuid: 3014747f-ab9a-4a70-b696-252241b95abb
title: The rename field closes itself after 5 seconds
description: When a rename succeeds, the extension SHALL close the rename field
  5 s after the success message.
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

## The rename field closes itself after 5 seconds

### Normative behavior

When a rename succeeds, the extension SHALL close the rename field 5 s after the success message.

### Scenario: Nominal

- GIVEN a successful rename
- WHEN 5 s pass
- THEN the field closes

### Scenario: Boundary or refusal

- GIVEN a successful rename followed by a new rename or Escape within 5 s
- WHEN the new action happens
- THEN the field follows the new action and no stale close occurs

### Verification notes

- Method: Unit test "a successful rename closes the field 5 s later and a new action cancels the stale close" in test/page/modules/renderReq.labelRename.requirements.test.ts
- Criteria: The 5 s close timer is armed by the success and cleared by a new action.
