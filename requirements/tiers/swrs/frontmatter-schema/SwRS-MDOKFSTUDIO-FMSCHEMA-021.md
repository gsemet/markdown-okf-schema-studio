---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-021
uuid: 7e61078f-99cd-4e9b-a069-8c22b2f96d3f
title: A missing schema file is reported as an info row
description: When a schema folder exists but holds no file for the document's
  type, the extension SHALL show the generic table with the info row "No schema
  found for type "{type}" in {folder}/." and an info badge.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-019
default_owner_email: gaetan@xeberon.net
---

## A missing schema file is reported as an info row

### Normative behavior

When a schema folder exists but holds no file for the document's type, the extension SHALL show the generic table with the info row "No schema found for type "{type}" in {folder}/." and an info badge.

### Scenario: No file for the type

- GIVEN a schema folder holding only other.schema.yaml and a document of type Note
- WHEN the preview is rendered
- THEN the table is generic, one info row reads No schema found for type "Note" in _schema/. and the badge reads ℹ 1

### Scenario: Schema file added

- GIVEN the file Note.schema.yaml is added to the folder
- WHEN the document is analysed again
- THEN the info row is gone and the schema table is shown

### Verification notes

- Method: Unit test of the analysis.
- Criteria: The folder name in the message is the base name of the schema folder; the summary counts one info.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-006](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-006.md): A document finds its schema and schema problems are reported
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-019](SwRS-MDOKFSTUDIO-FMSCHEMA-019.md): A typed document finds its schema in the nearest schema folder
<!-- okf:links:end -->
