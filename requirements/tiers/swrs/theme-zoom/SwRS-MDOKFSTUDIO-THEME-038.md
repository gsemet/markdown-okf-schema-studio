---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-038
uuid: eaf4ffdd-66a9-4652-b38c-1f4e28184317
title: "Zoom in and out change the zoom by 10 points within limits"
description: "When the reader presses the Zoom in button below 200 % or the Zoom out
  button above 70 %, the extension SHALL change the zoom by 10 percentage points,
  set the zoom variable and the html attribute data-sphinx-preview-zoom to the new
  value, name the value of the next click in the button tooltips and disable the button
  at its limit."
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-011
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/viewControls.ts
tested_in_files:
- test/page/diagReq.themeZoom.requirements.test.ts
- test/page/runtimePageControls.test.ts
default_owner_email: gaetan@xeberon.net
---

## Zoom in and out change the zoom by 10 points within limits

### Normative behavior

When the reader presses the Zoom in button below 200 % or the Zoom out button above 70 %, the extension SHALL change the zoom by 10 percentage points, set the zoom variable and the html attribute data-sphinx-preview-zoom to the new value, name the value of the next click in the button tooltips and disable the button at its limit.

### Scenario (nominal): Zoom in, one step

- GIVEN a page at 100 % and the Zoom in button on toolbar row 3 (accessible name "Zoom in")
- WHEN the button is clicked
- THEN --sphinx-preview-zoom is 1.1, data-sphinx-preview-zoom is 110 and one previewViewPreferenceChanged message with value 110 is posted (stored under SwRS-MDOKFSTUDIO-LIFE-169)

### Scenario (boundary): Zoom in, last step

- GIVEN a page at 190 %
- WHEN the button is clicked
- THEN the zoom is 200 and the button is disabled

### Scenario (nominal): Zoom out, two steps

- GIVEN a page at 110 % and the Zoom out button on toolbar row 3 (accessible name "Zoom out")
- WHEN the button is clicked twice
- THEN data-sphinx-preview-zoom reads 100, then 90 and the last posted message carries the value 90

### Scenario (boundary): Zoom out, last step

- GIVEN a page at 80 %
- WHEN the button is clicked
- THEN the zoom is 70, --sphinx-preview-zoom is 0.7 and the button is disabled

### Scenario (boundary): The zoom a page starts at

- GIVEN a page start as in the table
- WHEN the page starts
- THEN the zoom is the one in the table (the stored and saved values are chosen under SwRS-MDOKFSTUDIO-LIFE-170)

| Input | Outcome |
| --- | --- |
| No panel state and no initial view preference | --sphinx-preview-zoom is 1, data-sphinx-preview-zoom is 100 and both zoom buttons are enabled |
| An initial zoom that is not a finite number | The zoom is 100 |

### Scenario (nominal): The tooltips name the value a click gives

- GIVEN a page at a zoom as in the table
- WHEN the title and data-tooltip of each zoom button are read
- THEN they are set together and equal the texts in the table; the accessible name stays "Zoom in" and "Zoom out" at every value

| Input | Zoom in | Zoom out |
| --- | --- | --- |
| Page at 100 % | Zoom in (110 %) | Zoom out (90 %) |
| Page at 100 % after one click on Zoom in | Zoom in (120 %) | Zoom out (100 %) |
| Page at 70 % | Zoom in (80 %) | Zoom out (minimum 70 %) |
| Page at 200 % | Zoom in (maximum 200 %) | Zoom out (190 %) |

### Scenario (refusal): A click at a limit changes nothing

- GIVEN a page at 70 %, and a page started at 200 %
- WHEN the Zoom out button of the first page is read and clicked, and the Zoom in button of the second page is read
- THEN the Zoom out button is disabled, the zoom stays 70 and no message is posted; the Zoom in button is disabled, --sphinx-preview-zoom is 2 and Zoom out is enabled

### Scenario (nominal): A zoom change keeps the reading line

- GIVEN a page scrolled to a paragraph, with no scroll anchor set or with a scroll anchor already set
- WHEN the reader changes the zoom
- THEN without an anchor the page takes the source line at the reading line as its anchor and applies it after the layout changed, so the same text stays at the reading line; with an anchor the existing anchor is kept and applied again

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-043: what the zoom does to the text and the column.
- SwRS-MDOKFSTUDIO-LIFE-169: the host stores the zoom the buttons post.
- SwRS-MDOKFSTUDIO-LIFE-170: a new page starts from the saved or stored zoom.

### Verification notes

- Method: test/page/runtimePageControls.test.ts, unit test `T08: zoom buttons set the zoom variable, post the preference and keep the state` (zoom in 100 to 110, zoom out 110 to 100 to 90, the start variable 1, the attribute 100 and the tooltips between the limits; that both buttons are enabled at start and that no zoom message is posted at start are not asserted); unit test `T08: the zoom limits disable the buttons and post nothing more` (80 to 70, the limit click, the page started at 200). The step 190 to 200 is untested (no test clicks it; code in change() of src/page/modules/viewControls.ts). The non-number start is untested. The two limit tooltip texts are not asserted.
- Method: test/page/diagReq.themeZoom.requirements.test.ts, unit test `a zoom change keeps the text at the reading line, with or without an anchor already set` (both anchor cases).
- Criteria: The variable, the attribute and the posted value equal the old zoom plus or minus 10. The zoom equals 100 and no zoom message is posted at start. The tooltip texts (title and data-tooltip, set together) equal the listed strings. The disabled flags are set at the limits only and the message count does not change after a click at the limit.
