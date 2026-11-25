---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-276
uuid: 513f8612-01c8-4456-92bf-33ffcfec6c2d
title: A copied selection never holds interface chrome nor the text of an
  old-side card
description: When the page copies a native selection, it SHALL leave out of the
  clipboard the text of interface chrome (comment chips and threads, buttons,
  handles, toggles, line numbers, toolbars, the find bar) and of an old-side
  card, in the plain text and in the HTML.
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
- src/core/mapping/rawCopyTree.ts
tested_in_files:
- test/core/mapping/rawCopy.test.ts
default_owner_email: gaetan@xeberon.net
---

## A copied selection never holds interface chrome nor the text of an old-side card

### Normative behavior

When the page copies a native selection, it SHALL leave out of the clipboard the text of interface chrome (comment chips and threads, buttons, handles, toggles, line numbers, toolbars, the find bar) and of an old-side card, in the plain text and in the HTML.

### Scenario S1: nominal

- GIVEN a selection spanning line numbers, the copy button of a code block, the side-by-side cards or hidden math
- WHEN the copy is taken
- THEN none of that chrome appears in the text/plain or in the text/html

### Scenario S2: boundary

- GIVEN a selection in the old side of a side-by-side card
- WHEN the copy is taken
- THEN the copy stays native

### Verification notes

- Method: unit tests of the core and the page
- Criteria: the chrome is not in either format

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-027](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-027.md): A reader copies a selection as the exact Markdown under it
<!-- okf:links:end -->
