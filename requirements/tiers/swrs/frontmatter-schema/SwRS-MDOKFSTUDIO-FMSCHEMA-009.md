---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-009
uuid: 973149ae-72fe-4a8d-bdd8-5d5cead7b1dc
title: Empty lists and null values show as YAML tokens
description: When a frontmatter value is an empty list or null, the extension
  SHALL show `[]` for the empty list and `null` for the null value.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-006; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-FMSCHEMA-006
---

## Empty lists and null values show as YAML tokens

### Normative behavior

When a frontmatter value is an empty list or null, the extension SHALL show `[]` for the empty list and `null` for the null value.

### Scenario: Empty list

- GIVEN a field `empty: []`
- WHEN the properties table is rendered
- THEN the Value cell reads []

### Scenario: Null value

- GIVEN a field `none:` with no value
- WHEN the properties table is rendered
- THEN the Value cell reads null

### Verification notes

- Method: Unit test of the table renderer.
- Criteria: Both tokens are literal text in the Value cell.
- Known issue: the helper formatValue of the table renderer is never called and would show an em dash for null; today null shows the word null.
