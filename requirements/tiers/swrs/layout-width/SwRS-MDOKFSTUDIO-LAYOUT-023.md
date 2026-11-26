---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-023
uuid: fa4714cc-9f92-4a16-8606-54097bee0c8a
title: Auto width lets wide blocks break out of the column
description: When the width mode is Auto, the extension SHALL widen a top-level
  table, figure, image, code block or Mermaid diagram (a direct child of the
  page content, or an image alone in a top-level paragraph) that is wider than
  the text column to the width it needs (a code block until its longest line
  fits, its border and a caption bar included, so that it scrolls only beyond
  the available area), up to the available area, centred on that area, measuring
  it again whenever the layout may have changed; a block nested in a list item,
  admonition, block quote, tab set, dropdown or card keeps the layout it has in
  Margin.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
scenarios:
- id: S1
  title: Wide table and oversized block
- id: S2
  title: Column off the pane centre
- id: S3
  title: Table-of-contents column
- id: S4
  title: Elements kept in the column
- id: S5
  title: Author pixel width and a gain of 1 px
- id: S6
  title: Measured again when the layout changes
- id: S7
  title: Re-measure keeps the sideways scroll
- id: S8
  title: A code block fits its longest line
- id: S9
  title: Nested blocks keep their Margin layout
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/scrollCore.ts
- src/page/modules/widthMode.ts
tested_in_files:
- test/core/preview/previewStylesGutter.test.ts
- test/page/codeBlockBreakout.test.ts
- test/page/diagReq.layout.requirements.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/page/tableBreakout.test.ts
- test/page/widthModeScenarios.test.ts
- test/visual/capture_layout_checks.py
- test/visual/capture_width_scroll.py
- test/visual/widthScrollScenarios.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-024
- SwRS-MDOKFSTUDIO-LAYOUT-025
- SwRS-MDOKFSTUDIO-LAYOUT-026
- SwRS-MDOKFSTUDIO-LAYOUT-027
- SwRS-MDOKFSTUDIO-LAYOUT-031
---

## Auto width lets wide blocks break out of the column

### Normative behavior

When the width mode is Auto, the extension SHALL widen a top-level table, figure, image, code block or Mermaid diagram (a direct child of the page content, or an image alone in a top-level paragraph) that is wider than the text column to the width it needs (a code block until its longest line fits, its border and a caption bar included, so that it scrolls only beyond the available area), up to the available area, centred on that area, measuring it again whenever the layout may have changed; a block nested in a list item, admonition, block quote, tab set, dropdown or card keeps the layout it has in Margin.

### Scenario S1 (nominal): Wide table and oversized block
- GIVEN Auto mode, a column of 700 px, a pane of 1000 px, a table needing 900 px and a code block needing 1600 px
- WHEN the elements are measured
- THEN the table gets a breakout of 200 px; the code block is capped at the available area, a breakout of 268 px (1000 minus 32 gutters minus 700); an element not wider than the column is not marked

### Scenario S2 (nominal): Column off the pane centre
- GIVEN the column starts 120 px from the pane edge so that it is 30 px off the pane centre
- WHEN the elements are measured
- THEN the breakout shift is 30 px, so the wide element is centred on the available area, and a narrow element keeps an empty shift

### Scenario S3 (nominal): Table-of-contents column
- GIVEN Auto mode, TOC reserve 256 px, a pane of 1000 px, a column of 400 px starting at 100 px and a table needing 1600 px
- WHEN the elements are measured
- THEN the available area is 712 px, the breakout is 312 px and the shift is 72 px, because the open table-of-contents column of 256 px is excluded from the available area, from the centre of the breakout and from the cap
- AND when the TOC reserve is 0 (closed, or pane under 760 px) the available area is the pane minus the 32 px gutters

### Scenario S4 (refusal): Elements kept in the column
| Input | Outcome |
| --- | --- |
| A wide table marked data-sphinx-preview-editing in Auto mode (its source editor is open) | Not marked wide; keeps the column width while its source editor is open |
| A wide table holding an editor field other than a cell editor | Not marked wide; keeps the column width |
| An image whose data-okf-width is 50% | Not marked wide |
| An image whose data-okf-width is 20em | Not marked wide |
| An image whose data-okf-width is 3rem | Not marked wide |

### Scenario S5 (boundary): Author pixel width and a gain of 1 px
| Input | Outcome |
| --- | --- |
| Image with data-okf-width 800 and intrinsic width 3000 px, in a 700 px column | Breakout based on 800 px, so 100 px |
| Element 701 px wide in a 700 px column | Not marked wide (a table, image or diagram, or a code block whose code does not overflow; an overflowing code block, see the code block scenario) |
| Element as wide as the column, or 1 px wider, measured after a resize | Not marked wide; for a code block, not marked unless its code overflows |

### Scenario S6 (nominal): Measured again when the layout changes
| Input | Outcome |
| --- | --- |
| Auto mode with a wide table and the window is resized | The table is measured again and is marked wide with its breakout |
| A content patch, an image load, a toolbar collapse, a table-of-contents toggle or a change of the edited element | The wide elements are measured again |
| An editor opens or closes on a top-level block that cannot break out (a paragraph, a heading, a list) | Nothing is measured again: no verdict can change |

### Scenario S7 (nominal): Re-measure keeps the sideways scroll
- GIVEN Auto mode and a wide table that the reader scrolled sideways
- WHEN a layout pass measures it again (a cell editor closes, the pane is resized, an image loads)
- THEN its scrollLeft is kept, clamped to the new maximum scroll (scroll width minus box width)
- AND when the breakout width changes the table keeps the same pixel offset, clamped, not a proportional one

### Scenario S8 (nominal): A code block fits its longest line

| Input | Outcome |
| --- | --- |
| Auto, 700 px column, 1000 px pane, a top-level code block with a 1 px border whose `pre` is 698 px inside and 760 px of content | Breakout 62 px (762 − 700): after the pass `scrollWidth` equals `clientWidth`, no scroll bar |
| The same block captioned (a figure with the `pre` and its caption bar), 800 px of content | The figure breaks out by 102 px and the caption bar has the block's width |
| A code block whose content overflows by 1 px | Marked wide with a breakout of 1 px (an overflowing code block has no 1 px tolerance) |
| A code block that fits, with a fractional box width (700.4 px in a 700 px column) | Not marked wide, not shifted |
| A code block of 1600 px of content | Capped at the available area (breakout 268 px) and scrolls inside it |

### Scenario S9 (refusal): Nested blocks keep their Margin layout

| Input | Outcome |
| --- | --- |
| Auto, a code block inside a list item, wider than the item | Neither the block, the item nor the list is marked wide or shifted; the block scrolls inside the item as in Margin |
| Auto, a wide table inside an admonition | Neither the table nor the admonition is marked wide |
| Auto, a wide image alone in a paragraph inside a block quote | Neither the image, the paragraph nor the block quote is marked wide |
| Auto, a wide code block inside a card or a tab panel | Not marked wide |

### Several triggers in one frame (verification note)

Five resizes, image loads or content-size changes before the next animation frame run the layout work (wide tables, width mode, measure, anchor, sticky headings) once in that frame, and a trigger after the frame ran asks for a new frame. This is checked by test/page/runtimeScroll.test.ts (`P-08: layout triggers within one frame measure the page once`).

### Known issues
- Known issue: A linked image alone in a top-level paragraph is not widened. A top-level paragraph holding no text and several images, at least one of them not wrapped in a link or another element, is measured and marked as a whole, once, from its first image's sizes, so a wide image after a narrow first one does not widen it.
- Known issue: No visual scenario combines the open table-of-contents column with Auto; the TOC case is a unit test only, and the TOC column itself belongs to the toolbar requirements.
- Known issue: The re-measure after a content patch, an image load and a table-of-contents toggle has no unit test (the content patch test builds the runtime but asserts nothing about width).

### Verification notes
- Method: test/page/runtimePageControls.test.ts (wide table and oversized block, column off the centre, table-of-contents column, elements kept in the column, resize): unit tests T10 only elements wider than the column are flagged; T10b a wide element is centred on the available area; T10b a narrow element is not flagged; T10b with the TOC open the available area, its centre and the cap exclude the TOC column (the reserve is published by the CSS for panes of 760 px and more); T10b a wide table gets its fractional max-content width rounded up, so no cell wraps; T10b a table with row handles keeps their room left of it when it breaks out; T10b a layout pass in Auto keeps the sideways scroll of a wide table (re-measure keeps the sideways scroll); T10 the saved width mode applies at startup and an edited element keeps the column. The relative-size path is verified by inspection of widthMode.ts; the stabilizeLayout, content patch and toolbar callbacks are verified by inspection.
- Method: test/page/runtimePageControls.test.ts (A code block fits its longest line, and the gain of 1 px): unit tests `T10b: a code block that breaks out is widened by its border too`, `T10b: a captioned code block breaks out through its inner code`, `T10b: a code block that overflows by 1 px still breaks out, a table that gains 1 px does not`, `T10b: a code block that fits is not marked at a fractional width`, `T10b: a code block wider than the available area is capped` and `T10b: a Mermaid figure is not a code block`.
- Method: test/page/runtimePageControls.test.ts (Nested blocks keep their Margin layout): unit tests `T10b: a code block inside a list item is not measured` and `T10b: a wide block nested in a container is not measured` (a table, an image alone in a paragraph and a code block, each inside a container faked by its tag).
- Method: test/page/codeBlockBreakout.test.ts (A code block fits its longest line, in a real browser on the rendered page and the shipped stylesheet): plain, numbered, diff, captioned and list-item blocks from 70 to 160 characters and one of 300, in Margin, Auto and Full width, with each code block setting off, at 125 % display scaling and with the table of contents open: a block that fits the available area has no horizontal scroll bar, a block that fits the column is not marked or shifted, a wider one is capped and scrolls. The list-item blocks check S9 (Nested blocks keep their Margin layout): not marked, and scrolling as in Margin.
- Method: test/page/tableBreakout.test.ts (measured again when the layout changes, in a real browser): `an editor opened on a paragraph does not measure the tables again; one opened on a table does`.
- Method: test/page/runtimeScroll.test.ts (Several triggers in one frame): unit test `P-08: layout triggers within one frame measure the page once`.
- Method: test/page/diagReq.layout.requirements.test.ts (author pixel width and a gain of 1 px): unit test `Auto measures an image from the width its author wrote, and ignores a gain of 1 px or less`.
- Method: test/visual/capture_layout_checks.py (wide table and oversized block): visual checks with a minimum margin of 15 px from the pane edge, and visual scenario v84 (table uncapped and rounded up).
- Method: test/visual/capture_width_scroll.py (re-measure keeps the sideways scroll): visual scenario v91 (Auto, edit mode, 656 px: the wide table scrolled to its end keeps its scrollLeft after a cell editor closes and after a 3 px pane resize).
- Method: test/page/widthModeScenarios.test.ts (relative sizes, Mermaid wrapper, layout triggers): images sized 50%, 20em and 3rem are not marked wide; a Mermaid diagram wrapper wider than the column breaks out; a pane resize and the toolbar collapse measure again. The content patch, the image load and the table-of-contents toggle reach the same measure by call (contentPatch.ts, scrollCore.ts, runtime.ts) and are checked by inspection. The declared pixel width and the 1 px tolerance are tested in test/page/diagReq.layout.requirements.test.ts.
- Criteria: The table cases (uncapped and rounded up, row handles, cell editor) are specified in SwRS-MDOKFSTUDIO-LAYOUT-044. Breakout equals the needed width minus the column, capped at the pane minus the TOC reserve minus 32 px (312 px and shift 72 px in the tested TOC layout); the breakout is the ceiling of the largest of scroll width, declared width, intrinsic width and box width, minus the column; for a code block (a top-level `pre`, or a `figure` whose direct child is a `pre`) the largest also includes the wrapper's box width minus the code box's client width plus its scroll width; only a direct child of the content is ever measured, a paragraph only when it holds no text and an image is its direct child (once, with the declared, intrinsic and relative sizes of its first image, linked or not; see Known issues); a nested element is never marked, and no other nested element gets a container measured; marked elements never include an element whose source editor is open or a relative-sized figure, but do include a table whose cell editor is open, at the width it had before the editor opened (the same in every cell the editor moves to, and not marked when it fitted the column); no mark for a gain of 1 px or less (breakout 100 px for the declared case), except a code block whose code overflows, marked from a gain of 1 px; after the pass a code block that fits the available area has `scrollWidth <= clientWidth`; every listed event calls the width update; a re-measure leaves a sideways scroll at the same pixel offset, clamped to the new maximum.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LAYOUT-024](SwRS-MDOKFSTUDIO-LAYOUT-024.md): Auto width excludes the open table-of-contents column
  - [SwRS-MDOKFSTUDIO-LAYOUT-025](SwRS-MDOKFSTUDIO-LAYOUT-025.md): Auto measures a wide table uncapped and rounds up
  - [SwRS-MDOKFSTUDIO-LAYOUT-026](SwRS-MDOKFSTUDIO-LAYOUT-026.md): Auto leaves edited and relatively sized elements in the column
  - [SwRS-MDOKFSTUDIO-LAYOUT-027](SwRS-MDOKFSTUDIO-LAYOUT-027.md): Auto uses the author's pixel width for an image breakout
  - [SwRS-MDOKFSTUDIO-LAYOUT-031](SwRS-MDOKFSTUDIO-LAYOUT-031.md): Auto measures wide elements again when the layout changes
<!-- okf:links:end -->
