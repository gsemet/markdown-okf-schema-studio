---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-002
uuid: ab71e5f7-8f26-4f27-ba17-501f4f393e20
title: A soft shadow under the sticky heading band shows only while text scrolls
  under it
description: When the preview is scrolled so that text passes under the sticky
  heading band, the extension SHALL draw a soft shadow below the band in the
  colour set of the active theme, and SHALL draw none while the page is at the
  top, without moving the content or the toolbar.
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/stickyHeadings.ts
tested_in_files:
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions2.ts
---

## A soft shadow under the sticky heading band shows only while text scrolls under it

### Normative behavior

When the preview is scrolled so that text passes under the sticky heading band, the extension SHALL draw a soft shadow below the band in the colour set of the active theme, and SHALL draw none while the page is at the top, without moving the content or the toolbar.

### Scenario (nominal): Text scrolls under the band
- GIVEN a preview scrolled so that the sticky band is shown over text, in the light, dark, cream or white theme or the host's current theme
- WHEN the page is more than 1 px below the top
- THEN the band carries the data-scrolled-under marker and a box-shadow offset downward and blurred, in a shadow colour set per theme (darker in dark), which shifts no content and leaves the band fixed at the top
- AND the toolbar, stacked above the band, is not covered by the shadow

### Scenario (boundary): Page at the top
- GIVEN a preview whose scroll position is 0 or 1 px
- WHEN the sticky band is updated
- THEN the band has no data-scrolled-under marker and no shadow, so nothing is drawn under a band over no scrolled text

### Scenario (boundary): Back to the top
- GIVEN a scrolled preview with the shadow shown
- WHEN the page is scrolled back to the top
- THEN the marker is removed again

### Verification notes

- Method: test/page/runtimeScroll.test.ts (Page at the top and Back to the top: the sticky band is marked as having content scrolled under it only below the top).
- Method: visual scenarios toolbar-navigation/v32 to v34 in test/visual/scenarioDefinitions2.ts (Text scrolls under the band: the computed box-shadow, the fixed position at top 0 and the toolbar z-index over the band in the light, dark and cream themes).
- Criteria: marker present if and only if scrollY > 1; computed box-shadow not none with a positive vertical offset and blur; band top 0; toolbar z-index above the band.
