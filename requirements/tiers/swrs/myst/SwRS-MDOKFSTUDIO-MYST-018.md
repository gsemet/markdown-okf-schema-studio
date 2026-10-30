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
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-017; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-017
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "T30: a {kbd} role inserted by the edition palette renders a kbd element" in test/core/render/mystPaletteRendering.test.ts; Unit test "MyST typography renders definitions, abbreviations, scripts, and footnotes" in test/core/render/mystFeatures.test.ts
- Criteria: Each role maps to its element.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-017](SwRS-MDOKFSTUDIO-MYST-017.md): Definition lists and inline roles are typeset
<!-- okf:links:end -->
