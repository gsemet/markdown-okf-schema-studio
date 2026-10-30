---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-032
uuid: 2bf84477-0818-4c2a-9127-077574d976d3
title: The host refuses to remove a required field
description: When the host receives a remove that would leave a required field
  missing, the extension SHALL refuse it with 'Cannot remove required
  frontmatter field "{name}".'
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

## The host refuses to remove a required field

### Normative behavior

When the host receives a remove that would leave a required field missing, the extension SHALL refuse it with 'Cannot remove required frontmatter field "{name}".'

### Scenario: Nominal

- GIVEN a document with a schema in which count is required
- WHEN a remove of count arrives
- THEN the answer is 'Cannot remove required frontmatter field "count".' and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a required field that was already missing before the remove
- WHEN another, optional field is removed
- THEN the remove is accepted: only a newly missing required field blocks it

### Verification notes

- Method: Unit test on the candidate check (test/core/edits/frontmatterEdit.test.ts).
- Criteria: A remove that makes another field newly missing through a conditional required rule is refused the same way.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-005](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-005.md): A writer adds, renames and removes metadata fields
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-029](SwRS-MDOKFSTUDIO-FMEDIT-029.md): Remove field deletes exactly the lines of a non-required field
<!-- okf:links:end -->
