---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-090
uuid: 3014747f-ab9a-4a70-b696-252241b95abb
title: The rename field closes itself after 5 seconds
description: When a rename succeeds, the extension SHALL close the rename field
  5 s after the success message.
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

- Method: test
- Criteria: Auto-close timing is untested today.
