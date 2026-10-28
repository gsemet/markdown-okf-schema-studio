---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-001
uuid: 1a0f84b9-cd60-44df-a02a-786ee604464d
title: "The toolbar has three rows of titled buttons that float over the page"
description: "When a preview page is built, the extension SHALL render the toolbar,
  named Preview controls with the role toolbar, as three rows of buttons in a fixed
  order (for a writable preview: Refresh, Anchor, Edit and the collapse button; Back,
  Next, Zoom out and Zoom in; Theme, Width, Table of contents, Diff and Comments),
  give every button a data-tooltip equal to its title, show that tooltip with a readable
  contrast on hover and on keyboard focus, and fix the toolbar at the top right of
  the pane above the page content, inside the pane and without overlap between its
  rows."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/previewToolbar.ts
- src/core/preview/styles/pageChromeStyles.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/visual/capture_final_checks.py
- test/visual/capture_layout_checks.py
default_owner_email: gaetan@xeberon.net
---

## The toolbar has three rows of titled buttons that float over the page

### Normative behavior

When a preview page is built, the extension SHALL render the toolbar, named Preview controls with the role toolbar, as three rows of buttons in a fixed order (for a writable preview: Refresh, Anchor, Edit and the collapse button; Back, Next, Zoom out and Zoom in; Theme, Width, Table of contents, Diff and Comments), give every button a data-tooltip equal to its title, show that tooltip with a readable contrast on hover and on keyboard focus, and fix the toolbar at the top right of the pane above the page content, inside the pane and without overlap between its rows.

### Scenario (nominal): Writable preview
- GIVEN a writable preview
- WHEN the toolbar markup is rendered
- THEN it holds 13 buttons in the rows main (4), view (4) and options (5), in that order, and rows view and options sit together in one group that follows the main row

### Scenario (nominal): Visual order
- GIVEN a 900 px pane in any theme
- WHEN the page is rendered
- THEN the toolbar has exactly three rows named main, view and options with 4, 4 and 5 buttons, and the Tab order follows the rows

### Scenario (nominal): Every button has a tooltip equal to its title
- GIVEN the rendered toolbar
- WHEN its buttons are counted
- THEN 13 buttons carry data-tooltip, each equal to its title
- WHEN the attributes of the Theme and Edit buttons are read
- THEN the aria-label differs from the title (Preview theme: Current theme, Toggle edit mode) while data-tooltip equals the title

### Scenario (nominal): Tooltip on hover and on keyboard focus
- GIVEN a toolbar button
- WHEN the pointer rests on it for 200 ms
- THEN its tooltip box appears below it with the button's text, the box has content, is not transparent and its text has a contrast ratio of at least 4.5 against its background
- WHEN the same button is reached with Tab and has the focus ring
- THEN the same tooltip appears with the same colours

The tooltip stays right-aligned with its button, 8 px below it, without translating horizontally
on hover or focus. Disabled Back, Next and zoom controls dim only their icons: their tooltip
background and text remain fully opaque, like enabled controls. Long theme labels keep the same
anchor rather than moving left by half the label width.

### Scenario (boundary): Rows stay inside the pane
| Input | Outcome |
| --- | --- |
| 360 px pane, each of the light, dark, white and cream themes, collapsed and expanded | row 1 ends above row 2 and row 2 above row 3, the left edge is not negative and the right edge is not past the pane |
| 900 px pane, each theme, collapsed and expanded | same outcome |
| zoom buttons pressed until 70 percent | the zoom button is disabled, the toolbar stays inside the viewport and does not overlap the sticky heading text |
| zoom buttons pressed until 200 percent | same outcome |

### Scenario (nominal): Scrolling
- GIVEN a long document
- WHEN the reader scrolls
- THEN the toolbar keeps its place at the top right and the text scrolls under it

### Scenario (boundary): Nothing else makes room
- GIVEN text scrolled to the toolbar's place
- WHEN the text passes the toolbar
- THEN the text is covered by the toolbar; only the first element of the document gets clearance (layout-width scope)

### Known issues
- Known issue: no code avoids the text that scrolls under the toolbar, and no code moves the toolbar when the find widget of VS Code opens; the layout-width scope handles only the first element of the document.

### Verification notes
- Method: test/core/preview/previewStyles.test.ts, `toolbar tooltips stay opaque and anchored even on disabled controls` checks that disabled-button opacity applies only to the SVG and that the shared tooltip visibility rule adds no translation.
- Method: test/core/preview/previewStyles.test.ts (Writable preview: the preview toolbar has three rows; Every button has a tooltip: it counts 13 data-tooltip attributes and compares the title and tooltip pair of the Refresh, Anchor and Edit buttons and the start of the Theme button, equality for all 13 buttons is not asserted; Tooltip: the tooltip rule takes its content from data-tooltip, hidden by default and visible on hover and focus-visible; Scrolling: position fixed and z-index 1100 of the toolbar; the 12 px and 14 px offsets and the covering of scrolled text are untested).
- Method: test/visual/capture_layout_checks.py (Visual order on toolbar-navigation/v06 to v21: row names, button counts, Tab order; Rows stay inside the pane through check_preview_toolbar_rows: rows, overlap, left edge, zoom 70 and 200; the 16 scenarios differ only in theme, width and collapse state; the 460 px width is covered by the sticky band scenarios only).
- Method: test/visual/capture_final_checks.py (Every button has a tooltip: label per control; Tooltip on hover through check_tooltip_contrast, run on every visual scenario, which hovers the Refresh button; the keyboard case follows from the shared CSS rule and is not measured).
- Criteria: The markup holds 13 buttons in three rows with the listed controls; the visual probe reports the same rows and Tab order; every button has data-tooltip equal to title; ::after content is attr(data-tooltip) with visibility visible and opacity 1 on hover and focus-visible; contrast ratio >= 4.5, content not none, opacity not 0; no two rows overlap (0.5 px tolerance), left is 0 or more and right is at most the pane width at both zoom limits; the toolbar is position fixed, 12 px from the top and 14 px from the end, with z-index 1100.
