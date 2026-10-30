---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-008
uuid: 3e44eba7-57a7-4f91-80cf-71b15ca4e128
title: Long lists are cut after fifty items
description: When a frontmatter value is a list in read mode, the extension
  SHALL show one dash-marked item per line, at most 50 items, followed by "+ N
  more" for the omitted ones.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-006
default_owner_email: gaetan@xeberon.net
---

## Long lists are cut after fifty items

### Normative behavior

When a frontmatter value is a list in read mode, the extension SHALL show one dash-marked item per line, at most 50 items, followed by "+ N more" for the omitted ones.

### Scenario: List over the limit

- GIVEN a list field with 52 items
- WHEN the properties table is rendered
- THEN 50 items are listed and the text "+ 2 more" follows them

### Scenario: List at the limit

- GIVEN a list field with exactly 50 items
- WHEN the properties table is rendered
- THEN all 50 items are listed and no "more" text appears

### Verification notes

- Method: Unit test of the table renderer.
- Criteria: MAX_LIST_ITEMS is 50; the omitted count is the list length minus 50.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-001](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-001.md): Frontmatter appears as a readable, configurable properties table
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-006](SwRS-MDOKFSTUDIO-FMSCHEMA-006.md): Property values read like YAML in a lean table
<!-- okf:links:end -->
