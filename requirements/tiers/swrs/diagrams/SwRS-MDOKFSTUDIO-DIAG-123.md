---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-123
uuid: 3dbcc9ea-705d-4727-8eb6-2e8d6d4aa09c
title: Charts are live themed SVG views with a hover detail and errors in place
description: 'When the page draws a Vega-Lite or Vega chart, it SHALL replace the
  specification text with one live SVG view whose background, text, axis and mark
  colours follow the preview theme and whose legend, axis and title text sizes follow
  the body text size, show a hover detail box with the fields of the mark under the
  pointer (a Vega-Lite chart by default, a full Vega chart only where its own spec
  encodes a tooltip, never for a chart that sets tooltip to null), bind no event of
  the chart, and show the error message in place of the chart when the specification
  is invalid.'
project: MDOKFSTUDIO
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-015
depends_on:
- SwRS-MDOKFSTUDIO-DIAG-009
scenarios:
- id: S1
  title: A chart is drawn as a themed picture
- id: S2
  title: A theme change draws again
- id: S3
  title: An invalid specification
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/chartTooltipStyles.markers.ts
- src/page/modules/chartError.ts
- src/page/modules/chartTheme.ts
- src/page/modules/chartTooltip.ts
- src/page/modules/vegaChart.ts
- src/page/modules/vegaPreview.ts
- src/page/modules/vegaView.ts
tested_in_files:
- test/integration/realInput/liveChart.ts
- test/page/chartCsp.test.ts
- test/page/modules/chartError.test.ts
- test/page/modules/chartTooltip.test.ts
- test/page/modules/vegaChart.test.ts
default_owner_email: gaetan@xeberon.net
---

## Charts are live themed SVG views with a hover detail and errors in place

### Normative behavior

When the page draws a Vega-Lite or Vega chart, it SHALL replace the specification text with one live SVG view (an svg inside a view element, never an image and never a data URL) whose background, text, axis and mark colours follow the preview theme and whose legend, axis and title text sizes follow the body text size (legend label 0.93, axis label 0.85 and title 1.15 times the body size), with horizontal discrete x labels and the subtitle in the label colour, and a specification's own config wins; the view SHALL show a hover detail box (a fixed box under the body, in the colours and font size of the page, that never takes the pointer) listing the fields of the mark under the pointer, for a Vega-Lite chart by default, for a full Vega chart only where its own spec encodes a tooltip, and for no chart that sets tooltip to null; the view SHALL bind no event, signal or link of the chart; and the page SHALL show the error message in place of the chart when the specification is invalid.

### Scenario S1 (nominal): A chart is drawn as a themed picture

- GIVEN a page with a Vega-Lite chart and a Vega chart in the Cream theme
- WHEN the chart runtime has run
- THEN each chart element holds one div of the class myst-vega-view with a live svg (max-width 100%, centred) and no img, data-render-state is rendered, the axis text and title use the foreground of the page, the marks use the link colour of the page, the background is transparent and the font is the page font, and the page logs no policy violation, also after a hover and a theme change

### Scenario S2 (nominal): A theme change draws again

- GIVEN charts drawn in the light theme
- WHEN the page background and foreground change to a dark theme
- THEN each chart is drawn again with the new colours

### Scenario (nominal): A hover shows the fields of the mark

- GIVEN a drawn Vega-Lite grouped bar chart in the Cream theme, a Vega chart whose symbol mark encodes a tooltip and whose line mark does not, and a Vega-Lite chart whose mark sets tooltip to null
- WHEN the pointer rests on a bar, then leaves it, then rests on a symbol, a line mark and the chart with tooltip null, then the page scrolls with the box shown
- THEN the box lists one row per field of the bar (Quarter, Product, Revenue (k$) and the legend title) in the text of the page, its background is the page background and its text size is the legend label size, the box hides when the pointer leaves or the page scrolls or its content is replaced, the symbol shows its row, the line and the chart with tooltip null show no box, the border is stronger in the dark modes, and no policy violation is logged

### Scenario (nominal): A theme change shows the cached view

- GIVEN charts drawn in one theme, then another theme
- WHEN the first theme returns
- THEN the second theme gives a new view and the return gives the very same svg element as the first drawing

### Scenario (nominal): The text sizes follow the page

- GIVEN a chart with a colour legend and a discrete x axis, on a page whose body text is 14 px, and a spec that sets its own config legend label size
- WHEN the chart is drawn, then the Markdown font size is set to 18 px and the preview is zoomed to 150 %
- THEN the legend label is 13 px, the axis label 11.9 px and the title 16.1 px, the discrete x labels are horizontal, the subtitle has the label colour, the charts are drawn again with larger text at 18 px (legend label 16.7) and at 150 % (legend label 19.5 at 14 px), a body size that does not parse gives 13, and the spec's own label size wins over the page-relative one

### Scenario S3 (refusal): An invalid specification

- GIVEN a chart whose text is not valid JSON or YAML, or that Vega-Lite or Vega rejects
- WHEN the page draws it
- THEN data-render-state is error and the chart shows one paragraph Unable to render the chart. with a details section holding the reason as plain text, the document is unchanged and no Chart source section is shown in the preview

| Input | Outcome |
| --- | --- |
| JSON or YAML specification | the same chart |
| an image mark with a url | refused with a message; data:image pictures are drawn |

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-009: an unchanged chart is not drawn again, a detached view of the same source and theme is shown again, and a drawing that a newer theme replaced while it ran is cached and not shown

### Verification notes

- Method: test/page/modules/vegaChart.test.ts (SVG with the theme colours, YAML equals JSON, a Vega spec, the invalid specifications reject with a reason, the config follows the theme)
- Method: test/page/modules/vegaChart.test.ts (the text size table at 14 and 18 px, the 13 fallback, the subtitle colour, horizontal labels, no mark tooltip, a spec's own legend size wins in Vega-Lite and Vega)
- Method: test/page/chartCsp.test.ts (the live views and no image, no policy violation after a hover and a theme change, the error in place, a theme change and the return to the cached view, two identical charts with two views, the hover rows and the box colours and size, the symbol, line and tooltip null cases, the scroll hide, the dark border, the legend and axis sizes at 14 px and 18 px and a 150 % zoom, horizontal Quarter labels, and in the page runtime the zoom redraw, the click on a chart in reading and edit mode, the find that skips the chart text and a content patch that keeps the views, in a real page)
- Method: test/page/modules/chartTooltip.test.ts (the rows as text, the null value, the placement and the edge flip, the single shared element, the hide on scroll and on replaced content)
- Method: test/page/modules/vegaChart.test.ts (the Vega-Lite tooltip default and its null override, a full Vega chart with tooltips only where encoded, the chart runtime, no event binding)
- Method: test/page/modules/chartError.test.ts (one error with one details, the exact message, plain text, the styles of the view and of the hover box)
- Method: real VS Code scenario live-chart in test/integration/realInput/liveChart.ts (a Vega-Lite chart in the Studio editor is a live `.myst-vega-view > svg`, a theme change draws it again under a `securitypolicyviolation` listener, the pointer on a bar shows the hover rows, no violation is recorded; runs in the integration job)
- Criteria: Each chart is one live SVG view in the colours of the page and with text sizes relative to the body text, drawn again on a theme or text size change only, a hover shows the fields of the mark without a policy violation, and an invalid chart shows its reason in place.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-015](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-015.md): A writer reads charts and drawings in the page
- Depends on:
  - [SwRS-MDOKFSTUDIO-DIAG-009](SwRS-MDOKFSTUDIO-DIAG-009.md): Diagrams are drawn once per source and theme and late results are dropped
<!-- okf:links:end -->
