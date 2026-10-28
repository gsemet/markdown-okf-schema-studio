---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-023
uuid: fa4714cc-9f92-4a16-8606-54097bee0c8a
title: Auto width lets wide blocks break out of the column
description: When the width mode is Auto, the extension SHALL widen a table,
  figure, image, code block or Mermaid diagram that is wider than the text
  column to the width it needs, up to the available area, centred on that area,
  measuring it again whenever the layout may have changed.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/scrollCore.ts
- src/page/modules/widthMode.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/diagReq.layout.requirements.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/capture_layout_checks.py
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

When the width mode is Auto, the extension SHALL widen a table, figure, image, code block or Mermaid diagram that is wider than the text column to the width it needs, up to the available area, centred on that area, measuring it again whenever the layout may have changed.

### Scenario (nominal): Wide table and oversized block
- GIVEN Auto mode, a column of 700 px, a pane of 1000 px, a table needing 900 px and a code block needing 1600 px
- WHEN the elements are measured
- THEN the table gets a breakout of 200 px; the code block is capped at the available area, a breakout of 268 px (1000 minus 32 gutters minus 700); an element not wider than the column is not marked

### Scenario (nominal): Column off the pane centre
- GIVEN the column starts 120 px from the pane edge so that it is 30 px off the pane centre
- WHEN the elements are measured
- THEN the breakout shift is 30 px, so the wide element is centred on the available area, and a narrow element keeps an empty shift

### Scenario (nominal): Table-of-contents column
- GIVEN Auto mode, TOC reserve 256 px, a pane of 1000 px, a column of 400 px starting at 100 px and a table needing 1600 px
- WHEN the elements are measured
- THEN the available area is 712 px, the breakout is 312 px and the shift is 72 px, because the open table-of-contents column of 256 px is excluded from the available area, from the centre of the breakout and from the cap
- AND when the TOC reserve is 0 (closed, or pane under 760 px) the available area is the pane minus the 32 px gutters

### Scenario (nominal): Table measured uncapped and rounded up
- GIVEN a table whose scroll width is 900 and whose box is 900.4 px wide, in a 700 px column
- WHEN the width mode is set to Auto
- THEN the breakout is 201 px, not 200 px, so that no cell wraps in the broken-out table
- AND during the measurement the table carries data-sphinx-preview-measuring, which lifts its max-width, and the attribute is removed afterwards

### Scenario (nominal): Table with row handles in edit mode
- GIVEN Auto mode, edit mode, a column of 700 px, a pane of 1000 px and a table carrying data-okf-row-handles that needs 1600 px
- WHEN the elements are measured
- THEN the breakout is 232 px (1000 minus two 34 px handle gutters minus 700), so the table keeps room for its row handles on its left and never takes the row shift
- AND the measurement lifts the !important row-handle cap too, so the measured width, the breakout and the scroll position stay stable while the reader scrolls

### Scenario (refusal): Elements kept in the column
| Input | Outcome |
| --- | --- |
| A wide table marked data-sphinx-preview-editing in Auto mode | Not marked wide; keeps the column width while its editor is open |
| An image whose data-okf-width is 50% | Not marked wide |
| An image whose data-okf-width is 20em | Not marked wide |
| An image whose data-okf-width is 3rem | Not marked wide |

### Scenario (boundary): Author pixel width and a gain of 1 px
| Input | Outcome |
| --- | --- |
| Image with data-okf-width 800 and intrinsic width 3000 px, in a 700 px column | Breakout based on 800 px, so 100 px |
| Element 701 px wide in a 700 px column | Not marked wide |
| Element as wide as the column, or 1 px wider, measured after a resize | Not marked wide |

### Scenario (nominal): Measured again when the layout changes
| Input | Outcome |
| --- | --- |
| Auto mode with a wide table and the window is resized | The table is measured again and is marked wide with its breakout |
| A content patch, an image load, a toolbar collapse, a table-of-contents toggle or a change of the edited element | The wide elements are measured again |

### Scenario (boundary): Several triggers in one frame

| Input | Outcome |
| --- | --- |
| Five resizes, image loads or content-size changes before the next animation frame | The layout work (wide tables, width mode, measure, anchor, sticky headings) runs once in that frame |
| A trigger after the frame ran | A new frame is asked for |

### Known issues
- Known issue: Only top-level blocks, or the paragraph holding only an image, break out.
- Known issue: No visual scenario combines the open table-of-contents column with Auto; the TOC case is a unit test only, and the TOC column itself belongs to the toolbar requirements.
- Known issue: The relative-size (%, em, rem) exclusion has no test.
- Known issue: Neither the declared-pixel-width path nor the 1 px tolerance has a test in the earlier suite; the Mermaid wrapper path is not directly tested either.
- Known issue: The re-measure after a content patch, an image load and a table-of-contents toggle has no unit test (the content patch test builds the runtime but asserts nothing about width).
- Known issue: An element entering edit loses its mark through a mutation observer; the unit test covers the start-up and resize path.

### Verification notes
- Method: test/page/runtimePageControls.test.ts (wide table and oversized block, column off the centre, table-of-contents column, uncapped table, elements kept in the column, resize): unit tests T10 only elements wider than the column are flagged; T10b a wide element is centred on the available area; T10b a narrow element is not flagged; T10b with the TOC open the available area, its centre and the cap exclude the TOC column (the reserve is published by the CSS for panes of 760 px and more); T10b a wide table gets its fractional max-content width rounded up, so no cell wraps; T10b a table with row handles keeps their room left of it when it breaks out; T10 the saved width mode applies at startup and an edited element keeps the column. The relative-size path is verified by inspection of widthMode.ts; the stabilizeLayout, content patch and toolbar callbacks are verified by inspection.
- Method: test/page/runtimeScroll.test.ts (Several triggers in one frame): unit test `P-08: layout triggers within one frame measure the page once`.
- Method: test/page/diagReq.layout.requirements.test.ts (author pixel width and a gain of 1 px): unit test `Auto measures an image from the width its author wrote, and ignores a gain of 1 px or less`.
- Method: test/core/preview/previewStyles.test.ts (table with row handles): unit test `T10: the auto measure lifts every cap, the row-handle one included`.
- Method: test/visual/capture_layout_checks.py (wide table and oversized block): visual checks with a minimum margin of 15 px from the pane edge, and visual scenario v84 (table uncapped and rounded up).
- Criteria: Breakout equals the needed width minus the column, capped at the pane minus the TOC reserve minus 32 px (312 px and shift 72 px in the tested TOC layout); the breakout is the ceiling of the largest of scroll width, declared width, intrinsic width and box width, minus the column; marked elements never include an element under edit or a relative-sized figure; no mark for a gain of 1 px or less (breakout 100 px for the declared case); every listed event calls the width update.
