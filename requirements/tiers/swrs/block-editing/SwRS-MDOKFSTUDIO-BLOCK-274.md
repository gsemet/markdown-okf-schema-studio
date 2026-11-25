---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-274
uuid: 8d92272a-2b23-40bd-9cc0-20a1894a4047
title: A copied selection gives the source of generated content and included
  blocks whole
description: When a copied selection touches generated content or an included
  block (a diagram, a table of contents, the properties table, display or inline
  math, an image, a figure, a computed role or an included file's block), the
  page SHALL copy the source construct that produces it whole, from its first
  character to its last.
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
  title: nominal
- id: S2
  title: boundary
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/rawCopy.ts
tested_in_files:
- test/core/mapping/rawCopy.test.ts
- test/visual/capture_raw_copy.py
default_owner_email: gaetan@xeberon.net
---

## A copied selection gives the source of generated content and included blocks whole

### Normative behavior

When a copied selection touches generated content or an included block (a diagram, a table of contents, the properties table, display or inline math, an image, a figure, a computed role or an included file's block), the page SHALL copy the source construct that produces it whole, from its first character to its last.

### Scenario S1: nominal

- GIVEN an edge in a diagram, table of contents, image, math or included block, or in frontmatter
- WHEN the copy is taken
- THEN the whole construct is copied from its first to its last source line

### Scenario S2: boundary

- GIVEN a generated block whose mapping holds only its first line
- WHEN the copy is taken
- THEN the closing fence of the source ends the construct

### Verification notes

- Method: unit tests of the core
- Criteria: the construct is whole at the edge

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
