---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-001
uuid: 8179075e-3296-46e5-8137-373aee0dd16b
title: "The Theme button cycles Current, Dark, White and Cream"
description: "When the reader presses the Theme button, the extension SHALL switch
  the preview theme mode in the order Current, Dark, White, Cream and back to Current,
  and show the active mode and the next one on the button."
project: markdown-okf-schema-studio
scope: theme-zoom
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
- StRS-MDOKFSTUDIO-THEME-004
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentLayoutStyles.ts
- src/page/features/themeMode.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/integration/realInput/markers.ts
- test/page/diagReq.themeZoom.requirements.test.ts
- test/page/runtimePageControls.test.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## The Theme button cycles Current, Dark, White and Cream

### Normative behavior

When the reader presses the Theme button, the extension SHALL switch the preview theme mode in the order Current, Dark, White, Cream and back to Current, and show the active mode and the next one on the button.

### Scenario (nominal): Four clicks

- GIVEN the page in Current mode (a workspace that stored Current) and the Theme button on toolbar row 3
- WHEN the button is clicked four times
- THEN the attribute data-sphinx-preview-theme-mode of the html element reads dark, white, cream and current in turn, and the attribute data-theme-mode of the button follows it

### Scenario (boundary): Wrap-around from Cream

- GIVEN the page in Cream mode (the default of a fresh workspace)
- WHEN the button is clicked once
- THEN the mode is Current again; the cycle never stops at Cream and never skips a mode

### Scenario (nominal): The button names the active mode and the next one

- GIVEN the page in any theme mode
- WHEN the button attributes are read
- THEN aria-label reads "Preview theme: {Mode} theme" and title and data-tooltip both read "{Mode} theme (click for {next mode} theme)", with the next mode name in lower case, as in the table

| Mode shown | aria-label | title and data-tooltip |
| --- | --- | --- |
| Current | Preview theme: Current theme | Current theme (click for dark theme) |
| Dark | Preview theme: Dark theme | Dark theme (click for white theme) |
| White | Preview theme: White theme | White theme (click for cream theme) |
| Cream (fresh workspace) | Preview theme: Cream theme | Cream theme (click for current theme) |

### Scenario (nominal): One icon per mode

- GIVEN the toolbar markup and the page in Cream mode on a dark VS Code theme (visual scenario theme-zoom/v02)
- WHEN the visible icons of the Theme button are listed
- THEN exactly one icon is displayed and its data-theme-icon is cream; on a light host forced to Dark (visual scenario theme-zoom/v08) it is dark

### Scenario (boundary): Icon set is well formed

- GIVEN the markup of the Theme button
- WHEN its children are read
- THEN the button holds exactly four svg icons (current, dark, white and a cream coffee cup), in the order current, dark, white, cream, none nested in another, and nothing else

### Scenario (refusal): A theme mode the page does not know

- GIVEN the page is handed a theme mode that is none of current, dark, white and cream
- WHEN the preview page starts, or is asked to apply that mode directly
- THEN the mode is ignored and the next known source is used, the saved mode first and Cream last, as in the table

| Input | Outcome |
| --- | --- |
| Boot context with an unknown mode and no saved mode | The mode is cream |
| Boot context with an unknown mode and a saved state holding white | The mode is white |
| The page is asked to apply an unknown mode directly | The page shows cream |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-169: the host stores the mode a press of the button chooses (previewThemeModeChanged, see SwRS-MDOKFSTUDIO-THEME-013).
- SwRS-MDOKFSTUDIO-LIFE-170: a new page starts from the stored mode, then the saved state, then the default.
- SwRS-MDOKFSTUDIO-TRUST-006: a read-only preview keeps the Theme button.
- SwRS-MDOKFSTUDIO-THEME-016: the colours of Current mode.
- SwRS-MDOKFSTUDIO-THEME-025: the colours of the forced modes.

### Verification notes

- Method: test/page/runtimeScroll.test.ts, unit test `cycles preview theme modes and restores the saved selection` (four clicks, wrap-around from Cream, the Current, Dark and White labels, the Cream tooltip).
- Method: test/page/runtimePageControls.test.ts, unit test `fresh workspace: the toolbar starts collapsed and the preview theme starts in cream` (the Cream label and tooltip).
- Method: test/integration/realInput/markers.ts, real-input captures theme-zoom/r01 to r08 click the real button through the cycle (four clicks, wrap-around).
- Method: test/core/preview/creamTheme.test.ts, unit tests `cream is an accepted preview theme mode with its own coffee toolbar icon` and `toolbar theme icons are well-formed sibling svgs, one per mode` (icon set well formed); test/visual/scenarioDefinitions1.ts, visual scenarios theme-zoom/v02 and v08 (one icon per mode, visible icon asserted); the Current and White icons are not asserted by a visual scenario.
- Method: test/page/diagReq.themeZoom.requirements.test.ts, unit test `an unknown theme mode is ignored: the saved mode comes next, Cream last` (the three rows of the unknown mode table).
- Criteria: The mode attribute and the button attribute equal the next mode of the fixed order after each click, and the fifth state equals the first. The three attributes carry exactly the listed texts for each mode. The list of visible icons equals the active mode and the four icons appear once each in the fixed order. An unknown mode never shows.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-THEME-002](../../strs/theme-zoom/StRS-MDOKFSTUDIO-THEME-002.md): A reader chooses a preview theme that paints the whole page readably
  - [StRS-MDOKFSTUDIO-THEME-004](../../strs/theme-zoom/StRS-MDOKFSTUDIO-THEME-004.md): The theme choice holds for the workspace and survives slow loads and bad values
- Depends on:
  - [SwRS-MDOKFSTUDIO-LIFE-169](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-169.md): A view choice made on the page is stored for the workspace
  - [SwRS-MDOKFSTUDIO-LIFE-170](../lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-170.md): A new page starts each view choice from the panel, stored or default value
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
<!-- okf:links:end -->
