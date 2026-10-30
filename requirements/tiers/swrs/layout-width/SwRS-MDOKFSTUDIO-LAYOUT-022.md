---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-022
uuid: 0a5691b9-e9e5-4ad1-8462-25465807d1e1
title: Margin keeps blocks in the column and Full removes the limit
description: When the width mode is Margin or Full width, the extension SHALL
  keep tables, code blocks and figures inside the text column in Margin and let
  them scroll or wrap instead of leaving it, and lift the column limit with a
  page side gutter of 16 px in Full width, centring narrower tables and figures
  at their own width in every width mode.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/page/modules/widthMode.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/runtimePageControls.test.ts
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-028
- SwRS-MDOKFSTUDIO-LAYOUT-029
- SwRS-MDOKFSTUDIO-LAYOUT-030
- SwRS-MDOKFSTUDIO-LAYOUT-039
---

## Margin keeps blocks in the column and Full removes the limit

### Normative behavior

When the width mode is Margin or Full width, the extension SHALL keep tables, code blocks and figures inside the text column in Margin and let them scroll or wrap instead of leaving it, and lift the column limit with a page side gutter of 16 px in Full width, centring narrower tables and figures at their own width in every width mode.

### Scenario (nominal): Wide table in Margin
- GIVEN Margin width mode, a column of 700 px and a table 900 px wide
- WHEN the preview is rendered
- THEN no element is marked data-sphinx-preview-wide and the table scrolls inside the column

### Scenario (nominal): Mode left
- GIVEN an element marked wide in Auto mode
- WHEN the mode returns to Margin
- THEN the mark and the breakout values are cleared

### Scenario (nominal): Full width in a wide pane
- GIVEN Full width mode and a 1600 px pane
- WHEN the preview is rendered
- THEN the column cap is 100000 px and the content gutter is 16 px
- AND the same pane in Margin mode has a content gutter of the clamp of 16 px, 8vw and 78 px, so up to 78 px each side instead of 16 px

### Scenario (nominal): Full width centres the content
| Input | Outcome |
| --- | --- |
| Full width mode, light theme, 460 px pane (visual scenario v80) | The table, code block and figure are centred with at least 15 px gutters and the text has 16 px (within 2 px) side margins |
| Full width mode, dark theme, 900 px pane (visual scenario v83) | The same centring and gutters hold, and the page does not scroll horizontally |

### Scenario (nominal): Narrow tables and figures
- GIVEN a table 300 px wide in a 700 px column, in Margin, Auto and Full width
- WHEN the preview is rendered
- THEN the table is centred through automatic inline margins in all three modes
- AND a paragraph holding only an image and its caption has the figure and its caption centred under the picture, and a code block narrower than the column stays left with its own width

### Scenario (boundary): Paragraph marked as a figure
| Input | Outcome |
| --- | --- |
| Top-level paragraph whose only child is an image and whose text is empty, measured in Margin, then in Auto | Carries data-sphinx-preview-figure in both modes |
| Paragraph with an image and a sentence | Not marked; a mark left on a paragraph that no longer qualifies is removed |
| Top-level paragraph holding two images and no text | Not marked as a figure |

### Known issues
- Known issue: docs/user/settings.md says that with the setting at 0 all three modes look the same, but Full width uses a 16 px gutter where Margin and Auto use up to 78 px (not identical, and not tested).
- Known issue: The centring rules are only visual checks; no unit test reads them.
- Known issue: The negative case of the figure mark and the removal of a stale mark have no test.
- Known issue: The figure mark requires exactly one child element, while the Auto breakout treats any image of a text-free top-level paragraph as its wrapper, so a paragraph of two images can break out in Auto without being marked as a figure (and so without being centred).

### Verification notes
- Method: test/page/runtimePageControls.test.ts (wide table in Margin, mode left, paragraph marked as a figure): unit tests T10 only elements wider than the column are flagged, and only in Auto; T10b a paragraph holding only an image is marked as a figure in every width mode; the text case is verified by inspection of widthMode.ts.
- Method: test/core/preview/previewStyles.test.ts (Full width in a wide pane): unit tests P7 full width uses the 16 px gutter a broken-out table keeps in auto and T10 full width lifts the column limit.
- Method: test/visual/capture_layout_checks.py (all visual cases): visual checks of width-mode breaks, the width-mode checks including the Full width halves of v66 to v71, v80 and v83, and the narrow table and figure checks; the centring rule has no unit test.
- Criteria: No wide mark exists in Margin and the page has no sideways scroll; the Full width rule sets column width 100000px and gutter 16px; gutters are at least 15 px and side margins 16 px within 2 px; left and right free space of the table and figure are equal and the code block starts at the column edge; the figure attribute is present exactly on image-only top-level paragraphs.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-003](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-003.md): A reader chooses how wide the text column is
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LAYOUT-028](SwRS-MDOKFSTUDIO-LAYOUT-028.md): Full width removes the column limit
  - [SwRS-MDOKFSTUDIO-LAYOUT-029](SwRS-MDOKFSTUDIO-LAYOUT-029.md): Narrow tables and figures are centred in every width mode
  - [SwRS-MDOKFSTUDIO-LAYOUT-030](SwRS-MDOKFSTUDIO-LAYOUT-030.md): A paragraph holding only an image is marked as a figure
  - [SwRS-MDOKFSTUDIO-LAYOUT-039](SwRS-MDOKFSTUDIO-LAYOUT-039.md): Full width centres the content with gutters of at least 15 px
<!-- okf:links:end -->
