---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-286
uuid: 621e2671-3ddf-4971-a7a3-ffd5cc858f9b
title: An edge the alignment cannot place snaps to its whole element
description: When an edge of a copied selection cannot be placed in the source,
  the raw copy SHALL move the start edge to the start and the end edge to the
  end of the innermost mapped element that holds it, with the balance-edges
  setting off or on, and SHALL leave the copy native only when the start lies
  after the end.
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
  title: setting off, an edge not placed
- id: S2
  title: setting on, the same edge
- id: S3
  title: boundary start after the end
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopyEdges.ts
tested_in_files:
- test/core/mapping/rawCopyBalanceNesting.test.ts
default_owner_email: gaetan@xeberon.net
---

## An edge the alignment cannot place snaps to its whole element

### Normative behavior

When an edge of a copied selection cannot be placed in the source, the raw copy SHALL move the start edge to the start and the end edge to the end of the innermost mapped element that holds it, with the balance-edges setting off or on, and SHALL leave the copy native only when the start lies after the end.

### Scenario S1: setting off, an edge not placed

- GIVEN the setting is off and an edge that the alignment cannot place
- WHEN the reader copies
- THEN the start edge moves to the start and the end edge to the end of the innermost mapped element that holds it

### Scenario S2: setting on, the same edge

- GIVEN the setting is on
- WHEN the reader copies
- THEN the same snap, then the balancing of the snapped edges

### Scenario S3: boundary start after the end

- GIVEN the start edge lies after the end edge
- WHEN the reader copies
- THEN the copy stays native

### Verification notes

<!-- Name the verification method, evidence, and boundaries. Do not claim
     coverage until implementation and test markers exist. -->

- Method: unit tests of the core
- Criteria: no unplaced edge leaves the copy native unless the start lies after the end

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
