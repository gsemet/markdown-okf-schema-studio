---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-058
uuid: b87fe1eb-e8ce-4217-a4a9-2f17f8b2d9c9
title: Edit a list-table as one block
description: When a `{list-table}` is rendered, the extension SHALL give its
  cell paragraphs no source line so that a click edits the whole table as one
  block.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-063
---

## Edit a list-table as one block

### Normative behavior

When a `{list-table}` is rendered, the extension SHALL give its cell paragraphs no source line so that a click edits the whole table as one block.

### Scenario: Nominal edit a list-table as one block

- GIVEN a list-table
- WHEN a cell is clicked in edit mode
- THEN the whole table opens in one editor

### Scenario: Boundary or refusal of edit a list-table as one block

- GIVEN a Markdown table
- WHEN a cell is clicked
- THEN its cell editor opens

### Verification notes

- Method: Unit test "CR038: a list-table renders its title, header rows, widths and alignment as one editable block" in test/core/render/mystFeatures.test.ts
- Criteria: List-table cells carry no line attribute.
