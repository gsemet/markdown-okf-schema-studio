---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-031
uuid: 6bbf323e-f093-405f-86fd-9bf298e476e7
title: "Cream text meets a 4.5 to 1 contrast and keeps the body colour after an admonition"
description: "When the Cream theme mode is shown, the extension SHALL give the foreground,
  description, link, six chart and error text colours a contrast of at least 4.5 to
  1 on each of the editor, code block, block quote, hover widget, widget and input
  surfaces, and draw the paragraph after an admonition in the body text colour."
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
depends_on:
- SwRS-MDOKFSTUDIO-THEME-025
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/pageChromeStyles.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/visual/capture_page_checks.py
- test/visual/scenarioDefinitions1.ts
---

## Cream text meets a 4.5 to 1 contrast and keeps the body colour after an admonition

### Normative behavior

When the Cream theme mode is shown, the extension SHALL give the foreground, description, link, six chart and error text colours a contrast of at least 4.5 to 1 on each of the editor, code block, block quote, hover widget, widget and input surfaces, and draw the paragraph after an admonition in the body text colour.

### Scenario (nominal): Variables of the stylesheet

- GIVEN the Cream colour variables
- WHEN every text colour is compared with every surface
- THEN all 60 pairs reach 4.5 to 1, and so do the button, secondary button, hover widget, input and icon pairs

### Scenario (nominal): Rendered pages

- GIVEN the Cream scenarios theme-zoom/v02 to v06
- WHEN the page, note, inline code, fenced block, link and toolbar text colours are compared with their backgrounds, translucent ones flattened over the page
- THEN every pair reaches 4.5 to 1

### Scenario (nominal): Gallery on Cream

- GIVEN the admonition gallery forced to Cream in a 900 px pane (visual scenario theme-zoom/v03)
- WHEN the preview is rendered
- THEN the paragraph after each admonition has the body text colour

### Scenario (boundary): Other themes

- GIVEN the admonition gallery in a light or a dark theme
- WHEN the same page-wide gallery check runs
- THEN the paragraph after each admonition has the body text colour there too

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-025: the Cream palette whose contrast is stated here.
- SwRS-MDOKFSTUDIO-MYST-006: the panel colour distinct from the page and the one title line of an admonition.

### Verification notes

- Method: test/core/preview/creamTheme.test.ts, unit test `cream text and background pairs meet WCAG AA 4.5:1` (variables of the stylesheet).
- Method: test/visual/capture_page_checks.py, visual scenarios theme-zoom/v02 to v06 (contrast computed in check_forced_cream_theme: rendered pages). Only Cream has a contrast check; the Dark and White palettes have none.
- Method: test/visual/scenarioDefinitions1.ts, visual scenario theme-zoom/v03 (gallery on Cream, and the other themes): the check on the paragraph after an admonition is part of the page-wide gallery checks (test/visual/capture_support.py), which run on every scenario with admonitions, not only on Cream.
- Criteria: Every computed ratio is at least 4.5. The computed colour of the paragraph after each admonition equals that of the first plain paragraph.
