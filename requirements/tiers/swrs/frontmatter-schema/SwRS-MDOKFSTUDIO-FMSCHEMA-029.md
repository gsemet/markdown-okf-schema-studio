---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-029
uuid: 423c6808-b33c-44e8-b237-20ebe65f2ded
title: A schema table lists declared fields first in schema order
description: When a document's type has a schema, the extension SHALL show a
  table with the columns Name, Value and Description that lists the declared
  fields present in the document in schema order, then the other keys in source
  order.
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

## A schema table lists declared fields first in schema order

### Normative behavior

When a document's type has a schema, the extension SHALL show a table with the columns Name, Value and Description that lists the declared fields present in the document in schema order, then the other keys in source order.

### Scenario: Schema order

- GIVEN a schema declaring type, title and owner (in that order) and a document writing type, owner, title and an extra key zz
- WHEN the preview is rendered
- THEN the rows read type, title, owner, zz and the Description column shows each schema description

### Scenario: Required but absent field

- GIVEN the same schema requiring a field that the document lacks
- WHEN the preview is rendered
- THEN an empty row for the field is appended after the other rows

### Verification notes

- Method: Unit test of the analysis and of the table renderer; visual scenario.
- Criteria: Declared present fields come in effective-schema order; undeclared keys in YAML order; absent required fields last.
