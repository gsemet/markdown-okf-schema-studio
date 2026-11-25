---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-282
uuid: f967b03e-8dba-441e-ab16-cae21511d6f9
title: A table cut by an edge is copied as whole rows or as one cell
description: When the balance-edges setting is on, the raw copy SHALL copy the
  text between the edges when both edges lie in one table cell, and otherwise
  SHALL copy the touched rows whole, preceded by the header row and the
  delimiter row when the selection starts in a body row.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
scenarios:
- id: S1
  title: setting off
- id: S2
  title: both edges in one cell
- id: S3
  title: boundary crossed at the start
- id: S4
  title: boundary crossed at the end
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopyBalance.ts
tested_in_files:
- test/core/mapping/rawCopyBalanceBlocks.test.ts
- test/visual/capture_raw_copy_balanced.py
default_owner_email: gaetan@xeberon.net
---

## A table cut by an edge is copied as whole rows or as one cell

### Normative behavior

When the balance-edges setting is on, the raw copy SHALL copy the text between the edges when both edges lie in one table cell, and otherwise SHALL copy the touched rows whole, preceded by the header row and the delimiter row when the selection starts in a body row.

### Scenario S1: setting off

- GIVEN the setting is off and a table
- WHEN the selection runs from one cell to a cell of another row
- THEN the copy is the source verbatim

### Scenario S2: both edges in one cell

- GIVEN the setting is on and both edges lie in one cell
- WHEN the reader copies
- THEN the clipboard holds the text between the edges

### Scenario S3: boundary crossed at the start

- GIVEN the setting is on and the selection starts in a body row
- WHEN the reader copies to a cell of a later row
- THEN the copy holds the header row, the delimiter row and the touched rows whole

### Scenario S4: boundary crossed at the end

- GIVEN the setting is on and the selection starts before the table
- WHEN the selection ends inside a cell
- THEN the copy holds the header row, the delimiter row and the rows up to the touched one, whole

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages, tables in admonitions included
- Criteria: a cell copies alone, a wider selection copies whole rows

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
