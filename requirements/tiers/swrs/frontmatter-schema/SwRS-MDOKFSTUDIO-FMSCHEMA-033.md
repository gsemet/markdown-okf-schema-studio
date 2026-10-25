---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-033
uuid: 6e67941f-edb8-414b-b115-314fff87e991
title: The displayed field type follows the schema declaration
description: When a schema table row is built, the extension SHALL display enum
  for enum or const, datetime, date or time for those formats, boolean, number,
  list or text for the matching type (the first non-null type of a type list)
  and unknown otherwise.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-029; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-029
---

## The displayed field type follows the schema declaration

### Normative behavior

When a schema table row is built, the extension SHALL display enum for enum or const, datetime, date or time for those formats, boolean, number, list or text for the matching type (the first non-null type of a type list) and unknown otherwise.

### Scenario: Declared types

- GIVEN a schema declaring fields of type boolean, integer, array, string with format date-time and enum
- WHEN the preview is rendered
- THEN the labels read boolean, number, list, datetime and enum

### Scenario: Object and composition

- GIVEN a field declared as type object and a field declared only by anyOf
- WHEN the preview is rendered
- THEN both are labelled unknown

### Verification notes

- Method: Unit test of the field icon type.
- Criteria: The format test comes before the type test, so a string field with format date shows date. Without a schema the type follows the value: boolean, number or list, else unknown.
- Known issue: fields declared with type object are labelled (unknown).
