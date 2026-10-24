---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-018
uuid: de9c148b-d97a-4e16-af8e-78d747bed863
title: Inline roles sub, sup, abbr and kbd render
description: When a document uses the roles `{sub}`, `{sup}`, `{abbr}` or
  `{kbd}`, the extension SHALL render subscript, superscript, an abbreviation
  with its expansion as title, or a keyboard key.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Inline roles sub, sup, abbr and kbd render

### Normative behavior

When a document uses the roles `{sub}`, `{sup}`, `{abbr}` or `{kbd}`, the extension SHALL render subscript, superscript, an abbreviation with its expansion as title, or a keyboard key.

### Scenario: Nominal

- GIVEN `{abbr}`HR (Heart Rate)``
- WHEN the preview renders
- THEN HR is shown with the title Heart Rate

### Scenario: Boundary or refusal

- GIVEN `{sub}`, `{sup}` and `{kbd}` roles
- WHEN the preview renders
- THEN subscript, superscript and a keyboard key appear

### Verification notes

- Method: test
- Criteria: Each role maps to its element.
