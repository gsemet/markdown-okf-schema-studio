---
type: StRS
id: StRS-MDOKFSTUDIO-BLOCK-027
uuid: de6a86f8-6dff-4331-a319-c3efe0208f61
title: A reader copies a selection as the exact Markdown under it
description: When a reader selects text of the preview with the mouse or the
  keyboard and presses the copy chord, the Studio SHALL put on the clipboard the
  raw Markdown of the source from the character under the selection's start to
  the character under its end, verbatim, and the rendered selection as HTML.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, when I select text in the preview and copy it, I want
  the Markdown written under the selection, formatting included (thematic
  breaks, tables, emphasis, links, directives and fences), so that pasting it
  into a Markdown editor gives the source and not the rendered text.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-271
- SwRS-MDOKFSTUDIO-BLOCK-272
- SwRS-MDOKFSTUDIO-BLOCK-273
- SwRS-MDOKFSTUDIO-BLOCK-274
- SwRS-MDOKFSTUDIO-BLOCK-275
- SwRS-MDOKFSTUDIO-BLOCK-276
- SwRS-MDOKFSTUDIO-BLOCK-277
- SwRS-MDOKFSTUDIO-BLOCK-278
- SwRS-MDOKFSTUDIO-BLOCK-279
- SwRS-MDOKFSTUDIO-BLOCK-280
- SwRS-MDOKFSTUDIO-BLOCK-281
- SwRS-MDOKFSTUDIO-BLOCK-282
- SwRS-MDOKFSTUDIO-BLOCK-283
- SwRS-MDOKFSTUDIO-BLOCK-284
- SwRS-MDOKFSTUDIO-BLOCK-285
- SwRS-MDOKFSTUDIO-BLOCK-286
default_owner_email: gaetan@xeberon.net
---

## A reader copies a selection as the exact Markdown under it

### Normative behavior

When a reader selects text of the preview with the mouse or the keyboard and presses the copy chord, the Studio SHALL put on the clipboard the raw Markdown of the source from the character under the selection's start to the character under its end, verbatim, and the rendered selection as HTML.

### Preserved stakeholder intent

## User Need

As a reader, when I select text in the preview and copy it, I want the Markdown written under the selection, formatting included (thematic breaks, tables, emphasis, links, directives and fences), so that pasting it into a Markdown editor gives the source and not the rendered text.

### Rationale and constraints

- The text control, the block selection and a selection only in chrome keep the browser's copy.
- The cut is verbatim: the Studio does not rewrite or balance it here.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-271](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-271.md): The host gives the page the source text of the render it shows
  - [SwRS-MDOKFSTUDIO-BLOCK-272](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-272.md): The raw copy takes over a native selection except where the browser's copy must stay
  - [SwRS-MDOKFSTUDIO-BLOCK-273](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-273.md): Each edge of a copied selection maps to a character of the source and the cut is verbatim
  - [SwRS-MDOKFSTUDIO-BLOCK-274](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-274.md): A copied selection gives the source of generated content and included blocks whole
  - [SwRS-MDOKFSTUDIO-BLOCK-275](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-275.md): Select all and copy gives the whole source exactly
  - [SwRS-MDOKFSTUDIO-BLOCK-276](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-276.md): A copied selection never holds interface chrome nor the text of an old-side card
  - [SwRS-MDOKFSTUDIO-BLOCK-277](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-277.md): The raw copy puts Markdown as plain text and the rendered selection as HTML
  - [SwRS-MDOKFSTUDIO-BLOCK-278](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-278.md): The raw copy balances its edges only when the opt-in setting is on
  - [SwRS-MDOKFSTUDIO-BLOCK-279](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-279.md): An inline construct cut by an edge is balanced with its delimiters
  - [SwRS-MDOKFSTUDIO-BLOCK-280](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-280.md): A container cut by an edge is balanced with its opening and closing lines
  - [SwRS-MDOKFSTUDIO-BLOCK-281](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-281.md): A code block cut by an edge is balanced with its fences
  - [SwRS-MDOKFSTUDIO-BLOCK-282](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-282.md): A table cut by an edge is copied as whole rows or as one cell
  - [SwRS-MDOKFSTUDIO-BLOCK-283](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-283.md): A list item cut by an edge keeps its marker and a shifted indentation
  - [SwRS-MDOKFSTUDIO-BLOCK-284](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-284.md): A heading cut by an edge keeps its marker or its underline
  - [SwRS-MDOKFSTUDIO-BLOCK-285](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-285.md): A definition, an HTML block or a footnote cut by an edge is balanced
  - [SwRS-MDOKFSTUDIO-BLOCK-286](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-286.md): An edge the alignment cannot place snaps to its whole element
<!-- okf:links:end -->
