---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-007
uuid: a9e2c6ed-4d23-4ee1-a77c-663ca28f4e90
title: Colour code tokens from the VS Code theme
description: When a highlighted block is shown, the extension SHALL colour
  keywords, strings, numbers, additions, titles, attributes, deletions and
  comments with the matching VS Code chart colours, comments muted and italic.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Colour code tokens from the VS Code theme

### Normative behavior

When a highlighted block is shown, the extension SHALL colour keywords, strings, numbers, additions, titles, attributes, deletions and comments with the matching VS Code chart colours, comments muted and italic.

### Scenario: nominal behavior

- GIVEN a dark VS Code theme and a highlighted block
- WHEN the preview renders it
- THEN each token class uses its theme colour variable and comments are italic and muted

### Scenario: boundary or refusal behavior

- GIVEN a theme that defines no chart colours
- WHEN the preview renders it
- THEN each token class uses its built-in default colour and comments stay italic

### Verification notes

- Method: Inspection of the stylesheet rules plus a computed-style check.
- Criteria: Each token class resolves to its chart colour variable, or to its built-in default when the variable is undefined; comments are italic.
