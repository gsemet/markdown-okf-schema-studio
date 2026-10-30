---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-064
uuid: 7aeceee1-2b86-4ea3-b09d-99018113aff0
title: The insert point after the table has no move buttons
description: When the insert point after the properties table, or the Start
  writing point of a frontmatter-only document, is shown, the extension SHALL
  show no move buttons on it.
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-109; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-109
default_owner_email: gaetan@xeberon.net
---

## The insert point after the table has no move buttons

### Normative behavior

When the insert point after the properties table, or the Start writing point of a frontmatter-only document, is shown, the extension SHALL show no move buttons on it.

### Scenario: Nominal

- GIVEN a document with a properties table in edit mode
- WHEN the insert point after the table renders
- THEN it has a single control and no move buttons

### Scenario: Boundary or refusal

- GIVEN a document with an empty body
- WHEN the Start writing point renders
- THEN it has a single control and no move buttons

### Verification notes

- Method: Unit test on the page runtime (test/page/runtimeBlockMoves.test.ts).
- Criteria: Test T36 the properties point and the Start writing point have no move buttons.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-008](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-008.md): Metadata edits keep the source intact, follow the schema and never lose text
- Superseded by:
  - [SwRS-MDOKFSTUDIO-BLOCK-109](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-109.md): The up and down arrows of an insert point move its block
<!-- okf:links:end -->
