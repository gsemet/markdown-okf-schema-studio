---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-041
uuid: f001d142-9245-49b6-8d2d-fa31657a5c59
title: A closed schema reports every undeclared field
description: 'When a schema root declares `additionalProperties: false`, the extension
  SHALL report each undeclared field as the schema error row "must NOT have additional
  properties", whatever the strict setting.'
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A closed schema reports every undeclared field

### Normative behavior

When a schema root declares `additionalProperties: false`, the extension SHALL report each undeclared field as the schema error row "must NOT have additional properties", whatever the strict setting.

### Scenario: Undeclared field

- GIVEN a schema with additionalProperties false declaring type and a, and a document that also sets zz
- WHEN the preview is rendered
- THEN one error row reads must NOT have additional properties

### Scenario: Open schema

- GIVEN the same schema without additionalProperties false
- WHEN the preview is rendered
- THEN no such row appears

### Verification notes

- Method: Unit test of the analysis; integration test; unit tests "T25 ..." in the okfFrontmatter and propertiesTable tests for the section flag.
- Criteria: The strict setting has no effect on this error; one row is reported per undeclared key, including type when the schema does not declare it. A closed schema also flags the properties section `data-okf-additional-properties="false"`, which the editing picker reads to offer no custom key (see SwRS-MDOKFSTUDIO-FMEDIT-035).
- Known issue: the error is not attached to the field row (the validator reports it at the document root), so the undeclared row itself carries no underline.
