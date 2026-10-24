---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-006
uuid: ddd79816-4f35-4eb1-bfe0-afb844a70534
title: A nested mapping shows as YAML code
description: When a frontmatter value is a mapping and carries no link, the
  extension SHALL show it as a YAML code block in the Value cell.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A nested mapping shows as YAML code

### Normative behavior

When a frontmatter value is a mapping and carries no link, the extension SHALL show it as a YAML code block in the Value cell.

### Scenario: Mapping value

- GIVEN a document whose frontmatter has `obj` with the keys `a: 1` and `b` holding a list with x
- WHEN the preview is rendered
- THEN the Value cell of obj holds a code block in YAML syntax reading `a: 1`, `b:` and `  - x` on separate lines

### Scenario: Mapping value inside a list

- GIVEN a document whose list field holds a mapping item
- WHEN the preview is rendered
- THEN the list item is shown with its keys as a nested key and value list, not as raw JSON

### Verification notes

- Method: Unit test of the table renderer.
- Criteria: Top-level mapping values use the language-yaml code block; mappings with link results use the structured list.
