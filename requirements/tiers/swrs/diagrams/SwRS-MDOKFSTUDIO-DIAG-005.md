---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-005
uuid: 8753fd04-8b2e-4a31-82ad-d1e6a64addf5
title: "Mermaid colours come from the preview theme variables"
description: "When the page draws a Mermaid diagram, it SHALL set the node fill from
  --studio-textCodeBlock-background, the text and line colours from --studio-editor-foreground,
  the border colour from --sphinx-preview-border, the secondary and tertiary colours
  from --studio-textBlockQuote-background and --studio-editor-background, the font
  from --sphinx-preview-font, and a transparent diagram background."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Mermaid colours come from the preview theme variables

### Normative behavior

When the page draws a Mermaid diagram, it SHALL set the node fill from --studio-textCodeBlock-background, the text and line colours from --studio-editor-foreground, the border colour from --sphinx-preview-border, the secondary and tertiary colours from --studio-textBlockQuote-background and --studio-editor-background, the font from --sphinx-preview-font, and a transparent diagram background.

### Scenario: Node, text and line

- GIVEN a dark preview theme that defines those variables
- WHEN the page draws a Mermaid diagram
- THEN the node fill equals --studio-textCodeBlock-background and the text and line colours equal --studio-editor-foreground

### Scenario: Border, font and background

- GIVEN the same theme
- WHEN the page draws a Mermaid diagram
- THEN the node border equals --sphinx-preview-border, the font equals --sphinx-preview-font and the picture background is transparent

### Known issues

- Known issue: The visual check covers dark, white and cream and only node fills; border, font and secondary colours have no check.

### Verification notes

- Method: Unit test that every token the Mermaid theme reads is in the token map; visual scenario diagrams v01 (node fills equal the code block background in dark, white, cream and the original mode).
- Criteria: Node fills follow --studio-textCodeBlock-background in every checked theme mode.
