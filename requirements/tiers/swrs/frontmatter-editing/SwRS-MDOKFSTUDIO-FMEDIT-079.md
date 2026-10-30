---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-079
uuid: a4aad829-1aaa-4a83-873d-1fc31120778e
title: A null value is refused when a conditional rule forbids it
description: 'When a schema conditional rule forbids null for the edited field, the
  extension SHALL refuse a null save with "Schema validation failed: {message}".'
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

## A null value is refused when a conditional rule forbids it

### Normative behavior

When a schema conditional rule forbids null for the edited field, the extension SHALL refuse a null save with "Schema validation failed: {message}".

### Scenario: Nominal

- GIVEN a nullable field that a conditional (if/then) rule requires to be set
- WHEN a save with fieldValue null arrives
- THEN the answer is "Schema validation failed: " followed by the schema message and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN the condition of the rule is not met
- WHEN the same save arrives
- THEN the save is accepted

### Verification notes

- Method: Integration test (test/integration/previewEditing.test.ts, conditional null refused).
- Criteria: The candidate document is analysed again with its conditional rules.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-016](SwRS-MDOKFSTUDIO-FMEDIT-016.md): The host refuses a value that breaks YAML, the field type or the schema
<!-- okf:links:end -->
