---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-002
uuid: fc1c6420-973b-480e-b13f-50386a376e22
title: Admonitions take an accent colour and badge by kind
description: When an admonition panel renders, the extension SHALL colour it and
  give it a badge according to its kind, with the badge taking the accent
  colour.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-001
default_owner_email: gaetan@xeberon.net
---

## Admonitions take an accent colour and badge by kind

### Normative behavior

When an admonition panel renders, the extension SHALL colour it and give it a badge according to its kind, with the badge taking the accent colour.

### Scenario: Nominal

- GIVEN a note, a tip, an important, a warning, a caution and a danger admonition
- WHEN the preview renders
- THEN each panel has the accent of its kind (blue, green, purple, yellow, red with an octagon, red with a cross) and a badge in that accent

### Scenario: Boundary or refusal

- GIVEN a version admonition (versionadded, versionchanged, deprecated)
- WHEN the preview renders
- THEN the panels use the green, yellow and red accents respectively

### Verification notes

- Method: Unit test "every admonition flavour gets an accent colour" in test/core/preview/previewStyles.test.ts; Visual scenario admonitions-dark-full in test/visual/scenarioDefinitions1.ts
- Criteria: Every admonition kind has an accent colour and a badge; caution is red with an octagon, not the warning yellow.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-001](../../strs/myst/StRS-MDOKFSTUDIO-MYST-001.md): MyST directives and roles render as readable blocks
- Superseded by:
  - [SwRS-MDOKFSTUDIO-MYST-001](SwRS-MDOKFSTUDIO-MYST-001.md): Admonitions render as coloured callouts with a title
<!-- okf:links:end -->
