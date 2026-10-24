---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-065
uuid: 5e3bb905-e514-445e-a3c0-e69b22c57627
title: The table directive renders a table with caption, id and alignment
description: When a document holds a `{table}` directive, the extension SHALL
  render a table with its caption, its `:label:` as id and its `:align:`,
  keeping GFM column alignment on every cell.
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

## The table directive renders a table with caption, id and alignment

### Normative behavior

When a document holds a `{table}` directive, the extension SHALL render a table with its caption, its `:label:` as id and its `:align:`, keeping GFM column alignment on every cell.

### Scenario: Nominal

- GIVEN a `{table}` with caption, `:label:` and `:align: center` around a pipe table with aligned columns
- WHEN the preview renders
- THEN a captioned table has the label as id, is aligned and keeps each column's GFM alignment

### Scenario: Boundary or refusal

- GIVEN a `{table}` with `:align:` around a raw HTML table
- WHEN the preview renders
- THEN the HTML table takes the alignment

### Verification notes

- Method: test
- Criteria: Caption, id, alignment and GFM column alignment are present; palette-written captioned tables render a caption.
