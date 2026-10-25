---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-010
uuid: 0e8edff1-e0b1-47af-804c-df0101ecfa25
title: Simple and icon-less admonitions drop their decoration
description: 'When an admonition has `:class: simple` or `:icon: false`, the extension
  SHALL render a plain left-bar callout or hide the badge respectively.'
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-001
---

## Simple and icon-less admonitions drop their decoration

### Normative behavior

When an admonition has `:class: simple` or `:icon: false`, the extension SHALL render a plain left-bar callout or hide the badge respectively.

### Scenario: Nominal

- GIVEN an admonition with `:class: simple`
- WHEN the preview renders
- THEN the panel is a plain left-bar callout

### Scenario: Boundary or refusal

- GIVEN an admonition with `:icon: false`
- WHEN the preview renders
- THEN the badge is not shown

### Verification notes

- Method: Unit test "dropdown admonitions render as openable details with a summary" in test/core/render/mystFeatures.test.ts; Unit test "MyST simple and no-icon admonition modifiers are styled" in test/core/preview/previewStyles.test.ts
- Criteria: Each option changes only its own decoration.
