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
scenarios:
- id: S1
  title: Copy a selection verbatim
- id: S2
  title: Copy a selection that an edge cuts inside a construct
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

### Main paths

#### Path S1: Copy a selection verbatim

1. The preview shows a render of the document
   - SwRS-MDOKFSTUDIO-BLOCK-271: the host gives the page the source text of that render
2. The page holds the source text of the render
   - SwRS-MDOKFSTUDIO-BLOCK-272: the raw copy takes over the copy of a native selection
   - Option SwRS-MDOKFSTUDIO-BLOCK-272 (boundary): a text control, a block selection or a selection only in chrome keep the browser's copy
3. The reader copies a selection
   - SwRS-MDOKFSTUDIO-BLOCK-273: each edge of the selection maps to a character of the source and the cut is verbatim
   - Option SwRS-MDOKFSTUDIO-BLOCK-274 (nominal): generated content and included blocks are copied whole
   - Option SwRS-MDOKFSTUDIO-BLOCK-275 (nominal): select all and copy gives the whole source
   - Option SwRS-MDOKFSTUDIO-BLOCK-276 (boundary): interface chrome and the text of an old-side card never enter the copy
4. The cut is made
   - SwRS-MDOKFSTUDIO-BLOCK-277: the clipboard gets the Markdown as plain text and the rendered selection as HTML
5. The clipboard holds the Markdown under the selection

#### Path S2: Copy a selection that an edge cuts inside a construct

1. The reader copies a selection that an edge cuts inside a construct
   - SwRS-MDOKFSTUDIO-BLOCK-278: the raw copy balances its edges when the opt-in setting is on
   - Option SwRS-MDOKFSTUDIO-BLOCK-278 (nominal): with the setting off the cut stays verbatim
2. The edge falls inside a construct
   - SwRS-MDOKFSTUDIO-BLOCK-279: an inline construct is balanced with its delimiters
   - Option SwRS-MDOKFSTUDIO-BLOCK-280 (nominal): a container gets its opening and closing lines
   - Option SwRS-MDOKFSTUDIO-BLOCK-281 (nominal): a code block gets its fences
   - Option SwRS-MDOKFSTUDIO-BLOCK-282 (nominal): a table is copied as whole rows or as one cell
   - Option SwRS-MDOKFSTUDIO-BLOCK-283 (nominal): a list item keeps its marker and a shifted indentation
   - Option SwRS-MDOKFSTUDIO-BLOCK-284 (nominal): a heading keeps its marker or its underline
   - Option SwRS-MDOKFSTUDIO-BLOCK-285 (nominal): a definition, an HTML block or a footnote is balanced
   - Option SwRS-MDOKFSTUDIO-BLOCK-286 (boundary): an edge the alignment cannot place snaps to its whole element
3. The cut is made
   - SwRS-MDOKFSTUDIO-BLOCK-277: the clipboard gets the Markdown as plain text and the rendered selection as HTML
4. The clipboard holds the Markdown under the selection

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
