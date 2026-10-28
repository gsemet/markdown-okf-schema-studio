---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-047
uuid: 6cec5899-06ed-47f1-9c66-a4d708e01294
title: A value that does not fit the field type is refused
description: "When a schema is found and the saved value is not of the field's type
  or not one of its enum values, the extension SHALL refuse the save with \"The frontmatter
  field is stale or its value does not match the schema.\""
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-016; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-016
default_owner_email: gaetan@xeberon.net
---

## A value that does not fit the field type is refused

### Normative behavior

When a schema is found and the saved value is not of the field's type or not one of its enum values, the extension SHALL refuse the save with "The frontmatter field is stale or its value does not match the schema."

### Scenario: Nominal

- GIVEN a schema enum field with the values draft and active
- WHEN a save with the value paused arrives
- THEN it is refused with the stale-field message and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a document without a schema
- WHEN a value of any type is saved
- THEN no type check applies and the value is written

### Known issues

- Known issue: the stale-field message is shared by a stale render and a type mismatch; the user cannot tell them apart.

### Verification notes

- Method: Unit test on the save plan (test/core/edits/frontmatterEdit.test.ts) and integration test (test/integration/previewEditing.test.ts).
- Criteria: Texts, dates and times must be strings, booleans booleans, numbers finite, lists arrays.
