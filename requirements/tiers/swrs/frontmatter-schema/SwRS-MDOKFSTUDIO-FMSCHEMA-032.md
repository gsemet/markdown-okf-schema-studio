---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-032
uuid: 87222cd7-3863-4043-be72-e379cdc39e9c
title: Composed schemas are merged into one field list
description: When a schema uses allOf, anyOf, oneOf or if/then/else, the
  extension SHALL merge the properties of every visited branch into one field
  list in declaration order, following the if branch that the current values
  select, and apply the required lists of the visited branches.
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

## Composed schemas are merged into one field list

### Normative behavior

When a schema uses allOf, anyOf, oneOf or if/then/else, the extension SHALL merge the properties of every visited branch into one field list in declaration order, following the if branch that the current values select, and apply the required lists of the visited branches.

### Scenario: allOf and if/then

- GIVEN a schema with allOf adding x (required), and if kind is a then ifa (required) else ifb
- WHEN a document with kind a is analysed
- THEN the missing required fields are x and ifa

### Scenario: else branch

- GIVEN the same document with kind b
- WHEN the document is analysed
- THEN the missing required fields are only x, because the then branch is not visited

### Verification notes

- Method: Unit test of the effective properties.
- Criteria: Later branches extend earlier declarations of the same name; nullable is recorded per field.
- Known issue: anyOf and oneOf branches are merged even when they do not match the values (display only; validation is the validator's).
