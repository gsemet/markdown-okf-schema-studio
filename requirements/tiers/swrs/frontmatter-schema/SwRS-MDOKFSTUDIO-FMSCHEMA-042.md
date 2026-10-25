---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-042
uuid: 19c35791-13af-49b6-a5e4-73287d5ed836
title: The strict setting warns on undeclared fields
description: When
  `markdownOkfSchemaStudio.frontmatter.strictAdditionalProperties` is true and a
  schema matched, the extension SHALL warn on each field the schema does not
  declare with "Unknown field; it is not declared in the "{type}" schema." and
  count it in the badge.
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

## The strict setting warns on undeclared fields

### Normative behavior

When `markdownOkfSchemaStudio.frontmatter.strictAdditionalProperties` is true and a schema matched, the extension SHALL warn on each field the schema does not declare with "Unknown field; it is not declared in the "{type}" schema." and count it in the badge.

### Scenario: Setting on

- GIVEN strictAdditionalProperties true, a schema declaring type and title, and a document that also sets titel
- WHEN the preview is rendered
- THEN the row titel carries the warning above and the badge counts one warning

### Scenario: Setting at its default

- GIVEN the same document with the setting unset (default false, boolean)
- WHEN the preview is rendered
- THEN titel is listed without any warning

### Verification notes

- Method: Unit test of the analysis; visual scenario.
- Criteria: Applies only when a schema matched; independent of the schema's own additionalProperties; a generic table never warns.
