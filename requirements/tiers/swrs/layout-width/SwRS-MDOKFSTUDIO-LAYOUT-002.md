---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-002
uuid: 48f423ae-3b6d-4ef8-b0e1-4f50c3011df8
title: The text column width follows the maxContentWidth setting
description: When a preview page is built or the setting
  markdownOkfSchemaStudio.preview.maxContentWidth changes, the extension SHALL
  normalise the setting to a whole number of pixels from 0 to 2400 (960 when it
  is negative or not a finite number), write it into the page style as the width
  rule, and show a text column exactly that wide and centred in a wider pane,
  with no cap when the value is 0.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/configuration/settingsRegistry.ts
- src/core/preview/previewStyles.ts
- src/core/preview/styles/pageChromeStyles.ts
- src/session/hostEvents.ts
- src/session/webview.ts
tested_in_files:
- test/core/configuration/previewConfiguration.test.ts
- test/core/preview/previewStyles.test.ts
- test/session/diagReq.settings.requirements.test.ts
- test/session/previewRuntimeFile.test.ts
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## The text column width follows the maxContentWidth setting

### Normative behavior

When a preview page is built or the setting markdownOkfSchemaStudio.preview.maxContentWidth changes, the extension SHALL normalise the setting to a whole number of pixels from 0 to 2400 (960 when it is negative or not a finite number), write it into the page style as the width rule, and show a text column exactly that wide and centred in a wider pane, with no cap when the value is 0.

### Scenario (nominal): Default cap in a wide pane
- GIVEN the setting maxContentWidth at its default 960, Margin width mode, 100 percent zoom and a 1600 px pane
- WHEN the preview is rendered
- THEN the content column is 960 px wide and the free space is split equally left and right

### Scenario (nominal): Configured cap above the default
- GIVEN maxContentWidth set to 1400 and a 2000 px pane (visual scenario v85)
- WHEN the preview is rendered
- THEN the content column is exactly 1400 px wide and centred; in a pane narrower than the cap the column takes the pane width instead

### Scenario (boundary): Normalisation of the setting
| Input | Outcome |
| --- | --- |
| 2500 | 2400 |
| 1049.6 | 1050 |
| 2400 | stays 2400 |
| 0 | stays 0 (0 is not cut or replaced) |
| -1 | 960, the default |
| the text wide | 960, the default |
| NaN | 960, the default |

### Scenario (boundary): Zero lifts the limit
- GIVEN maxContentWidth set to 0 and a 2000 px pane
- WHEN the width rule is built and the preview is rendered
- THEN the rule reads :root { --sphinx-preview-content-max-width: none; } and the column is not limited to a pixel width
- AND with maxContentWidth set to 1 the rule reads --sphinx-preview-content-max-width: 1px, because only 0 lifts the limit

### Scenario (nominal): Configured width in the page style
- GIVEN maxContentWidth set to 1200
- WHEN the page HTML is built
- THEN the page style ends with :root { --sphinx-preview-content-max-width: 1200px; }

### Scenario (refusal): Invalid configured width in the page style
- GIVEN maxContentWidth set to a negative number
- WHEN the page HTML is built
- THEN the page style carries 960px, the default

### Scenario (nominal): Open preview follows a change of the setting
- GIVEN an open preview that has a last good render and maxContentWidth changed from 960 to 1200
- WHEN the settings change event arrives
- THEN the session re-reads the preview configuration, schedules the incoming-changes refresh, and updates the preview from the last good render; the page shell now carries the new width rule, so the whole page is replaced (no in-place content patch)

### Scenario (refusal): No last good render or unrelated section
- GIVEN an open preview that has no last good render yet, or a settings change outside the preview, PlantUML and frontmatter sections
- WHEN the settings change event arrives
- THEN the preview is not updated (no change for an unrelated section; nothing to redraw without a last good render)

### Known issues
- Known issue: The titles of visual scenarios v05 and v06 say full width but they assert only the 960 px column.
- Known issue: The decimal rounding has no unit test.
- Known issue: The negative value has no unit test.
- Known issue: docs/user/settings.md says that with the setting at 0 the three width modes look the same, which is not exact: Full width keeps a 16 px side gutter where Margin and Auto keep a gutter of 16 to 78 px.
- Known issue: The unit test asserts the rule text for 0 and 1200 only; the rendered column at 0 has no automated check.
- Known issue: The full-page test PERF-11 matches only the number 720 in the inline style, not the whole text of the rule; the whole rule text is asserted on the builder alone.
- Known issue: No automated test changes the setting on an open preview.
- Known issue: The width rule is an inline style of the page shell and the shell key includes it, so a changed rule makes the content patch planner return nothing and the whole page is replaced; the scroll position is restored by the normal page reload path.

### Verification notes
- Method: test/visual/scenarioDefinitions1.ts and test/visual/scenarioDefinitions2.ts (default cap, configured cap above the default): visual scenarios v05 and v06 (960 px column in a 1600 px pane) and v85 (1400 px column in a 2000 px pane), plus a unit test of the column rule.
- Method: test/core/configuration/previewConfiguration.test.ts (normalisation): the configuration reader (2500 gives 2400, 0 gives 0 and NaN gives 960 are asserted); the other inputs follow from the normalisation function.
- Method: test/core/preview/previewStyles.test.ts (zero lifts the limit, configured width in the page style, invalid configured width): the width rule builder for 0 and 1200; the column behaviour follows from the CSS.
- Method: test/session/previewRuntimeFile.test.ts (configured width in the page style): the full-page test PERF-11 (a page built with maxContentWidth 720 carries 720 in its inline style, which holds the width rule only); the call site passes preview.configuration.maxContentWidth.
- Method: test/session/diagReq.settings.requirements.test.ts (open preview follows a change, no last good render): the unit test `a preview setting change reads the width again and updates the preview from its last good render`.
- Criteria: The column box measures the cap in a wider pane and never exceeds the pane; the normalised value is an integer between 0 and 2400, or 960 for every negative, non-numeric or non-finite input; the generated rule is none for 0 and a pixel value otherwise; the page style contains exactly one width rule; the settings handler re-reads the section and calls the preview update with the last good render, only when one exists.
