---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-036
uuid: be0d72c2-0aeb-4590-8a0e-0d0b929cc049
title: A missing required field gets an empty row with its error
description: When a field required by the schema is absent from the frontmatter,
  the extension SHALL add an empty row for it with the error "Required field
  "{name}" is missing.".
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-084
---

## A missing required field gets an empty row with its error

### Normative behavior

When a field required by the schema is absent from the frontmatter, the extension SHALL add an empty row for it with the error "Required field "{name}" is missing.".

### Scenario: Absent required field

- GIVEN a schema requiring title and a document without title
- WHEN the preview is rendered
- THEN a row named title with an empty value is listed last and carries the error Required field "title" is missing.

### Scenario: Required field present

- GIVEN the same document with a title
- WHEN the preview is rendered
- THEN no row carries a required-field error

### Verification notes

- Method: Unit test of the analysis.
- Criteria: The empty row has value null and is flagged required.
