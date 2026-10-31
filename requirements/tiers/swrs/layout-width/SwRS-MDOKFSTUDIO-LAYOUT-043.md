---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-043
uuid: 30f9146a-25f8-4285-baf4-558726ce1434
title: Body text keeps clear of the floating toolbar
description: When the floating toolbar overlaps the text column at the top of a
  document whose first block is running text (not an interactive first element
  nor a box), the extension SHALL make the text of the first blocks wrap outside
  the toolbar rectangle and SHALL start every other top-level block within the
  toolbar's reach below that rectangle, and SHALL reserve nothing when the
  toolbar sits beside the column.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/preview/styles/contentLayoutStyles.ts
- src/page/modules/firstClearance.ts
tested_in_files:
- test/page/modules/firstClearance.test.ts
- test/visual/toolbarFloatScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Body text keeps clear of the floating toolbar

### Normative behavior

When the floating toolbar overlaps the text column at the top of a document whose first block is running text (not an interactive first element nor a box), the extension SHALL make the text of the first blocks wrap outside the toolbar rectangle and SHALL start every other top-level block within the toolbar's reach below that rectangle, and SHALL reserve nothing when the toolbar sits beside the column.

- Running text is a paragraph, a heading, a list or a definition list. Every other top-level block is a box: a table, a figure, an image-only paragraph, a code block, an admonition, an aside, a blockquote, a details block, a grid or card, a tab set, a diagram, a math block, a rule, an open block editor frame (with its palette) and any other block the renderer adds later. Edit-mode insert points, label anchor rows, comment chips and hidden or folded blocks are neither: they never move.
- The rule is the same in every width mode (Margin, Auto, Full width) and at every pane width where the toolbar overlaps the column: in Full width mode that is every width, in Margin and Auto up to about 1100 px with the expanded toolbar.
- The interactive first elements keep their own remedy (SwRS-MDOKFSTUDIO-LAYOUT-011) and no float is added. A first block that is a box keeps its 40 px gap (SwRS-MDOKFSTUDIO-LAYOUT-007) and no float is added either.
- A top-level heading clears an image, figure or table aligned left or right (MyST `:align:` or the HTML `align` attribute) before it, never the toolbar float.

### Scenario (nominal): Expanded toolbar over a narrow column
- GIVEN a 393 px pane whose column content box runs from 31 to 362 px, the expanded floating toolbar from 277 to 379 px and from 12 to 178 px, and a heading followed by a paragraph and a note as the first blocks
- WHEN the page is laid out
- THEN --sphinx-preview-toolbar-float-width is 93 px (362 minus 277 plus 8) and --sphinx-preview-toolbar-float-height is 186 px (178 plus 8, from the content top), an invisible right float of that size sits at the top of the column, and no text line of the heading or of the first paragraph intersects the toolbar
- AND below the float the text takes the full column width again, and the heading keeps its 40 px gap

### Scenario (nominal): A box near the top starts below the toolbar
- GIVEN a 900 px pane in Auto width mode where the expanded toolbar overlaps the column, a heading, a one-line paragraph and a small table
- WHEN the page is laid out
- THEN the paragraph starts beside the toolbar, and the table starts at or below the toolbar's bottom edge, centred on the column
- AND an open block editor of a paragraph within the toolbar's reach (not the first block) starts below the toolbar, so its edition palette, which sticks under the toolbar's bottom edge, never covers the frame

### Scenario (nominal): Measured in document coordinates and for any toolbar state
| Input | Outcome |
| --- | --- |
| A column whose content box ends at 377 px, a toolbar from 277 px and from 12 to 178 px | Width 108 px and height 186 px |
| The same column scrolled by 300 px | Width 108 px and height 186 px: the float stays at the top of the document, so text scrolled under the fixed toolbar is not moved |
| A collapsed toolbar from 337 to 379 px and from 12 to 54 px over the same column | Width 48 px and height 62 px |

### Scenario (boundary): Toolbar beside the column
- GIVEN a column from 100 to 700 px and a toolbar that starts at 800 px
- WHEN the page is laid out
- THEN both properties are 0 px and nothing is reserved

### Scenario (boundary): No float
| Situation | Outcome |
| --- | --- |
| An open first-block editor | Float width and height 0 px; the first-block editor keeps its inset or clearance |
| The Start writing button, visible or hidden by the editor that replaced it | Float width and height 0 px; the button keeps its clearance |
| A leading properties table | Float width and height 0 px; the table keeps its inset or clearance |
| A first block that is a box (a table, a note, a figure) | Float width and height 0 px; the box keeps its 40 px gap |
| A toolbar nearer the column's left edge than its right edge | Float width and height 0 px: the float is on the physical right, like the toolbar |
| A document with an image, figure or table aligned left or right anywhere | No float and no box moves: the document keeps its previous layout |

### Scenario (nominal): Headings clear aligned tables and images
- GIVEN a table with `align="right"` and later one with `align="left"`, each followed by a short paragraph and a heading
- WHEN the page is laid out
- THEN each paragraph wraps beside its table and each heading starts below the table before it

### Known issues

- Known issue: Only text lines wrap: the border of a heading (the h1 rule) that starts beside the float still runs under the toolbar.
- Known issue: A box within the toolbar's reach leaves a blank band beside the float above it.
- Known issue: When the document's first block is a box (a table, an image, a note, a code block...), it keeps its 40 px gap (SwRS-MDOKFSTUDIO-LAYOUT-007, unchanged) and no float is added, so the text after it can still run under the toolbar, as before this requirement.
- Known issue: When the page holds any image, figure or table aligned left or right (MyST `:align:` or the HTML `align` attribute), no float is added on the whole page, so the text near the top can still run under the toolbar, as before this requirement. A rule limited to the blocks near the aligned element made the rendering-core visual scenario v20 (a huge document) time out; the precise rule is a backlog follow-up.
- Known issue: An opened review comment panel near the top keeps its place, so opening a comment never moves the page: its text wraps around the toolbar, but its border and tint may run under the toolbar, like the underline of a heading.
- Known issue: An image aligned with the HTML `align` attribute in a Markdown file loses the attribute when rendered (`mystRawHtml.ts` keeps `align` on div, p, center, hr and headings only; tables keep it by another path), so the image case is covered by the CSS only, not by a visual test.

### Verification notes

- Method: Unit tests "CR 226: ..." in test/page/modules/firstClearance.test.ts (published properties for an overlapping narrow column, a scrolled page, a collapsed toolbar, a toolbar beside the column, a toolbar on the left, each interactive first element, a box first and a hidden float); visual scenarios in test/visual/toolbarFloatScenarios.ts: layout-width/v88-toolbar-float-first-lines-cream-393 (text wraps), layout-width/v89-toolbar-float-box-below-reach-cream-900 (a table below the toolbar, centred), layout-width/v90-heading-clears-raw-align-light-900 (headings clear aligned tables); palette-slash/v28-palette-clears-text-rule-cream-900 (an editor frame below the palette) and the first-gap scenarios of layout-width (a box first keeps its 40 px gap).
- Criteria: The published width and height match the toolbar rectangle inside the column plus the 8 px margin, 0 px in the No float cases; in the headless pages, no client rectangle of the first paragraph's or the heading's text intersects the toolbar, the table's top is at or below the toolbar's bottom and its centre within 2 px of the column's, and each heading's top is at or below the bottom of the aligned table before it.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-004](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-004.md): The first element starts clear of the top and of the floating toolbar
<!-- okf:links:end -->
