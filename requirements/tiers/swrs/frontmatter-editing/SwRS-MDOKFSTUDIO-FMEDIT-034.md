---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-034
uuid: 1092b671-d493-4d1d-af05-9a08b3847268
title: Without schema fields to add, a typed field name is added
description: "When a writer chooses Add field and the schema has no field left to
  add, the extension SHALL show a text input \"New field name\" and an Add button
  that adds a key with an empty value."
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

## Without schema fields to add, a typed field name is added

### Normative behavior

When a writer chooses Add field and the schema has no field left to add, the extension SHALL show a text input "New field name" and an Add button that adds a key with an empty value.

### Scenario: Nominal

- GIVEN a document without a schema
- WHEN the writer opens Add field, types owner and presses Enter or the Add button
- THEN an add save for owner with an empty value is posted, after the open field (afterField)

### Scenario: Boundary or refusal

- GIVEN no name typed
- WHEN the picker is shown
- THEN the button "Add selected frontmatter field" is disabled until a name is typed

### Known issues

- Known issue: a typed name that already exists is refused by the host with the stale-field message, not with an already-exists message.

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeFrontmatterFields.test.ts).
- Criteria: Tests T24 the text-input picker adds on Enter with afterField.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-028](SwRS-MDOKFSTUDIO-FMEDIT-028.md): The field action menu offers the missing schema fields or a custom key
<!-- okf:links:end -->
