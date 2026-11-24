---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-273
uuid: 80fce61e-a234-41d8-a649-8b9f6911b01c
title: Each edge of a copied selection maps to a character of the source and the
  cut is verbatim
description: When the page copies a native selection, it SHALL cut the source
  verbatim from the character under the start edge to the character under the
  end edge, mapping a code block's characters exactly, an edge in a container's
  opening line to that line's start or end, a block under a tab item through the
  nearest mapped element and a card's current side through the block it copies,
  and adding nothing at either edge.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-027
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopy.ts
- src/core/mapping/rawCopyEdges.ts
tested_in_files:
- test/core/mapping/rawCopy.test.ts
- test/integration/realInput/rawCopy.ts
- test/visual/capture_raw_copy.py
- test/visual/rawCopyScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Each edge of a copied selection maps to a character of the source and the cut is verbatim

### Normative behavior

When the page copies a native selection, it SHALL cut the source verbatim from the character under the start edge to the character under the end edge, mapping a code block's characters exactly, an edge in a container's opening line to that line's start or end, a block under a tab item through the nearest mapped element and a card's current side through the block it copies, and adding nothing at either edge.

### Scenario: nominal

- GIVEN a selection from a character of one block to a character of another
- WHEN the copy is taken
- THEN the clipboard text/plain is the source verbatim from the character under the start to the character under the end

### Scenario: boundary

- GIVEN an edge that cannot be aligned with the source text
- WHEN the copy is taken
- THEN the copy stays native

### Verification notes

- Method: unit tests of the core on rendered pages
- Criteria: the cut equals the source slice, byte for byte, line breaks included

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
