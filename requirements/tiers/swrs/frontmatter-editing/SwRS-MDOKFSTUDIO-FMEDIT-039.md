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
lifecycle: superseded
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
superseded_by: SwRS-MDOKFSTUDIO-FMEDIT-043
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
