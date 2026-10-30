---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-037
uuid: 284e833b-219b-440d-8e45-b90b1d55e431
title: "The column sits below the toolbar on the right and never covers the text"
description: "When the column is open, the extension SHALL place it eight pixels below
  the toolbar and, on a pane of at least 760 pixels, show it as a fixed 240 pixel
  column 16 pixels from the right edge with 256 pixels reserved from the content so
  that the text and the tables stay clear of it, and on a narrower pane hide it while
  the choice stays."
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
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## The column sits below the toolbar on the right and never covers the text

### Normative behavior

When the column is open, the extension SHALL place it eight pixels below the toolbar and, on a pane of at least 760 pixels, show it as a fixed 240 pixel column 16 pixels from the right edge with 256 pixels reserved from the content so that the text and the tables stay clear of it, and on a narrower pane hide it while the choice stays.

### Scenario (nominal): Top edge follows the toolbar
| Input | Outcome |
| --- | --- |
| An open column and a toolbar whose bottom edge is at 92 px | Its top variable (--sphinx-preview-toc-top) is 100 px, which is the toolbar bottom plus 8 px |
| The window is resized | The column is placed again below the toolbar |
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
| 460 px with the button pressed | The root attribute is open, the button is pressed, the column is not displayed and the content right edge did not move |
| The 460 px pane resized to 900 px | The column shows without a new press |

### Scenario (nominal): Text and tables stay clear in Margin and Full width
- GIVEN a 900 px pane with a 10-column table and the column open
- WHEN the width mode is Margin, then Full width
- THEN the content column and every table end at or before the column's left edge and the page has at most 1 px of horizontal overflow

### Scenario (boundary): Zoom 200
- GIVEN zoom 200 percent with the column open on a wide pane
- WHEN the page is measured
- THEN the content still ends before the column and does not scroll sideways

### Related requirements
- SwRS-MDOKFSTUDIO-LAYOUT-023: Auto width is specified there, not here.

### Verification notes
- Method: test/page/modules/tocColumn.test.ts (Top edge follows the toolbar: the column starts 8 px below the toolbar).
- Method: test/core/preview/previewStyles.test.ts (Wide pane and Pane width: the TOC column is hidden by default, reserves 256px when open and hides on narrow panes; the 760 px media block, 256 px, position fixed, inset-block-end 16px, width 240px, display none under 760 px). The exact 760 px boundary and the widening of the pane are untested.
- Method: test/visual/capture_layout_checks.py (check_toc_column: the column starts at least 7 px under the toolbar bottom; check_toc_column and check_toc_shot on scenarios toolbar-navigation/v22 to v27 for the wide pane, Margin, Full width and zoom 200, light 900 px and dark 1600 px; v28 and v29 for the hidden column with the same content width and the button still pressed).
- Criteria: --sphinx-preview-toc-top = toolbar bottom + 8, or 8; --sphinx-preview-toc-reserve is 256px at 760 px or more; nav width 240 px, inset-inline-end 16 px; display none under 760 px and padding on the body only from 760 px; columnRight <= nav.left + 1 and overflowX <= 1 for margin, full and zoom 200.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-006](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-006.md): The reader uses a table of contents beside the document
<!-- okf:links:end -->
