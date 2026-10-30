---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-043
uuid: 3a3b04bc-e75e-4f1f-b1fe-d431e71f2bc7
title: "Zoom scales the text and the column without a redraw"
description: "When the zoom is set, the extension SHALL set the content font size
  to the base size multiplied by the zoom and the content column width to the maximum
  content width multiplied by the zoom, never wider than the pane, without drawing
  the page again."
project: markdown-okf-schema-studio
scope: theme-zoom
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/contentPatch.ts
- src/core/preview/styles/pageChromeStyles.ts
tested_in_files:
- test/core/preview/contentPatch.test.ts
- test/core/preview/previewStyles.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Zoom scales the text and the column without a redraw

### Normative behavior

When the zoom is set, the extension SHALL set the content font size to the base size multiplied by the zoom and the content column width to the maximum content width multiplied by the zoom, never wider than the pane, without drawing the page again.

### Scenario (nominal): 70 and 200 percent

- GIVEN the handbook at 70 % in a 900 px pane (visual scenario theme-zoom/v09) and at 200 % (v10)
- WHEN the font size of a paragraph is read
- THEN it is 70 % and 200 % of the base size, within half a pixel

### Scenario (boundary): Toolbar does not scale

- GIVEN the same pages
- WHEN the toolbar buttons are measured
- THEN they keep their size; only the content text and the heading band text follow the zoom

### Scenario (nominal): Wide pane

- GIVEN the handbook at 70 % and at 200 % in a 900 px pane with the default maximum width 960 (visual scenarios theme-zoom/v09 and v10)
- WHEN the column box is measured
- THEN it is about 672 px at 70 % and the pane width at 200 % (the smaller of the pane and 960 times the zoom, within 40 px), with no horizontal page scroll

### Scenario (boundary): Narrow pane

- GIVEN the handbook at 150 % in a 460 px pane (visual scenario theme-zoom/v11)
- WHEN the column is measured
- THEN it stays inside the pane and the paragraphs are inside the pane (the no-sideways-scroll rule is SwRS-MDOKFSTUDIO-LAYOUT-001)

### Scenario (nominal): Two zooms share one page shell

- GIVEN renders of one document at zoom 100 and zoom 130
- WHEN the shell keys and the context keys are computed
- THEN the shell keys are equal, the context keys are equal and the second page can be patched into the first

### Scenario (boundary): Context key of the preferences

- GIVEN the preview preferences with zoom 100 and with zoom 130
- WHEN the runtime context keys are computed
- THEN the two keys are equal

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-038: the buttons that set the zoom.
- SwRS-MDOKFSTUDIO-LAYOUT-001: the page never scrolls sideways; full width mode lifts the column limit (layout-width).

### Verification notes

- Method: test/core/preview/previewStyles.test.ts, unit test `T08: zoom scales the content font size and the column width together` (rule text of the font size and of the column width).
- Method: test/visual/scenarioDefinitions2.ts, visual scenarios theme-zoom/v09, v10 and v11 (zoomAssertions in test/visual/scenarioAssertions.ts: font size, wide pane, narrow pane). The unchanged toolbar size is not asserted.
- Method: test/core/preview/contentPatch.test.ts, unit test `T08: two renders with different zoom have the same shell key and the same context key` (shell keys and canPatch for the two-zooms scenario, the context keys for the second).
- Criteria: The computed paragraph size equals the base size times the zoom. The measured column equals the smaller of the pane and the zoomed maximum width, within 40 px. shellKey and runtimeContextKey are equal for the two zooms and canPatch is true.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-THEME-011](../../strs/theme-zoom/StRS-MDOKFSTUDIO-THEME-011.md): A reader zooms the text and the column and keeps the zoom
<!-- okf:links:end -->
