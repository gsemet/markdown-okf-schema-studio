---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-015
uuid: a93097ad-6505-4cf4-864e-bc729de23cf4
title: Pipe tables keep header and column alignment
description: When a GFM pipe table has alignment markers in its delimiter row,
  the extension SHALL render the header and apply that alignment to every cell
  of the column.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-002
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-GFM-008; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-GFM-008
default_owner_email: gaetan@xeberon.net
---

## Pipe tables keep header and column alignment

### Normative behavior

When a GFM pipe table has alignment markers in its delimiter row, the extension SHALL render the header and apply that alignment to every cell of the column.

### Scenario: Aligned column

- GIVEN a pipe table with a '---:' column
- WHEN the preview is rendered
- THEN each cell of that column is right-aligned and the header row is a header

### Scenario: Unaligned columns

- GIVEN a pipe table with plain '---' columns
- WHEN the preview is rendered
- THEN no alignment is applied

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Alignment appears on all cells of aligned columns only.
