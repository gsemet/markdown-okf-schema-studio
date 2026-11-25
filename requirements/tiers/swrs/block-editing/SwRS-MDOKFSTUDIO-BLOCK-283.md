---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-283
uuid: 99a06d4d-0e37-4b43-8114-ec47b0c11401
title: A list item cut by an edge keeps its marker and a shifted indentation
description: When the balance-edges setting is on and a selection starts inside
  a list item it does not entirely contain, the raw copy SHALL begin with that
  item's marker, shift every copied line of the list left by the indentation of
  the shallowest copied item and keep the first marker line at most at column 3,
  and when both edges lie inside one item it SHALL copy its content with the
  item's indentation removed.
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
  title: both edges inside one item
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
- test/core/mapping/rawCopyBalanceLists.test.ts
- test/core/mapping/rawCopyBalanceNesting.test.ts
- test/visual/capture_raw_copy_balanced.py
default_owner_email: gaetan@xeberon.net
---

## A list item cut by an edge keeps its marker and a shifted indentation

### Normative behavior

When the balance-edges setting is on and a selection starts inside a list item it does not entirely contain, the raw copy SHALL begin with that item's marker, shift every copied line of the list left by the indentation of the shallowest copied item and keep the first marker line at most at column 3, and when both edges lie inside one item it SHALL copy its content with the item's indentation removed.

### Scenario S1: setting off

- GIVEN the setting is off and a nested list
- WHEN the selection starts in a nested item
- THEN the copy is the source verbatim

### Scenario S2: both edges inside one item

- GIVEN the setting is on and both edges lie inside one list item
- WHEN the reader copies
- THEN the clipboard holds its content without the marker or the indentation

### Scenario S3: boundary crossed at the start

- GIVEN the setting is on and the selection starts inside a list item and ends after it
- WHEN the reader copies
- THEN the copy begins with the item's marker, the lines are shifted left by the shallowest copied item and the first marker is at most at column 3

### Scenario S4: boundary crossed at the end

- GIVEN the setting is on and the selection starts before a list and ends inside an item
- WHEN the reader copies
- THEN the copy keeps the source lines of the items it reaches, with no shift

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core on rendered pages: nested, ordered, task and quoted lists, 3-column cap
- Criteria: the marker and the shift are as stated

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
