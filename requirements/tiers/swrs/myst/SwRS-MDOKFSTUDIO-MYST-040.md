---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-040
uuid: 08a74c5e-9f56-4c38-8e93-074279d96968
title: Escape or an outside press closes the rename field
description: When the rename field is open, the extension SHALL close it on
  Escape or on a pointer press outside the popover and the icon.
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-038](SwRS-MDOKFSTUDIO-MYST-038.md): The anchor icon opens a rename field that sends valid names
<!-- okf:links:end -->
