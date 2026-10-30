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
req_lifecycle: proposed
status: stable
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
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-047](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-047.md): Done, Cmd/Ctrl+Enter or leaving the text box commits the edit
  - [SwRS-MDOKFSTUDIO-CORE-050](../../swrs/rendering-core/SwRS-MDOKFSTUDIO-CORE-050.md): Soft appearance and colour transitions honour reduced motion
  - [SwRS-MDOKFSTUDIO-PALETTE-021](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-021.md): The palette is a toolbar above the editor that sticks over a tall editor
  - [SwRS-MDOKFSTUDIO-PALETTE-031](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
  - [SwRS-MDOKFSTUDIO-PALETTE-036](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-036.md): Leaving the frame from a palette control saves once and a press keeps the text box focus
  - [SwRS-MDOKFSTUDIO-PALETTE-115](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-115.md): Alert inserts a GitHub alert and offers its type list
<!-- okf:links:end -->
