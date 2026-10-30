---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-031
uuid: aaf8ce8b-5c8d-4898-b3f3-641983d2ebf5
title: The row tooltip lists title, description, allowed values and issues
description: 'When a schema table row is displayed, the extension SHALL set its tooltip
  to the schema title, the schema description, the line "Allowed: {values}" for enum
  fields and every issue message, one per line.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-029
default_owner_email: gaetan@xeberon.net
---

## The row tooltip lists title, description, allowed values and issues

### Normative behavior

When a schema table row is displayed, the extension SHALL set its tooltip to the schema title, the schema description, the line "Allowed: {values}" for enum fields and every issue message, one per line.

### Scenario: Enum field with docs

- GIVEN a field with title Status, description Lifecycle and enum draft and active
- WHEN the preview is rendered
- THEN the row tooltip reads Status, Lifecycle and Allowed: draft, active on separate lines

### Scenario: Field with an issue

- GIVEN the same field holding the value retired
- WHEN the preview is rendered
- THEN the tooltip ends with the validation message of the enum

### Verification notes

- Method: Unit test of the table renderer.
- Criteria: The tooltip is empty when the row has no title, description, enum or issue.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-029](SwRS-MDOKFSTUDIO-FMSCHEMA-029.md): A schema table lists the declared fields with their type
<!-- okf:links:end -->
