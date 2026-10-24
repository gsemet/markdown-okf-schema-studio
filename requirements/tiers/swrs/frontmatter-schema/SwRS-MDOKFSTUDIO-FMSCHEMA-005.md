---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-005
uuid: a8534621-9619-427c-844e-8ad5320d95b9
title: A table without a schema lists the keys in source order
description: When the frontmatter has no string `type`, the extension SHALL show
  a two-column table headed Names and Values that lists the keys in source
  order, without type icons or a Description column.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A table without a schema lists the keys in source order

### Normative behavior

When the frontmatter has no string `type`, the extension SHALL show a two-column table headed Names and Values that lists the keys in source order, without type icons or a Description column.

### Scenario: No type

- GIVEN a document whose frontmatter is `b: 1` then `a: two`
- WHEN the preview is rendered
- THEN a two-column table with the headers Names and Values lists b before a, with no type icon, no Description column and no badge

### Scenario: Type that is not a string

- GIVEN a document whose frontmatter is `type: 5` then `a: 1`
- WHEN the preview is rendered
- THEN the same generic two-column table lists type then a and no schema lookup message appears

### Scenario: Empty type

- GIVEN a document whose frontmatter is `type: ''` then `a: 1`
- WHEN the preview is rendered
- THEN the generic table is shown and no schema lookup is made, so no info row appears

### Verification notes

- Method: Unit test of the analysis and of the table renderer; integration and visual scenarios.
- Criteria: Columns are Names and Values; rows follow the YAML key order. A document with a string type may add an info or warning row to the generic table (see the schema lookup requirements).
- Known issue: the generic header reads Names / Values while a schema table reads Name / Value.
