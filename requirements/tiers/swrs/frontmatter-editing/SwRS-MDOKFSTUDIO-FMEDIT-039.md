---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-039
uuid: deff72ee-bb4f-453c-bbbe-e6e1dbbe9f75
title: An added field is a single inserted line in the file's line endings
description: When a writer adds a field, the extension SHALL write it as one
  inserted line, a list in the compact sequence style, using the line endings of
  the file.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-005
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-043; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-043
default_owner_email: gaetan@xeberon.net
---

## An added field is a single inserted line in the file's line endings

### Normative behavior

When a writer adds a field, the extension SHALL write it as one inserted line, a list in the compact sequence style, using the line endings of the file.

### Scenario: Nominal

- GIVEN a CRLF document with the fields title and status
- WHEN owner is added after title
- THEN the edit inserts exactly one line ended by CRLF

### Scenario: Boundary or refusal

- GIVEN an added list value
- WHEN the field is written
- THEN the list uses the compact sequence style

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/frontmatterPreservation.test.ts).
- Criteria: Tests structural CRLF add after a field; structural F1 add of a list uses the compact sequence style.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-043](SwRS-MDOKFSTUDIO-FMEDIT-043.md): A frontmatter edit changes only the lines of its field
<!-- okf:links:end -->
