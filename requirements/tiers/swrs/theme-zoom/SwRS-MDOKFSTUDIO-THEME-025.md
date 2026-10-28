---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-025
uuid: cf52969f-7d45-4b48-b509-5b22ec13cb6f
title: "Dark, White and Cream paint the whole page the same on any VS Code theme"
description: "When a forced theme mode (Dark, White or Cream) is shown, the extension
  SHALL paint the page, the floating toolbar and its pressed button, the sticky heading
  band and the note panels from the palette of that mode alone, so that the White
  mode paints a white page with the dark foreground text, light panels and a light
  colour scheme, and every forced mode looks the same on a dark and on a light VS
  Code theme."
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-002
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/pageChromeStyles.ts
tested_in_files:
- test/core/preview/creamTheme.test.ts
- test/core/preview/diagReq.styles.requirements.test.ts
- test/core/preview/previewStyles.test.ts
- test/core/preview/themeTokens.test.ts
- test/integration/realInput/markers.ts
- test/visual/capture_page_checks.py
- test/visual/scenarioDefinitions1.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
---

## Dark, White and Cream paint the whole page the same on any VS Code theme

### Normative behavior

When a forced theme mode (Dark, White or Cream) is shown, the extension SHALL paint the page, the floating toolbar and its pressed button, the sticky heading band and the note panels from the palette of that mode alone, so that the White mode paints a white page with the dark foreground text, light panels and a light colour scheme, and every forced mode looks the same on a dark and on a light VS Code theme.

### Scenario (nominal): White on a dark host

- GIVEN the handbook document forced to White on a dark VS Code theme in a 900 px pane (visual scenario theme-zoom/v01), and the frontmatter fixture forced to White on a dark host (visual scenario theme-zoom/v07)
- WHEN the preview is rendered
- THEN the body background is rgb(255, 255, 255), the page text and the text of the first admonition are rgb(31, 31, 31) and the admonition panel is light (every colour channel at least 180); with the properties table the page background is white, the text is the dark foreground and the first admonition panel is light, as in the handbook

### Scenario (nominal): Dark on a light host and on a dark host

- GIVEN the handbook forced to Dark while the VS Code theme stays light in a 900 px pane (visual scenario theme-zoom/v08), and Dark mode on a dark VS Code theme (real-input capture theme-zoom/r03)
- WHEN the preview is rendered
- THEN on the light host the html attribute data-sphinx-preview-theme-mode is dark, the body background is rgb(30, 30, 30), the text is rgb(212, 212, 212), the colour scheme is dark, the first admonition is drawn on a dark panel and the h1 heading is readable on it; on the dark host the page is rgb(30, 30, 30) and the toolbar rgb(37, 37, 38), the same as on a light host

### Scenario (nominal): Cream on a dark host

- GIVEN the handbook forced to Cream on a dark VS Code theme in a 900 px pane (visual scenarios theme-zoom/v02 to v06, also with the admonition gallery, code and tables, the properties fixture and an open paragraph editor)
- WHEN the preview is rendered
- THEN the body background is rgb(245, 241, 232), the page and note text rgb(43, 42, 39), the links and inline code rgb(161, 78, 50), the fenced block background rgb(237, 230, 218) and the colour scheme is light

The edition palette's mode selector uses the forced palette's widget background, page foreground
and widget border rather than the host dropdown colours. In Cream these are rgb(251, 248, 241),
rgb(43, 42, 39) and rgb(214, 205, 189), even when the host dropdown is dark. Dark and White apply
the same rule with their own palette; Current mode continues to follow the host.

### Scenario (boundary): Warm paper rule

- GIVEN the Cream colour variables of the stylesheet
- WHEN the editor background is read
- THEN its red channel is above 0xE8 and red is greater than green, which is greater than blue

### Scenario (nominal): Toolbar colours of the forced modes

- GIVEN a forced mode shown on a VS Code theme as in the table
- WHEN the toolbar is drawn
- THEN its colours are those of the mode and not the VS Code ones

| Input | Outcome |
| --- | --- |
| White mode on a dark VS Code theme | Toolbar background rgb(243, 243, 243), text rgb(51, 51, 51) |
| Dark mode on a light VS Code theme | Toolbar background rgb(37, 37, 38), pressed button rgb(14, 99, 156) |
| Dark mode on a dark VS Code theme (capture theme-zoom/r03) | Toolbar background rgb(37, 37, 38) |

### Scenario (nominal): Sticky heading band and borders

- GIVEN a forced mode shown, the sticky heading band drawn, and the top, right and bottom border colours of the toolbar and of every note panel read
- WHEN the mode is as in the table
- THEN the band and the borders take the colours in the table, and they are the same on the default dark and the default light VS Code themes

| Input | Outcome |
| --- | --- |
| Sticky heading band, White mode on a dark host | Background is the white page colour, text is the dark page text |
| Sticky heading band, Dark mode on a light host | Background is rgb(30, 30, 30) |
| Toolbar and note panel borders, Dark | rgb(69, 69, 69) |
| Toolbar and note panel borders, White | rgb(200, 200, 200) |
| Toolbar and note panel borders, Cream | rgb(214, 205, 189) |

### Scenario (boundary): The same colours on both hosts

- GIVEN Dark, White and Cream in turn on the default dark and the default light VS Code themes, and a host that maps the tokens to its own palette
- WHEN the page and toolbar colours are read
- THEN on both hosts they equal the colours of the scenarios above, and the mode colours do not depend on the host mapping

### Scenario (boundary): The three mode blocks of the stylesheet

- GIVEN the Dark, White and Cream mode blocks of the stylesheet (selectors `html[data-sphinx-preview-theme-mode="{mode}"], ... body`)
- WHEN the variable names and the values of each block are read
- THEN the lists of Dark and White equal the list of Cream, so no mode leaves a host colour in place, the toolbar variables included; every variable White overrides has a Cream value and Cream is light; each block declares --studio-editor-background as a six digit hex colour and contains no --vscode-

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-031: the contrast of the Cream text.
- SwRS-MDOKFSTUDIO-THEME-034: the token map, which the forced modes bypass with literal hex values.
- SwRS-MDOKFSTUDIO-THEME-016: Current mode, which follows the VS Code theme.

### Verification notes

- Method: test/core/preview/previewStyles.test.ts, `forced preview themes supply dropdown colors independently of the host` checks the dropdown background and foreground overrides in all three forced palettes.
- Method: test/visual/scenarioDefinitions1.ts and test/visual/capture_page_checks.py, visual scenarios theme-zoom/v01 and v07 (check_forced_white_theme: White on a dark host and with a properties table), theme-zoom/v02 to v06 (check_forced_cream_theme: Cream on a dark host). The fields of the properties table belong to frontmatter-schema. The White colour scheme is not asserted. Scenario v06 also shows the paragraph editor of block-editing; only the Cream colours of that page are claimed here.
- Method: test/visual/scenarioDefinitions2.ts, visual scenario theme-zoom/v08 (FORCED_DARK_ASSERTIONS in test/visual/scenarioAssertions.ts: Dark on a light host).
- Method: test/core/preview/themeTokens.test.ts, unit test `the forced theme modes set the neutral tokens, not the VS Code variables` (Dark and White neutral tokens, literal hex, no VS Code variable; the host independence follows from it and is not run with another host).
- Method: test/core/preview/creamTheme.test.ts, unit tests `cream defines a light warm palette for every variable white mode overrides` (Cream palette, warm paper rule, Cream complete) and `explicit themes override the same host colors, including the floating toolbar` (same names in the three blocks, toolbar variables included).
- Method: test/integration/realInput/markers.ts, real-input check `38-toolbar-{host}-{mode}` of test/integration/realInput/previewWindow.ts (captures theme-zoom/r01 to r08): runs the four modes on both hosts and compares the toolbar, text and pressed button colours and the borders with a fixed map for Dark, White and Cream; capture r03 is asserted but not captured.
- Method: test/core/preview/diagReq.styles.requirements.test.ts, unit test `the sticky heading band takes the page colours of the forced mode` (the two band rows).
- Criteria: Computed page colours equal the listed values and the note panel is light. Computed body colours, colour scheme, admonition panel and heading brightness equal the listed values. The toolbar computed colours equal the palette of the mode. Every border colour equals the map value of the mode. The page and toolbar colours of each forced mode are identical on the two hosts. The sorted variable lists of the three blocks are equal and each block holds the background token as a hex value and no VS Code variable.
