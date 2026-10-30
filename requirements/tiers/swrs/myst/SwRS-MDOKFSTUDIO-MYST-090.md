---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-090
uuid: 3014747f-ab9a-4a70-b696-252241b95abb
title: The rename field closes itself after 5 seconds
description: When a rename succeeds, the extension SHALL close the rename field
  5 s after the success message.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-038](SwRS-MDOKFSTUDIO-MYST-038.md): The anchor icon opens a rename field that sends valid names
<!-- okf:links:end -->
