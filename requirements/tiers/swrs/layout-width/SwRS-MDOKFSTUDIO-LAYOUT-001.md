---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-001
uuid: 2a4c8e45-7922-4ec0-98fc-d62f4fbd61e9
title: The preview page never scrolls sideways
description: When a document holds wide content, long words or long URLs, the
  extension SHALL keep the preview page free of sideways scrolling in every
  width mode, theme and pane width.
project: markdown-okf-schema-studio
scope: layout-width
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.markers.ts
- src/core/preview/styles/contentLayoutStyles.markers.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/page/geometryChecks.test.ts
- test/visual/capture_layout_checks.py
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-LAYOUT-035
---

## The preview page never scrolls sideways

### Normative behavior

When a document holds wide content, long words or long URLs, the extension SHALL keep the preview page free of sideways scrolling in every width mode, theme and pane width.

### Scenario (nominal): Each width mode at 460 px
- GIVEN the light theme, a 460 px pane and a document with a table, a code block and a figure wider than the column (visual scenarios v78, v79 and v80)
- WHEN the preview is rendered in Margin, Auto and Full width
- THEN the page does not scroll horizontally (horizontal overflow of at most 1 px) in all three modes

### Scenario (nominal): Long words and URLs wrap
- GIVEN text blocks, links and table cells holding long words or bare URLs
- WHEN the preview is rendered
- THEN the text blocks, links and table cells carry overflow-wrap anywhere so that long words and URLs wrap and the page does not widen (a table wider than the pane scrolls inside its own box, see SwRS-MDOKFSTUDIO-LAYOUT-032)

### Scenario (nominal): GitHub Flavored Markdown gallery
- GIVEN the GFM gallery document (five alerts, strikethrough, two footnotes, three task checkboxes, a right-aligned column, a raw HTML table, a raw details block and an autolink) in dark at 900 px, light at 900 px and light at 460 px (visual scenarios gfm/v02, gfm/v03 and gfm/v04)
- WHEN the preview is rendered
- THEN the page has no horizontal overflow in all three cases

### Known issues
- Known issue: No documentation states this promise (docs/user/wide-tables.md speaks only of a comfortable narrow column); it is locked by visual checks and the wrapping unit test only.
- Known issue: The GFM gallery check is a composite; its atomic parts belong to the gfm requirements (autolinks, strikethrough, alerts, footnotes, tables, task lists, raw HTML).

### Verification notes
- Method: test/visual/scenarioDefinitions1.ts and test/visual/capture_layout_checks.py (width modes at 460 px, long words, GFM gallery): visual scenarios v01, v66 to v71 and v78 to v83 (the NO_HORIZONTAL_SCROLL assertion and the width-mode checks, panes from 360 to 2000 px) and gfm/v02 to v04.
- Method: test/core/preview/previewStyles.test.ts (long words): unit test K1, long words and bare URLs wrap inside text blocks, links and table cells.
- Note: the four machine geometry checks of test/page/geometryChecks.test.ts are test infrastructure with no user-visible effect and are not a requirement.
- Criteria: Horizontal overflow of the page is at most 1 px in every scenario, the wrapping rule covers the text blocks, links and table cells.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-LAYOUT-001](../../strs/layout-width/StRS-MDOKFSTUDIO-LAYOUT-001.md): The preview never scrolls sideways and wide content scrolls in its box
- Supersedes:
  - [SwRS-MDOKFSTUDIO-LAYOUT-035](SwRS-MDOKFSTUDIO-LAYOUT-035.md): Machine geometry checks report four layout defects
<!-- okf:links:end -->
