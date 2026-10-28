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
lifecycle: proposed
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
