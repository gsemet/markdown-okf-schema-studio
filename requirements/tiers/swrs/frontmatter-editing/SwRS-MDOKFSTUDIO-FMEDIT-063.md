---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-063
uuid: 8af6e481-14f4-48cf-8367-ca182fa7b27a
title: The properties table is never part of a block selection or move
description: When a writer selects or moves blocks, the extension SHALL exclude
  the properties table from the selection and from the move.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-148; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-148
default_owner_email: gaetan@xeberon.net
---

## The properties table is never part of a block selection or move

### Normative behavior

When a writer selects or moves blocks, the extension SHALL exclude the properties table from the selection and from the move.

### Scenario: Nominal

- GIVEN edit mode on
- WHEN the writer Shift+clicks the properties table
- THEN it gets no selected mark and the selection stays unchanged

### Scenario: Boundary or refusal

- GIVEN a Shift+Up extension from the first body block
- WHEN it is pressed
- THEN the selection stops at the first body block

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeBlockSelection.test.ts).
- Criteria: Test T39 the properties table is never selected.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-BLOCK-148](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-148.md): A block selection survives saves and is cleared by patches
<!-- okf:links:end -->
