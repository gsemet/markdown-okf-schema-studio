---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-123
uuid: 3dbcc9ea-705d-4727-8eb6-2e8d6d4aa09c
title: Charts are drawn as themed SVG pictures with errors in place
description: When the page draws a Vega-Lite or Vega chart, it SHALL replace the
  specification text with one SVG image whose background, text, axis and mark
  colours follow the preview theme, draw an unchanged chart again only when its
  source, data or theme changed, and show the error message in place of the
  chart when the specification is invalid.
project: MDOKFSTUDIO
scope: diagrams
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/chartError.ts
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

When the page draws a Vega-Lite or Vega chart, it SHALL replace the specification text with one SVG image whose background, text, axis and mark colours follow the preview theme, draw an unchanged chart again only when its source, data or theme changed, and show the error message in place of the chart when the specification is invalid.

### Scenario (nominal): A chart is drawn as a themed picture

- GIVEN a page with a Vega-Lite chart and a Vega chart in the Cream theme
- WHEN the chart runtime has run
- THEN each chart element holds one img of the class myst-vega-image whose source is an SVG data URI (max-width 100%, centred), data-render-state is rendered, the axis text and title use the foreground of the page, the marks use the link colour of the page, the background is transparent and the font is the page font

### Scenario (nominal): A theme change draws again

- GIVEN charts drawn in the light theme
- WHEN the page background and foreground change to a dark theme
- THEN each chart is drawn again with the new colours; a chart whose source, data and theme are unchanged is not drawn again by a content update

### Scenario (refusal): An invalid specification

- GIVEN a chart whose text is not valid JSON or YAML, or that Vega-Lite or Vega rejects
- WHEN the page draws it
- THEN data-render-state is error and the chart shows one paragraph Unable to render the chart with a details section holding the reason as plain text, the document is unchanged and the Chart source section still shows the text

| Input | Outcome |
| --- | --- |
| JSON or YAML specification | the same chart |
| an image mark with a url | refused with a message; data:image pictures are drawn |
| a drawing that a newer theme replaced while it ran | cached, not shown |

### Verification notes

- Method: test/page/modules/vegaChart.test.ts (SVG with the theme colours, YAML equals JSON, a Vega spec, the invalid specifications reject with a reason, the config follows the theme)
- Method: test/page/chartCsp.test.ts (the pictures, the error in place and a theme change in a real page)
- Method: test/page/modules/chartError.test.ts (one error with one details, plain text, the styles)
- Criteria: Each chart is one SVG image in the colours of the page, drawn again on a theme change only, and an invalid chart shows its reason in place.
