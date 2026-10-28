---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-025
uuid: 1b09a32e-8351-4512-8628-1638b965ea49
title: "The sticky band is fixed, aligned with the column and clear of the toolbar"
description: "When the band is shown, hidden or changes its number of lines, the extension
  SHALL keep it fixed to the top of the pane at full width with no gap above it, outside
  the document flow and ignoring pointer events, with its text aligned to the content
  column, ending before the toolbar and narrowed by the table of contents reserve,
  wrapping a long heading path onto more lines, and draw it flat and bold, ended by
  a one pixel rule."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-004
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/core/preview/styles/pageChromeStyles.ts
- src/page/features/stickyHeadings.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/capture_final_checks.py
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The sticky band is fixed, aligned with the column and clear of the toolbar

### Normative behavior

When the band is shown, hidden or changes its number of lines, the extension SHALL keep it fixed to the top of the pane at full width with no gap above it, outside the document flow and ignoring pointer events, with its text aligned to the content column, ending before the toolbar and narrowed by the table of contents reserve, wrapping a long heading path onto more lines, and draw it flat and bold, ended by a one pixel rule.

### Scenario (nominal): Band grows
- GIVEN a band that goes from one to three lines
- WHEN the band is measured
- THEN its top is 0, its position is fixed and the text below does not shift

### Scenario (nominal): Pointer
- GIVEN the pointer over the band
- WHEN the reader clicks
- THEN the click reaches the content below, because the band ignores pointer events

### Scenario (boundary): Text aligned with the column
| Pane | Outcome |
| --- | --- |
| 900 px in Margin width | the left edges of the band text box and of the content column are equal within 1 px |
| 460 px | their left edges are equal within 1 px |

### Scenario (boundary): Text stops before the toolbar
| Input | Outcome |
| --- | --- |
| toolbar's left edge is left of the column's right edge | the text right edge is the toolbar left edge minus 8 px |
| wide pane where the toolbar is right of the column | the text right edge is the column's right edge |

### Scenario (boundary): Room published for the toolbar
| Input | Outcome |
| --- | --- |
| toolbar grows from collapsed to expanded, then the band position is refreshed | --sphinx-preview-toolbar-width on the band is the new toolbar width plus 22 px |
| no toolbar, or a toolbar whose width is not finite | the variable is 0 px |

### Scenario (boundary): Table of contents reserve
| Input | Outcome |
| --- | --- |
| 900 px pane with the table of contents open | the band is narrowed by 256 px and its right edge is at most the left edge of the column |
| 460 px pane with the button pressed | the band width is not reduced, because the column is hidden |

### Scenario (boundary): Long heading path wraps
- GIVEN a 460 px pane and long headings at depth 3
- WHEN the band is measured
- THEN the band shows more rendered lines than three, its height equals the lines and the document flow does not shift
- WHEN a heading word is wider than the band
- THEN the word breaks anywhere (overflow-wrap anywhere)

### Scenario (nominal): Flat, bold style with a rule
- GIVEN a shown band
- WHEN its style is read
- THEN the font weight is at least 600 and larger than the body text, the radius is 0, the shadow is none and the bottom border is 1 px
- WHEN the borders of the band and of the first heading of the page are compared
- THEN the band border and the h1 border have the same colour

### Related requirements
- SwRS-MDOKFSTUDIO-TOOLBAR-033: the table of contents button that opens the column whose reserve narrows the band.

### Verification notes
- Method: test/core/preview/previewStyles.test.ts (Band grows: sticky headings start at the viewport top without filler and leave horizontal room for controls; Text aligned with the column and Flat, bold style: sticky headings align with content and emphasize text in a full-width band; Room published for the toolbar; Table of contents reserve: the TOC column is hidden by default, reserves 256px when open and hides on narrow panes, asserting display none, the 760 px media block, 256 px and the band max-width).
- Method: test/page/runtimeScroll.test.ts (Room published for the toolbar: does not shift sticky headings down when the floating toolbar grows).
- Method: test/visual/capture_final_checks.py (check_sticky_headings on toolbar-navigation/v01 to v04: Band grows, Pointer, Text aligned with the column, Text stops before the toolbar as min(column right, toolbar left - 8), Flat, bold style with a rule; the rightmost toolbar button is not covered). The visual check_toc_column never shows a band (it measures after scrolling to the top, where the band is hidden), so the overlap with the column is asserted only by the CSS unit test.
- Method: test/visual/scenarioDefinitions2.ts (Long heading path wraps: scenario toolbar-navigation/v05-sticky-wrapped-growth-dark-460).
- Criteria: position fixed, inset-block-start 0, width 100 percent, pointer-events none; text left within 1 px of the content column; text right within 1 px of min(column right, toolbar left - 8); variable = toolbar width + 22, or 0; band max-width is 100 percent minus the reserve, which is 256 px at 760 px or more, else 0; white-space pre-wrap and overflow-wrap anywhere with height >= rendered lines times line height; weight >= 600, font larger than body, border-bottom 1 px, radius 0.
