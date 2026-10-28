---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-007
uuid: 9ac03f38-80fc-4e10-b0a6-e4c867914124
title: Mermaid falls back to built-in colours
description: 'When a Mermaid theme variable is missing, empty or a CSS system colour
  keyword such as Canvas, the page SHALL use the built-in fallback for it: #f0f0f0,
  #1f1f1f, #808080, #ffffff or the sans-serif font.'
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-005; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-005
default_owner_email: gaetan@xeberon.net
---

## Mermaid falls back to built-in colours

### Normative behavior

When a Mermaid theme variable is missing, empty or a CSS system colour keyword such as Canvas, the page SHALL use the built-in fallback for it: #f0f0f0, #1f1f1f, #808080, #ffffff or the sans-serif font.

### Scenario: Missing variable

- GIVEN a preview that does not define --studio-editor-foreground
- WHEN the page draws a Mermaid diagram
- THEN the text and line colour is the fallback #1f1f1f

### Scenario: System colour keyword

- GIVEN a variable --studio-textCodeBlock-background whose value is Canvas in any letter case
- WHEN the page draws a Mermaid diagram
- THEN the node colour is the fallback #f0f0f0 instead of the keyword

### Known issues

- Known issue: The fallback colours are fixed colours of a light palette.
- Known issue: No unit test covers the fallback logic.

### Verification notes

- Method: Visual scenario diagrams v03 (theme fallback draws a loaded picture); no unit test because the logic is private to the browser entry point.
- Criteria: The picture loads and is readable with no host colour variable.
