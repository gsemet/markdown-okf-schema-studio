---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-025
uuid: 1b09a32e-8351-4512-8628-1638b965ea49
title: "The sticky band is fixed, aligned with the column and clear of the toolbar"
description: "When the band is shown, hidden or changes its number of lines, the extension
  SHALL keep it fixed to the top of the pane at full width with no gap above it, outside
  the document flow and ignoring pointer events, with its text aligned to the content
  column, ending before the toolbar and narrowed by the table of contents reserve,
  keeping each heading level on one line, cut with an ellipsis when it is too long,
  and draw it flat and bold, ended by a one pixel rule, with a soft shadow below it,
  in the colour set of the active theme, only while text scrolls under it, and none
  at the top of the page."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-004
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on: []
scenarios:
- id: S1
  title: Band grows
- id: S2
  title: Pointer
- id: S3
  title: Text aligned with the column
- id: S4
  title: Text stops before the toolbar
- id: S5
  title: Room published for the toolbar
- id: S6
  title: Table of contents reserve
- id: S7
  title: Long heading cut with an ellipsis
- id: S8
  title: Flat, bold style with a rule
- id: S9
  title: Text scrolls under the band
- id: S10
  title: Page at the top
- id: S11
  title: Back to the top
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
- test/visual/stickyLongTitleScenarios.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TOOLBAR-002
---

## The sticky band is fixed, aligned with the column and clear of the toolbar

### Normative behavior

When the band is shown, hidden or changes its number of lines, the extension SHALL keep it fixed to the top of the pane at full width with no gap above it, outside the document flow and ignoring pointer events, with its text aligned to the content column, ending before the toolbar and narrowed by the table of contents reserve, keeping each heading level on one line, cut with an ellipsis when it is too long, and draw it flat and bold, ended by a one pixel rule, with a soft shadow below it, in the colour set of the active theme, only while text scrolls under it, and none at the top of the page.

### Scenario S1 (nominal): Band grows
- GIVEN a band that goes from one to three lines
- WHEN the band is measured
- THEN its top is 0, its position is fixed and the text below does not shift

### Scenario S2 (nominal): Pointer
- GIVEN the pointer over the band
- WHEN the reader clicks
- THEN the click reaches the content below, because the band ignores pointer events

### Scenario S3 (boundary): Text aligned with the column
| Pane | Outcome |
| --- | --- |
| 900 px in Margin width | the left edges of the band text box and of the content column are equal within 1 px |
| 460 px | their left edges are equal within 1 px |

### Scenario S4 (boundary): Text stops before the toolbar
| Input | Outcome |
| --- | --- |
| toolbar's left edge is left of the column's right edge | the text right edge is the toolbar left edge minus 8 px |
| wide pane where the toolbar is right of the column | the text right edge is the column's right edge |

### Scenario S5 (boundary): Room published for the toolbar
| Input | Outcome |
| --- | --- |
| toolbar grows from collapsed to expanded, then the band position is refreshed | --sphinx-preview-toolbar-width on the band is the new toolbar width plus 22 px |
| no toolbar, or a toolbar whose width is not finite | the variable is 0 px |

### Scenario S6 (boundary): Table of contents reserve
| Input | Outcome |
| --- | --- |
| 900 px pane with the table of contents open | the band is narrowed by 256 px and its right edge is at most the left edge of the column |
| 460 px pane with the button pressed | the band width is not reduced, because the column is hidden |

### Scenario S7 (boundary): Long heading cut with an ellipsis
- GIVEN a 460 px pane and long headings at depth 3
- WHEN the band is measured
- THEN it shows three rendered lines, each ended by an ellipsis where the heading does not fit, its height equals three lines and the document flow does not shift
- GIVEN depth 1, a long H1 and a zoom of 160 %
- WHEN the band is measured
- THEN the band is one line and the first line of the section is below the band

### Scenario S8 (nominal): Flat, bold style with a rule
- GIVEN a shown band
- WHEN its style is read
- THEN the font weight is at least 600 and larger than the body text, the radius is 0, the shadow is none (the page is at the top) and the bottom border is 1 px
- WHEN the borders of the band and of the first heading of the page are compared
- THEN the band border and the h1 border have the same colour

### Scenario S9 (nominal): Text scrolls under the band
- GIVEN a preview scrolled so that the sticky band is shown over text, in the light, dark, cream or white theme or the host's current theme
- WHEN the page is more than 1 px below the top
- THEN the band carries the data-scrolled-under marker and a box-shadow offset downward and blurred, in a shadow colour set per theme (darker in dark), which shifts no content and leaves the band fixed at the top
- AND the toolbar, stacked above the band, is not covered by the shadow

### Scenario S10 (boundary): Page at the top
- GIVEN a preview whose scroll position is 0 or 1 px
- WHEN the sticky band is updated
- THEN the band has no data-scrolled-under marker and no shadow, so nothing is drawn under a band over no scrolled text

### Scenario S11 (boundary): Back to the top
- GIVEN a scrolled preview with the shadow shown
- WHEN the page is scrolled back to the top
- THEN the marker is removed again

### Related requirements
- SwRS-MDOKFSTUDIO-TOOLBAR-033: the table of contents button that opens the column whose reserve narrows the band.

### Verification notes
- Method: test/core/preview/previewStyles.test.ts (Band grows: sticky headings start at the viewport top without filler and leave horizontal room for controls; Text aligned with the column and Flat, bold style: sticky headings align with content and emphasize text in a full-width band; Room published for the toolbar; Table of contents reserve: the TOC column is hidden by default, reserves 256px when open and hides on narrow panes, asserting display none, the 760 px media block, 256 px and the band max-width).
- Method: test/page/runtimeScroll.test.ts (Room published for the toolbar: does not shift sticky headings down when the floating toolbar grows).
- Method: test/visual/capture_final_checks.py (check_sticky_headings on toolbar-navigation/v01 to v04: Band grows, Pointer, Text aligned with the column, Text stops before the toolbar as min(column right, toolbar left - 8), Flat, bold style with a rule; the rightmost toolbar button is not covered). The visual check_toc_column never shows a band (it measures after scrolling to the top, where the band is hidden), so the overlap with the column is asserted only by the CSS unit test.
- Method: test/visual/scenarioDefinitions2.ts (Long heading cut with an ellipsis: scenarios toolbar-navigation/v05-sticky-long-path-ellipsis-dark-460 and toolbar-navigation/v45-sticky-long-title-zoom-160-cream-900; check_sticky_headings reads white-space, overflow, text-overflow and the rendered lines, and checks the section start under the band).
- Criteria: position fixed, inset-block-start 0, width 100 percent, pointer-events none; text left within 1 px of the content column; text right within 1 px of min(column right, toolbar left - 8); variable = toolbar width + 22, or 0; band max-width is 100 percent minus the reserve, which is 256 px at 760 px or more, else 0; white-space pre, overflow hidden and text-overflow ellipsis, rendered lines equal to the heading levels shown, height >= rendered lines times line height; weight >= 600, font larger than body, border-bottom 1 px, radius 0.
- Method: test/page/runtimeScroll.test.ts (Page at the top and Back to the top: the sticky band is marked as having content scrolled under it only below the top).
- Method: visual scenarios toolbar-navigation/v32 to v34 in test/visual/scenarioDefinitions2.ts (Text scrolls under the band: the computed box-shadow, the fixed position at top 0 and the toolbar z-index over the band in the light, dark and cream themes).
- Criteria: marker present if and only if scrollY > 1; computed box-shadow not none with a positive vertical offset and blur; band top 0; toolbar z-index above the band.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-004](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-004.md): The reader always sees the section being read
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-002](SwRS-MDOKFSTUDIO-TOOLBAR-002.md): A soft shadow under the sticky heading band shows only while text scrolls under it
<!-- okf:links:end -->
