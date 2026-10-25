---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-005
uuid: 8753fd04-8b2e-4a31-82ad-d1e6a64addf5
title: "Mermaid colours follow the preview theme"
description: "When the page draws a Mermaid diagram, the extension SHALL take its
  colours and font from the preview theme variables, use a built-in fallback for any
  variable that is missing, empty or a CSS system colour keyword, and draw it again
  when the theme colours change."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/mermaidPreview.ts
tested_in_files:
- test/core/preview/themeTokens.test.ts
- test/visual/scenarioDefinitions1.ts
---

## Mermaid colours follow the preview theme

### Normative behavior

When the page draws a Mermaid diagram, the extension SHALL take its colours and font from the preview theme variables, use a built-in fallback for any variable that is missing, empty or a CSS system colour keyword, and draw it again when the theme colours change.

### Scenario (nominal): Colours come from the theme variables

| Part of the picture | Source |
| --- | --- |
| Node fill | --studio-textCodeBlock-background |
| Text and line colours | --studio-editor-foreground |
| Border colour | --sphinx-preview-border |
| Secondary and tertiary colours | --studio-textBlockQuote-background and --studio-editor-background |
| Font | --sphinx-preview-font |
| Diagram background | transparent |

- GIVEN a dark preview theme that defines those variables
- WHEN the page draws a Mermaid diagram
- THEN each part of the picture takes its value from the variable in the table, the node fill equals --studio-textCodeBlock-background and the picture background is transparent

### Scenario (nominal): The theme changes

- GIVEN a drawn Mermaid diagram on a dark preview
- WHEN the data-sphinx-preview-theme-mode, data-sphinx-preview-theme, class or style attribute of the html element, or the class or style attribute of the body element, changes and the theme mode becomes white
- THEN the page checks every Mermaid diagram, draws again each one whose theme colours differ from those it was drawn with, and keeps its node labels

### Scenario (boundary): The theme colours stay the same

- GIVEN a drawn Mermaid diagram
- WHEN an observed attribute changes and leaves the theme colours as they were
- THEN the diagram is not drawn again and keeps its picture

### Scenario (boundary): Built-in fallbacks

The built-in fallbacks are #f0f0f0, #1f1f1f, #808080, #ffffff and the sans-serif font.

| Variable state | Outcome |
| --- | --- |
| --studio-editor-foreground is not defined by the preview | The text and line colour is the fallback #1f1f1f |
| --studio-textCodeBlock-background has the value Canvas in any letter case (a CSS system colour keyword) | The node colour is the fallback #f0f0f0 instead of the keyword |
| A variable is empty | Its built-in fallback is used |

### Scenario (nominal): Edge labels stay readable

| Theme | Outcome |
| --- | --- |
| Dark theme, a map whose edges carry labels | The picture holds as many edge labels as the source defines and each has a text contrast of at least 4.5:1 against its background |
| Fallback theme (a preview that gives no host colour variables), same map | The labels are kept and each has a contrast of at least 4.5:1 |

### Known issues

- Known issue: The visual check covers dark, white and cream and only node fills; border, font and secondary colours have no check.
- Known issue: The redraw evidence covers dark, white and cream; the light mode relies on the same observer.
- Known issue: The fallback colours are fixed colours of a light palette.
- Known issue: No unit test covers the fallback logic.
- Known issue: Edge label readability is checked by the visual campaign only; no unit test.

### Verification notes

- Method: test/core/preview/themeTokens.test.ts (colours come from the theme variables: every token the Mermaid theme reads is in the token map)
- Method: test/visual/scenarioDefinitions1.ts (diagrams v01: node fills equal the code block background in dark, white, cream and the original mode, and the theme switch check keeps the label count; v03: theme fallback draws a loaded picture; v01 to v03: edge label count against the source and contrast ratio)
- Criteria: Node fills follow --studio-textCodeBlock-background in every checked theme mode; node fills follow the theme after each switch and the label count is unchanged; the picture loads and is readable with no host colour variable; label count equals the source and every ratio is at least 4.5. The unchanged-colours case and the border, font and secondary colours are untested.
