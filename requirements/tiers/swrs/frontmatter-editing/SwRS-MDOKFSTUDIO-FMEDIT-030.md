---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-030
uuid: 42715b63-0538-4d70-9792-28ece92c8787
title: Remove field deletes exactly the lines of the field
description: When a writer removes a field, the extension SHALL delete exactly
  the lines of that field and keep the comment lines above it.
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
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-029
default_owner_email: gaetan@xeberon.net
---

## Remove field deletes exactly the lines of the field

### Normative behavior

When a writer removes a field, the extension SHALL delete exactly the lines of that field and keep the comment lines above it.

### Scenario: Nominal

- GIVEN frontmatter with a comment line above the field legacy followed by another field
- WHEN legacy is removed
- THEN only the legacy line is deleted and the comment lines stay

### Scenario: Boundary or refusal

- GIVEN frontmatter with a single field
- WHEN that field is removed
- THEN the block becomes a valid empty mapping ({}) between the fences

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/okfFrontmatter.test.ts, frontmatterPreservation.test.ts).
- Criteria: Tests frontmatter field removal keeps the comment lines above the removed key; removing the only field leaves a valid empty mapping; remove of tags deletes exactly the sequence lines.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-029](SwRS-MDOKFSTUDIO-FMEDIT-029.md): Remove field deletes exactly the lines of a non-required field
<!-- okf:links:end -->
