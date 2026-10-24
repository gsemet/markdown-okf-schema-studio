---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-009
uuid: ff6237e1-7319-47eb-b461-098fe10c0789
title: The open first-block editor keeps the 40 px gap
description: When the first block of a document is open in its block editor, the
  extension SHALL start the editor frame, with its edition palette on top, 40 px
  below the top of the pane.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The open first-block editor keeps the 40 px gap

### Normative behavior

When the first block of a document is open in its block editor, the extension SHALL start the editor frame, with its edition palette on top, 40 px below the top of the pane.

### Scenario: Paragraph editor

- GIVEN edit mode on, a wide pane (900 px) and the first paragraph opened in its editor
- WHEN the frame is rendered
- THEN the frame, with the palette on top, starts 40 px (within 4 px) below the top and the palette starts at the height of the editor frame

### Scenario: Other first blocks

- GIVEN the first block is an h1, h2, h3, an image or an admonition and is opened in its editor
- WHEN the frame is rendered
- THEN the frame starts 40 px (within 4 px) below the top

### Known issues

- Known issue: Palette sticking and mode belong to the palette requirements; only the position of the frame is specified here.

### Verification notes

- Method: Unit test of the first-block editor margin rule and the first-element gap visual checks of the frame (v10 to v20, v24 to v29, v50).
- Criteria: The frame record measures 40 px within 4 px from the top in the visual checks.
