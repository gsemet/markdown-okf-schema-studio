---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-007
uuid: 26f2fafa-d9a4-4e65-a469-ac1309c82ef7
title: A writer inserts links, images, figures, tables, colours and emoji
  through pickers
description: When a writer asks for a link, an image, a figure, a table, a
  colour or an emoji from the palette, the Studio SHALL open a picker for it and
  write the matching safe Markdown at the selection, replacing the selection or
  the existing link, and leave the rest of the source of an existing figure
  untouched.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I create or fix a link by filling two fields, add
  pictures from the file system, adjust a figure without hand-editing its
  options, highlight text with a colour, add emoji from a picker and create a
  table of the size I need by pointing at a grid, without typing the syntax or
  looking up codes.
derived_by:
- SwRS-MDOKFSTUDIO-PALETTE-031
- SwRS-MDOKFSTUDIO-PALETTE-036
- SwRS-MDOKFSTUDIO-PALETTE-058
- SwRS-MDOKFSTUDIO-PALETTE-069
- SwRS-MDOKFSTUDIO-PALETTE-072
- SwRS-MDOKFSTUDIO-PALETTE-078
- SwRS-MDOKFSTUDIO-PALETTE-089
- SwRS-MDOKFSTUDIO-PALETTE-092
- SwRS-MDOKFSTUDIO-PALETTE-109
- SwRS-MDOKFSTUDIO-PALETTE-150
- SwRS-MDOKFSTUDIO-PALETTE-153
- SwRS-MDOKFSTUDIO-PALETTE-160
- SwRS-MDOKFSTUDIO-PALETTE-192
- SwRS-MDOKFSTUDIO-PALETTE-263
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## A writer inserts links, images, figures, tables, colours and emoji through pickers

### Normative behavior

When a writer asks for a link, an image, a figure, a table, a colour or an emoji from the palette, the Studio SHALL open a picker for it and write the matching safe Markdown at the selection, replacing the selection or the existing link, and leave the rest of the source of an existing figure untouched.

### Preserved stakeholder intent

Writers expect a picker to do the syntax work and to refuse what would not render.

As a writer, I create or fix a link by filling two fields, add pictures from the file system, adjust a figure without hand-editing its options, highlight text with a colour, add emoji from a picker and create a table of the size I need by pointing at a grid, without typing the syntax or looking up codes.

### Rationale and constraints

- The link panel starts from the selection or from the link around the caret, with the text and the address of the link.
- The written link is safe: brackets, angle brackets, spaces and parentheses cannot break it.
- The picked image must lie inside a workspace folder; the reference is relative to the document.
- A figure form refuses values the renderer would not accept and shows why, and edits the options of an existing figure in a form that leaves the rest of the source untouched.
- Colours are written as markup the preview keeps; nothing is written that the sanitizer would strip.
- A colour code in the text can be changed in place from a swatch.
- The table picker lets the writer choose the number of rows and columns on a grid; the table that is written, and the other table actions, are specified with the table editing requirements.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-PALETTE-031](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-031.md): Palette popovers open in the frame, one at a time, and Escape or typing closes them
  - [SwRS-MDOKFSTUDIO-PALETTE-036](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-036.md): Leaving the frame from a palette control saves once and a press keeps the text box focus
  - [SwRS-MDOKFSTUDIO-PALETTE-058](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-058.md): The Colour picker wraps the selection in a safe colour span
  - [SwRS-MDOKFSTUDIO-PALETTE-069](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-069.md): The Colour code button edits a colour code at the caret
  - [SwRS-MDOKFSTUDIO-PALETTE-072](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-072.md): The Emoji picker filters and inserts one pictograph
  - [SwRS-MDOKFSTUDIO-PALETTE-078](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-078.md): The Table button opens a 9 by 9 size grid and inserts a table of the chosen size
  - [SwRS-MDOKFSTUDIO-PALETTE-089](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-089.md): The Link button opens a labelled link panel prefilled from the selection
  - [SwRS-MDOKFSTUDIO-PALETTE-092](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-092.md): The link panel writes a safe inline Markdown link
  - [SwRS-MDOKFSTUDIO-PALETTE-109](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-109.md): The Image button inserts or replaces an image reference
  - [SwRS-MDOKFSTUDIO-PALETTE-150](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-150.md): Figure writes a figure directive for a picked image
  - [SwRS-MDOKFSTUDIO-PALETTE-153](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-153.md): The figure form edits the options of a figure and checks them
  - [SwRS-MDOKFSTUDIO-PALETTE-160](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-160.md): Apply rewrites the figure directive in one minimal edit
  - [SwRS-MDOKFSTUDIO-PALETTE-192](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-192.md): The host image picker answers a path relative to the document
  - [SwRS-MDOKFSTUDIO-PALETTE-263](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-263.md): Slash commands have short alternative names
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->
