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
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-063
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "MyST GFM and directive tables preserve captions, headers, and alignment" in test/core/render/mystFeatures.test.ts
- Criteria: Header, quoted multi-line cell, caption and alignment render.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-063](SwRS-MDOKFSTUDIO-MYST-063.md): Table directives render as ordinary tables
<!-- okf:links:end -->
