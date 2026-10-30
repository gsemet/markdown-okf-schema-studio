---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-018
uuid: ee591230-ea84-4b37-a389-5e99bc31030e
title: "A null value is refused for a field that is not nullable"
description: "When the host receives a null value for a schema field that does not
  allow null, the extension SHALL refuse the save with the stale-field message."
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-016
default_owner_email: gaetan@xeberon.net
---

## A null value is refused for a field that is not nullable

### Normative behavior

When the host receives a null value for a schema field that does not allow null, the extension SHALL refuse the save with the stale-field message.

### Scenario: Nominal

- GIVEN a schema field that is not nullable
- WHEN a save with fieldValue null arrives
- THEN the answer is "The frontmatter field is stale or its value does not match the schema." and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a nullable schema field
- WHEN a save with fieldValue null arrives
- THEN the save is accepted

### Verification notes

- Method: Unit test on the save plan (test/core/edits/frontmatterEdit.test.ts).
- Criteria: Null passes the type check only when the field is nullable.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-016](SwRS-MDOKFSTUDIO-FMEDIT-016.md): The host refuses a value that breaks YAML, the field type or the schema
<!-- okf:links:end -->
