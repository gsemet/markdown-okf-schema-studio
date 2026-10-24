---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-063
uuid: d7e15e43-358b-4dc0-aa3c-59066557b982
title: List tables render like pipe tables
description: When a document holds a `{list-table}`, the extension SHALL render
  a table with title as caption, `:header-rows:` header cells, `:widths:`
  proportions, `:align:` and inline Markdown cells, as one source block with no
  overflow.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-013
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## List tables render like pipe tables

### Normative behavior

When a document holds a `{list-table}`, the extension SHALL render a table with title as caption, `:header-rows:` header cells, `:widths:` proportions, `:align:` and inline Markdown cells, as one source block with no overflow.

### Scenario: Nominal

- GIVEN a list-table with title, two header rows and widths `30 70`
- WHEN the preview renders
- THEN a caption, two header rows and 30/70 column proportions appear

### Scenario: Boundary or refusal

- GIVEN `:header-rows: 0`
- WHEN the preview renders
- THEN no header cells are made

### Verification notes

- Method: test
- Criteria: Cell, header and border styles match a pipe table.
