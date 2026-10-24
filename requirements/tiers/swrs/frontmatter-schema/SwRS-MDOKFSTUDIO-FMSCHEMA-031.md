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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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
