---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-037
uuid: 284e833b-219b-440d-8e45-b90b1d55e431
title: "The column sits below the toolbar on the right and never covers the text"
description: "When the column is open, the extension SHALL place it eight pixels below
  the toolbar and, on a pane of at least 760 pixels, show it as a fixed 240 pixel
  column 16 pixels from the right edge with 256 pixels reserved from the content so
  that the text and the tables stay clear of it, and on a narrower pane show a rail
  on the right with one tick per heading instead, open the column as an overlay above
  the text while the pointer or the focus is on the rail, close it 300 ms after both
  left or on Escape, and go to a heading when its tick is clicked."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-006
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/page/modules/tocColumn.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/modules/tocColumn.test.ts
- test/page/modules/toolbarCollapse.test.ts
- test/visual/capture_toc_checks.py
- test/visual/capture_toc_rail.py
default_owner_email: gaetan@xeberon.net
---

## The column sits below the toolbar on the right and never covers the text

### Normative behavior

When the column is open, the extension SHALL place it eight pixels below the toolbar and, on a pane of at least 760 pixels, show it as a fixed 240 pixel column 16 pixels from the right edge with 256 pixels reserved from the content so that the text and the tables stay clear of it, and on a narrower pane show a rail on the right with one tick per heading instead, the tick of the section at the reading line being highlighted. While the pointer or the keyboard focus is on the rail or on the overlay, the extension SHALL show the column as an overlay above the text without reserving width; it SHALL close the overlay 300 ms after both have left, or at once on Escape (the focus returns to the rail; the key is taken only when it comes from the overlay, the rail or no focused element, see SwRS-MDOKFSTUDIO-TOOLBAR-133), or when an entry of the overlay is clicked or the TOC is turned off. The rail is focusable, the overlay stays the navigation landmark Table of contents, a click on a tick goes to its heading, and the overlay appears without animation.

### Scenario (nominal): Top edge follows the toolbar
| Input | Outcome |
| --- | --- |
| An open column and a toolbar whose bottom edge is at 92 px | Its top variable (--sphinx-preview-toc-top) is 100 px, which is the toolbar bottom plus 8 px |
| The window is resized | The column is placed again below the toolbar |
| The toolbar is expanded or collapsed, even with quick clicks | The column is placed again below the toolbar when the animation of the rows ends |
| A toolbar bounds value that is not finite | The top is 8 px |

### Scenario (nominal): Wide pane
- GIVEN a 900 px pane with the column open
- WHEN the page is measured
- THEN the column is 240 px wide with a 16 px gap on the right, the content area is 256 px narrower and the column stays inside the viewport

### Scenario (boundary): Pane width
| Input | Outcome |
| --- | --- |
| Exactly 760 px with the column open | The column is shown |
| 900 px with the column open | The column is shown (240 px wide, 16 px from the right edge, 256 px reserved) |
| 460 px with the button pressed | The root attribute is open, the button is pressed, the rail is displayed, the column is not displayed until the rail is hovered or focused and the content right edge moved in by the 16 px of the rail only |
| The 460 px pane resized to 900 px | The column shows without a new press and the rail goes |

### Scenario (nominal): Narrow pane rail and overlay
| Input | Outcome |
| --- | --- |
| 460 px, TOC on, a document with three headings of h1 to h4 | The rail holds three ticks, each labelled with its heading, and the tick of the section at the reading line is marked current |
| The pointer enters the rail, or the focus enters it | The column opens as an overlay (data-sphinx-preview-toc-overlay is open) |
| The pointer leaves the rail and the overlay | The overlay stays 299 ms and is closed at 300 ms; entering the overlay in between keeps it open |
| Escape while the overlay is open | The overlay closes at once and the rail takes the focus; another key changes nothing |
| A click on a tick | The page goes to that heading |
| A click on an entry of the overlay, or the TOC turned off | The overlay closes |

### Scenario (nominal): Text and tables stay clear in Margin and Full width
- GIVEN a 900 px pane with a 10-column table and the column open
- WHEN the width mode is Margin, then Full width
- THEN the content column and every table end at or before the column's left edge and the page has at most 1 px of horizontal overflow

### Scenario (boundary): Zoom 200
- GIVEN zoom 200 percent with the column open on a wide pane
- WHEN the page is measured
- THEN the content still ends before the column and does not scroll sideways

### Related requirements
- SwRS-MDOKFSTUDIO-TOOLBAR-133: the 16 px padding for the rail, the overlay offset under the tooltips and the Escape scope.
- SwRS-MDOKFSTUDIO-LAYOUT-023: Auto width is specified there, not here.

### Verification notes
- Method: test/page/modules/tocColumn.test.ts (Top edge follows the toolbar: the column starts 8 px below the toolbar).
- Method: test/page/modules/toolbarCollapse.test.ts (the layout is measured after the animation in both directions, once for quick clicks).
- Method: test/visual/capture_toc_checks.py (check_toc_follows_toolbar: four clicks on the chevron, in a real browser, with the column on a wide pane and the rail on a narrow one).
- Method: test/page/modules/tocColumn.test.ts (the rail ticks and the current tick; hover and focus open the overlay and the 300 ms close; Escape; a click on a tick; an entry click and the toggle close the overlay).
- Method: test/core/preview/previewStyles.test.ts (a narrow pane shows a rail and opens the column as an overlay: the max-width 759 px block, the fixed rail, the overlay attribute, no animation).
- Method: test/core/preview/previewStyles.test.ts (Wide pane and Pane width: the TOC column is hidden by default, reserves 256px when open and hides on narrow panes; the 760 px media block, 256 px, position fixed, inset-block-end 16px, width 240px, display none under 760 px). The exact 760 px boundary and the widening of the pane are untested.
- Method: test/visual/capture_toc_checks.py (check_toc_column: the column starts at least 7 px under the toolbar bottom; check_toc_column and check_toc_shot on scenarios toolbar-navigation/v22 to v27 for the wide pane, Margin, Full width and zoom 200, light 900 px and dark 1600 px; v28 and v29 for the narrow pane: the column hidden at rest, the rail displayed, the content narrowed by the 16 px of the rail only, the button still pressed, and the overlay opened by a hover on the rail).
- Criteria: --sphinx-preview-toc-top = toolbar bottom + 8, or 8; --sphinx-preview-toc-reserve is 256px at 760 px or more; nav width 240 px, inset-inline-end 16 px; display none under 760 px at rest, a rail of 16 px under 760 px, and padding on the body only from 760 px; columnRight <= nav.left + 1 and overflowX <= 1 for margin, full and zoom 200.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
<!-- okf:links:end -->
