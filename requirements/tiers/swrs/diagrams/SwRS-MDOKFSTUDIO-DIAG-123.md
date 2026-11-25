---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-123
uuid: 3dbcc9ea-705d-4727-8eb6-2e8d6d4aa09c
title: Charts are drawn as themed SVG pictures with errors in place
description: 'When the page draws a Vega-Lite or Vega chart, it SHALL replace the
  specification text with one SVG image whose background, text, axis and mark colours
  follow the preview theme and whose legend, axis and title text sizes follow the
  body text size, and show the error message in place of the chart when the specification
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
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/chartError.ts
- src/page/modules/chartTheme.ts
- src/page/modules/vegaChart.ts
- src/page/modules/vegaPreview.ts
tested_in_files:
- test/page/chartCsp.test.ts
- test/page/modules/chartError.test.ts
- test/page/modules/vegaChart.test.ts
default_owner_email: gaetan@xeberon.net
---

## Charts are drawn as themed SVG pictures with errors in place

### Normative behavior

When the page draws a Vega-Lite or Vega chart, it SHALL replace the specification text with one SVG image whose background, text, axis and mark colours follow the preview theme and whose legend, axis and title text sizes follow the body text size (legend label 0.93, axis label 0.85 and title 1.15 times the body size), with horizontal discrete x labels and the subtitle in the label colour, and a specification's own config wins, and show the error message in place of the chart when the specification is invalid.

### Scenario (nominal): A chart is drawn as a themed picture

- GIVEN a page with a Vega-Lite chart and a Vega chart in the Cream theme
- WHEN the chart runtime has run
- THEN each chart element holds one img of the class myst-vega-image whose source is an SVG data URI (max-width 100%, centred), data-render-state is rendered, the axis text and title use the foreground of the page, the marks use the link colour of the page, the background is transparent and the font is the page font

### Scenario (nominal): A theme change draws again

- GIVEN charts drawn in the light theme
- WHEN the page background and foreground change to a dark theme
- THEN each chart is drawn again with the new colours

### Scenario (nominal): The text sizes follow the page

- GIVEN a chart with a colour legend and a discrete x axis, on a page whose body text is 14 px, and a spec that sets its own config legend label size
- WHEN the chart is drawn, then the Markdown font size is set to 18 px and the preview is zoomed to 150 %
- THEN the legend label is 13 px, the axis label 11.9 px and the title 16.1 px, the discrete x labels are horizontal, the subtitle has the label colour, the charts are drawn again with larger text at 18 px (legend label 16.7) and at 150 % (legend label 19.5 at 14 px), a body size that does not parse gives 13, and the spec's own label size wins over the page-relative one

### Scenario (refusal): An invalid specification

- GIVEN a chart whose text is not valid JSON or YAML, or that Vega-Lite or Vega rejects
- WHEN the page draws it
- THEN data-render-state is error and the chart shows one paragraph Unable to render the chart. with a details section holding the reason as plain text, the document is unchanged and no Chart source section is shown in the preview

| Input | Outcome |
| --- | --- |
| JSON or YAML specification | the same chart |
| an image mark with a url | refused with a message; data:image pictures are drawn |

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-009: an unchanged chart is not drawn again, and a drawing that a newer theme replaced while it ran is cached and not shown

### Verification notes

- Method: test/page/modules/vegaChart.test.ts (SVG with the theme colours, YAML equals JSON, a Vega spec, the invalid specifications reject with a reason, the config follows the theme)
- Method: test/page/modules/vegaChart.test.ts (the text size table at 14 and 18 px, the 13 fallback, the subtitle colour, horizontal labels, no mark tooltip, a spec's own legend size wins in Vega-Lite and Vega)
- Method: test/page/chartCsp.test.ts (the pictures, the error in place, a theme change, the legend and axis sizes at 14 px, 18 px and a 150 % zoom, horizontal Quarter labels, in a real page)
- Method: test/page/modules/chartError.test.ts (one error with one details, the exact message, plain text, the styles)
- Criteria: Each chart is one SVG image in the colours of the page and with text sizes relative to the body text, drawn again on a theme or text size change only, and an invalid chart shows its reason in place.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-015](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-015.md): A writer reads charts and drawings in the page
- Depends on:
  - [SwRS-MDOKFSTUDIO-DIAG-009](SwRS-MDOKFSTUDIO-DIAG-009.md): Diagrams are drawn once per source and theme and late results are dropped
<!-- okf:links:end -->
