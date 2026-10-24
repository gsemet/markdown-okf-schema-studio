---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-084
uuid: 2ffda814-d16a-4a67-ac30-5c20aa41ffbb
title: The frontmatter is validated against JSON Schema 2020-12
description: 'When the frontmatter is validated, the extension SHALL apply the keywords
  of JSON Schema 2020-12 with formats.'
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

## The frontmatter is validated against JSON Schema 2020-12

### Normative behavior

When the frontmatter is validated, the extension SHALL apply the keywords of JSON Schema 2020-12 with formats.

### Scenario: 2020-12 keyword

- GIVEN a schema using prefixItems with items false and a list value whose second item has the wrong type
- WHEN the preview is rendered
- THEN the list row carries the error must be number

### Scenario: Format

- GIVEN a schema property with a format and a value that does not match it
- WHEN the preview is rendered
- THEN the row carries the format error

### Verification notes

- Method: Unit test of the analysis (the prefixItems scenario was probed against the analysis).
- Criteria: Reporting every error is specified in SwRS-MDOKFSTUDIO-FMSCHEMA-089. Unknown keywords are ignored silently.
