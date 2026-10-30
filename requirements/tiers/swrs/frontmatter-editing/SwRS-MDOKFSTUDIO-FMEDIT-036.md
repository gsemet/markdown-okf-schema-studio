---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-036
uuid: 72d0328e-e74a-4951-891a-25a69b7da820
title: An invalid custom key name is refused in the picker
description: When a writer enters an empty, space-padded, multi-line or existing
  custom key name, the extension SHALL show the matching message in the editor
  and post nothing.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-028
default_owner_email: gaetan@xeberon.net
---

## An invalid custom key name is refused in the picker

### Normative behavior

When a writer enters an empty, space-padded, multi-line or existing custom key name, the extension SHALL show the matching message in the editor and post nothing.

### Scenario: Nominal

- GIVEN the Custom key input empty or holding only spaces
- WHEN the writer presses Enter
- THEN the status shows "Enter a name for the new field." and nothing is posted

### Scenario: Boundary or refusal

- GIVEN names with surrounding spaces, with a line break, or already shown in the table
- WHEN the writer presses Enter
- THEN the messages are "The field name cannot start or end with spaces.", "The field name cannot contain a line break." and 'The field "x" already exists.' and nothing is posted

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T25 an invalid custom key shows an error and posts nothing.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-028](SwRS-MDOKFSTUDIO-FMEDIT-028.md): The field action menu offers the missing schema fields or a custom key
<!-- okf:links:end -->
