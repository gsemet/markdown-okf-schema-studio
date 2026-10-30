---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-037
uuid: e78a8763-d59b-4d14-888d-1315b2f37368
title: An error that names no field becomes a red row of its own
description: When a schema error concerns the whole frontmatter and names no
  field, the extension SHALL add a red row with the validator message under the
  field rows.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-084
default_owner_email: gaetan@xeberon.net
---

## An error that names no field becomes a red row of its own

### Normative behavior

When a schema error concerns the whole frontmatter and names no field, the extension SHALL add a red row with the validator message under the field rows.

### Scenario: Whole-document error

- GIVEN a schema with minProperties 3 and a document with the single key type
- WHEN the preview is rendered
- THEN a red row reads must NOT have fewer than 3 properties and the badge reads 1 error

### Scenario: Enough properties

- GIVEN the same schema and a document with three keys
- WHEN the preview is rendered
- THEN no such row is shown

### Verification notes

- Method: Unit test of the analysis (root errors). The minProperties scenario has no test; probed against the analysis.
- Criteria: The row is an info-style row with the error severity and spans every visible column.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-084](SwRS-MDOKFSTUDIO-FMSCHEMA-084.md): Every schema violation is reported on its field or in a row of its own
<!-- okf:links:end -->
