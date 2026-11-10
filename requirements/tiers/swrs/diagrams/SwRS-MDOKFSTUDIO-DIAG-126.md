---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-126
uuid: 77542380-5c28-4397-98bb-4515a05565da
title: A picture takes its colours from the preview theme
description: When the preview draws an svg picture, it SHALL define the
  variables surface, background, bg, border, text, foreground, fg, muted,
  accent, primary, red, green, blue and orange from the theme of the page
  (Cream, White, Dark or the VS Code theme), and SHALL give a variable of
  another name that has no fallback the text colour.
project: MDOKFSTUDIO
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/svgPictureStyles.ts
- src/core/security/svgSanitizer.ts
tested_in_files:
- test/core/render/svgRendering.test.ts
- test/security/svgSanitizer.test.ts
- test/visual/svgPictureScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A picture takes its colours from the preview theme

### Normative behavior

When the preview draws an svg picture, it SHALL define the variables surface, background, bg, border, text, foreground, fg, muted, accent, primary, red, green, blue and orange from the theme of the page (Cream, White, Dark or the VS Code theme), and SHALL give a variable of another name that has no fallback the text colour.

### Scenario (nominal): The vocabulary follows the theme

- GIVEN a picture that fills shapes with var(--surface), var(--border), var(--accent), var(--green) and writes text in var(--text)
- WHEN the page is in Cream, White, Dark or the VS Code theme
- THEN each variable resolves to the matching --studio token of that theme (surface, background and bg to the code block background, border to the panel border, text, foreground and fg to the editor foreground, muted to the description foreground, accent and primary to the link colour, red, green, blue and orange to the chart colours)

### Scenario (boundary): A variable of another name

- GIVEN a picture that writes fill="var(--nope)" and fill="var(--nope, #123456)"
- WHEN the preview renders it
- THEN the first fill takes the text colour and the second keeps its fallback

| Input | Outcome |
| --- | --- |
| a name of the vocabulary | the theme colour |
| another name with a fallback | the fallback |
| another name without a fallback | the text colour |

### Verification notes

- Method: test/security/svgSanitizer.test.ts (the vocabulary and the unknown variable)
- Method: test/core/render/svgRendering.test.ts (the stylesheet defines every name from --studio tokens)
- Method: the visual scenarios diagrams/v19 to v21 (computed fills in each theme)
- Criteria: A picture changes colour with the theme and never falls back to black.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
<!-- okf:links:end -->
