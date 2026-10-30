---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-257
uuid: a26bf824-d3fe-4b5f-ad20-8bc354a30c47
title: A block editor in a grid card widens the card and keeps the palette above
  a readable text box
description: While a block editor is open in the title, header, body or footer
  of a grid card or a card, the preview SHALL give that card a minimum width
  that pushes the other cards of its grid row aside, show the edition palette in
  the flow above the text box, wider than the card if needed, with a maximum
  height and a vertical scroll, and keep the text box at a readable minimum
  width.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-001
relates_to:
- SwRS-MDOKFSTUDIO-PALETTE-021
- SwRS-MDOKFSTUDIO-TABLE-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/gridCardEditStyles.ts
- src/core/render/mystGridToctree.ts
tested_in_files:
- test/core/preview/gridCardEditStyles.test.ts
- test/visual/gridCardEditingScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A block editor in a grid card widens the card and keeps the palette above a readable text box

### Normative behavior

While a block editor is open in the title, header, body or footer of a grid card or a card, the preview SHALL give that card a minimum width that pushes the other cards of its grid row aside, show the edition palette in the flow above the text box, wider than the card if needed, with a maximum height and a vertical scroll, and keep the text box at a readable minimum width.

### Scenario (nominal): The body of the second card of a three-column grid

- GIVEN edit mode on a 900 px pane with a `{grid} 1 2 3 3` of three `{grid-item-card}`, and the cards narrower than the palette
- WHEN the writer clicks the body of the second card and its block editor opens
- THEN the second card is at least 24em wide and the first and third cards are pushed aside, not overlapped; the edition palette is in the flow above the text box (its bottom is not below the text box top), may extend beyond the card, is at most 9em high (or 30% of the viewport) and scrolls vertically past that height; the text box is at least 18em wide and keeps its typed text visible; the card is not clipped by its rounded border

### Scenario (nominal): The title of a card

- GIVEN the same grid
- WHEN the writer clicks the title of the second card
- THEN the editor of the title opens with the same layout: the card widens, the palette sits above the text box and the text box is readable

### Scenario (boundary): Other editors and layouts are unchanged

- GIVEN a block editor outside a card, a table cell editor, or a grid with the `auto` column count
- WHEN the editor opens
- THEN the palette keeps its sticky placement and its width limit, the table cell keeps its own minimum width (see SwRS-MDOKFSTUDIO-TABLE-006), and the grid keeps its column rules; when the editor closes the cards return to their column widths

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-021: the palette as a toolbar above the editor, which sticks outside a card
- SwRS-MDOKFSTUDIO-TABLE-006: the table cell editor widens its cell in the same way

### Verification notes

- Method: the visual scenarios `block-editing/v23` to `v26` (test/visual/gridCardEditingScenarios.ts) measure the boxes in headless Chromium on the three-card grid, cream and dark, body and title; test/core/preview/gridCardEditStyles.test.ts checks the rules in the preview stylesheet.
- Criteria: palette bottom not below text box top, text box and card at least their minimum widths, neighbours not overlapped, palette with a maximum height and vertical scroll.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-001](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-001.md): A writer switches edit mode and finds it as left
- Relates to:
  - [SwRS-MDOKFSTUDIO-PALETTE-021](../palette-slash/SwRS-MDOKFSTUDIO-PALETTE-021.md): The palette is a toolbar above the editor that sticks over a tall editor
  - [SwRS-MDOKFSTUDIO-TABLE-006](../table-editing/SwRS-MDOKFSTUDIO-TABLE-006.md): The cell text box wraps and fits its text in the block editor font
<!-- okf:links:end -->
