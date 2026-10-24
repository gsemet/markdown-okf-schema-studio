---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-088
uuid: f65ba8cf-270e-400c-8b0e-fcb077abe5ff
title: The csv-table directive renders a table
description: When a document holds a `{csv-table}` directive, the extension
  SHALL render a table with its caption and `:align:`, using `:header:` rows and
  keeping quoted multi-line cells whole.
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

## The csv-table directive renders a table

### Normative behavior

When a document holds a `{csv-table}` directive, the extension SHALL render a table with its caption and `:align:`, using `:header:` rows and keeping quoted multi-line cells whole.

### Scenario: Nominal

- GIVEN a `{csv-table}` with `:header:` and a quoted cell spanning two lines
- WHEN the preview renders
- THEN the header row is made and the quoted cell holds both lines

### Scenario: Boundary or refusal

- GIVEN a `{csv-table}` with a caption and `:align: right` and no `:header:`
- WHEN the preview renders
- THEN the table has the caption and alignment and no header cells

### Verification notes

- Method: test
- Criteria: Header, quoted multi-line cell, caption and alignment render.
