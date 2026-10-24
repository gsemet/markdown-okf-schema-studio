---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-046
uuid: d5e547c4-7310-4b3c-8abe-8998742951d6
title: x-okf-link annotations are found in nested schema positions
description: When a schema annotates a property with `x-okf-link`, the extension
  SHALL find the annotation on top-level and nested properties, array items and
  prefixItems, patternProperties, additionalProperties, local `$ref`s, every
  allOf branch, the matching anyOf branches, the single matching oneOf branch
  and the selected if/then/else branch.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## x-okf-link annotations are found in nested schema positions

### Normative behavior

When a schema annotates a property with `x-okf-link`, the extension SHALL find the annotation on top-level and nested properties, array items and prefixItems, patternProperties, additionalProperties, local `$ref`s, every allOf branch, the matching anyOf branches, the single matching oneOf branch and the selected if/then/else branch.

### Scenario: Array items

- GIVEN a schema whose list property has items annotated with x-okf-link and a document listing two targets
- WHEN the document is analysed
- THEN two link results are produced for the field, one per item, with their array indexes

### Scenario: oneOf with two matching branches

- GIVEN a schema whose oneOf has two branches that both match the value and carry annotations
- WHEN the document is analysed
- THEN no annotation of that oneOf is collected

### Scenario: patternProperties

- GIVEN a mapping field whose patternProperties entry ^k is annotated and a value with keys k1 and z
- WHEN the document is analysed
- THEN only k1 gets a link result

### Scenario: additionalProperties

- GIVEN a mapping field whose additionalProperties schema is annotated and a value with the key k1
- WHEN the document is analysed
- THEN k1 gets a link result

### Scenario: prefixItems

- GIVEN a list field whose first prefixItems entry is annotated and a value with two targets
- WHEN the document is analysed
- THEN the first item gets a link result

### Scenario: Local reference

- GIVEN a property whose schema is `$ref: "#/$defs/lk"` and lk carries the annotation
- WHEN the document is analysed
- THEN the property gets a link result

### Scenario: allOf and anyOf

- GIVEN a property annotated through an allOf branch, and one through the anyOf branch that matches its value
- WHEN the document is analysed
- THEN both properties get a link result, and an anyOf branch that does not match its value contributes none

### Scenario: if/then/else

- GIVEN a then branch annotating a and a document where the if condition holds, then one where it does not
- WHEN the document is analysed
- THEN a gets a link result only in the first document

### Verification notes

- Method: Unit test of the link inspection (annotation walker): items and oneOf are tested; the other positions were probed against the inspection.
- Criteria: Duplicate links (same field, index, resolution, syntax and target) are reported once; nested results attach to their top-level field row.
