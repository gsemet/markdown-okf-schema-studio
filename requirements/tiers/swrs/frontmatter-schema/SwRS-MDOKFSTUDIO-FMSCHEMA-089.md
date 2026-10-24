---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-089
uuid: f4cd2158-8cca-40c1-bcb7-0cc3f180ecd5
title: Every violation of the schema is reported
description: When the frontmatter violates the schema in several places, the
  extension SHALL report every violation, not only the first.
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

## Every violation of the schema is reported

### Normative behavior

When the frontmatter violates the schema in several places, the extension SHALL report every violation, not only the first.

### Scenario: Several errors

- GIVEN a document violating a maximum and a format
- WHEN the preview is rendered
- THEN both rows carry their error

### Scenario: One error

- GIVEN a document violating one constraint
- WHEN the preview is rendered
- THEN exactly one row carries an error

### Verification notes

- Method: Unit test of the analysis (probed against the analysis; moved from SwRS-MDOKFSTUDIO-FMSCHEMA-084).
- Criteria: The validator collects all errors, so each violation gets its own row or underline.
