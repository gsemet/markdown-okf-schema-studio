---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-007
uuid: 5ae08f04-3c6c-4cc7-b00c-5a51867f151a
title: The first element starts 40 px below the top
description: When a document opens in read mode or in edit mode, the extension
  SHALL start its first element, whatever the element is, 40 px below the top of
  the pane as a top margin of that element, including the frame of an open
  first-block editor with its edition palette on top and the Start writing
  button of an empty document.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/visual/capture_comment_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-008
- SwRS-MDOKFSTUDIO-LAYOUT-009
- SwRS-MDOKFSTUDIO-LAYOUT-010
---

## The first element starts 40 px below the top

### Normative behavior

When a document opens in read mode or in edit mode, the extension SHALL start its first element, whatever the element is, 40 px below the top of the pane as a top margin of that element, including the frame of an open first-block editor with its edition palette on top and the Start writing button of an empty document.

### Scenario (nominal): Paragraph first in read mode
- GIVEN a document whose first element is a paragraph, read mode, 900 px pane
- WHEN the preview is rendered
- THEN the paragraph starts 40 px (within 4 px) below the top of the pane

### Scenario (nominal): Elements with their own margin in read mode
- GIVEN documents that open with an h1, an h2, an h3, a table, an image, an admonition, a properties table or a schema properties table
- WHEN each preview is rendered
- THEN each first element starts 40 px (within 4 px) below the top, and the column itself has no 40 px padding and does not move

### Scenario (nominal): Edit mode
- GIVEN edit mode on and a document whose first element is a paragraph, then one that opens with an h1, h2 or h3, then one whose first element is an image, an admonition, a table or a properties table
- WHEN the preview is rendered
- THEN the first element starts 40 px (within 4 px) below the top in each case

### Scenario (nominal): Open first-block editor
- GIVEN edit mode on, a wide pane (900 px) and the first paragraph opened in its editor
- WHEN the frame is rendered
- THEN the frame, with the palette on top, starts 40 px (within 4 px) below the top and the palette starts at the height of the editor frame

### Scenario (boundary): Other first blocks and the Start writing button
| Input | Outcome |
| --- | --- |
| The first block is an h1, h2, h3, an image or an admonition and is opened in its editor | The frame starts 40 px (within 4 px) below the top |
| An empty document, edit mode on, Margin width mode, light and dark themes | The Start writing button starts 40 px (within 4 px) below the top |
| The same empty document in Auto and in Full width | The button still starts 40 px (within 4 px) below the top |

### Known issues
- Known issue: CHANGELOG entry 0.2.1 still quotes superseded margins (56 px for the first-block editor, 24 px for Start writing, a 24 px margin for the button); the uniform 40 px of the Unreleased entry replaces them.
- Known issue: Only visual scenarios check the edit-mode half; no unit test differs between the modes.
- Known issue: Palette sticking and mode belong to the palette requirements; only the position of the frame is specified here.

### Verification notes
- Method: test/core/preview/previewStyles.test.ts (paragraph first, elements with their own margin, open first-block editor): the unit test of the first-child rule (and the absence of 40 px column padding) and of the first-block editor margin rule.
- Method: test/visual/capture_comment_checks.py (all scenarios): the first-element gap visual checks of the family v10 to v65 in read mode, the edit-mode half, the frame (v10 to v20, v24 to v29, v50) and the empty state (v39 to v41, v54, v59 and v62).
- Criteria: The first child of the content column has margin-top 40 px and measures 40 px (within 4 px) from the top; the frame record measures 40 px within 4 px from the top in the visual checks; the measured top of the Start writing button is 40 px within 4 px in every case.
