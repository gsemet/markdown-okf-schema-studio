---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-066
uuid: 974dbc48-1687-4f66-b5e9-e4b34dc126b3
title: Links are resolved about 150 ms after the render
description: When a table with pending links has been shown, the extension SHALL
  resolve the links about 150 ms later and replace the table in place, waiting
  while a block or field editor is open and dropping results that became stale.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-016
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Links are resolved about 150 ms after the render

### Normative behavior

When a table with pending links has been shown, the extension SHALL resolve the links about 150 ms later and replace the table in place, waiting while a block or field editor is open and dropping results that became stale.

### Scenario: Resolved after render

- GIVEN a rendered table with pending links
- WHEN 150 ms pass
- THEN the table is swapped in place and no spinner is left

### Scenario: Document changed meanwhile

- GIVEN the document, the render or the panel changed before the timer fired
- WHEN the timer fires
- THEN the result is dropped and nothing is patched

### Verification notes

- Method: Unit test of the frontmatter controller; visual scenario.
- Criteria: A new request restarts the timer.
