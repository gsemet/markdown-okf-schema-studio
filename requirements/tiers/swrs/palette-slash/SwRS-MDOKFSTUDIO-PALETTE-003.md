---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-003
uuid: ecfd6d2d-052b-4363-bb79-fa41c8414b55
title: The Table of contents action inserts a [TOC] marker
description: When the user runs the Table of contents action from the edition
  palette or the /toc entry of the slash menu in a block editor, the editor
  SHALL insert a [TOC] line set apart by blank lines after the line the
  selection ends on and place the caret after it, in every palette mode.
project: MDOKFSTUDIO
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/palette/paletteActions.ts
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/tocAction.test.ts
---

## The Table of contents action inserts a [TOC] marker

### Normative behavior

When the user runs the Table of contents action from the edition palette or the /toc entry of the slash menu in a block editor, the editor SHALL insert a [TOC] line set apart by blank lines after the line the selection ends on and place the caret after it, in every palette mode.

### Scenario (nominal): Insertion

- GIVEN a block editor with the caret in a paragraph
- WHEN the Table of contents button is pressed, or `/toc` is chosen in the slash menu
- THEN a `[TOC]` line is written after the paragraph, set apart by one blank line before and after, and the caret is placed after the marker

### Scenario (boundary): Listing

| Mode | Palette button and `/toc` entry |
| --- | --- |
| strict, GFM and MyST | listed (group Block, after Horizontal rule) |
| table cell editor | not listed (block scope only) |

The `/` menu also finds the action by `toc`, `contents`, `table of contents`, `outline` and `summary`.

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-072: the rendering of the marker the action inserts.
- SwRS-MDOKFSTUDIO-PALETTE-050: the Horizontal rule action, which sets its block apart the same way.

### Verification notes

- Method: test/page/modules/tocAction.test.ts (the edit, the listing and the slash aliases), test/core/palette/paletteActions.test.ts (registry order and icon)
- Criteria: the written text, the caret position and the registry match the scenarios above.
