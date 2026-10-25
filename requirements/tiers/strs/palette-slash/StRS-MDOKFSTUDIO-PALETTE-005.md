---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-005
uuid: 0bfe6e3d-b330-4b85-b72e-6451154bdaae
title: The palette stays in reach, appears softly and never closes the editor by
  accident
description: While a writer edits a block, the Studio SHALL keep the edition
  palette visible next to the text box, also for a very tall text box and in a
  narrow pane, show it and its menus with a short fade unless the writer prefers
  reduced motion, and keep the editor open with the focus in the text when a
  palette button is pressed or a picker is opened, saving only when the writer
  leaves it.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer of a long block, I always find the palette buttons
  without scrolling back to the top of the block, see menus appear calmly, and
  click palette buttons and pickers without losing my place or ending the edit.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-047
- SwRS-MDOKFSTUDIO-CORE-050
- SwRS-MDOKFSTUDIO-PALETTE-021
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-PALETTE-036
- SwRS-MDOKFSTUDIO-PALETTE-115
---

## The palette stays in reach, appears softly and never closes the editor by accident

### Normative behavior

While a writer edits a block, the Studio SHALL keep the edition palette visible next to the text box, also for a very tall text box and in a narrow pane, show it and its menus with a short fade unless the writer prefers reduced motion, and keep the editor open with the focus in the text when a palette button is pressed or a picker is opened, saving only when the writer leaves it.

### Preserved stakeholder intent

Writers expect the palette to be there when they need it and never to end the edit by itself.

As a writer of a long block, I always find the palette buttons without scrolling back to the top of the block, see menus appear calmly, and click palette buttons and pickers without losing my place or ending the edit.

### Rationale and constraints

- The palette wraps onto several rows in a narrow pane instead of overflowing it.
- A palette that would fill a large part of a short pane stays in the flow of the page instead of sticking.
- The palette stays visible without covering the caret and without moving the text.
- Escape closes an open picker first and only then cancels the editor.
- A native file dialog opened by a button does not count as leaving the editor.
- The soft appearance is also given to the pickers and the slash menu; it is switched on by the first pointer or key press of the page and is part of the general preview motion, and none of the motion is shown if the system asks for less.
