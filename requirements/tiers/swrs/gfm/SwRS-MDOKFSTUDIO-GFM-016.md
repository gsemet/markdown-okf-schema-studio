---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-016
uuid: d811b979-2c9b-409b-a238-db546a61e8e3
title: Checkbox markers render as checkboxes with source position
description: When a task-list item, paragraph, table cell, directive body or
  admonition title contains [ ], [x] or [X], the extension SHALL render a
  checkbox carrying its source line and UTF-16 column.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Checkbox markers render as checkboxes with source position

### Normative behavior

When a task-list item, paragraph, table cell, directive body or admonition title contains [ ], [x] or [X], the extension SHALL render a checkbox carrying its source line and UTF-16 column.

### Scenario: Markers become checkboxes

- GIVEN '- [ ] a' in a list, '[x]' in a table cell, and a document with frontmatter
- WHEN the preview is rendered
- THEN each marker is a checkbox whose line and column equal the marker position, frontmatter lines included

### Scenario: Non-ASCII before marker

- GIVEN a line with an astral character before '[ ]'
- WHEN the preview is rendered
- THEN the column counts UTF-16 units

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Checkbox count and positions equal the source markers.
