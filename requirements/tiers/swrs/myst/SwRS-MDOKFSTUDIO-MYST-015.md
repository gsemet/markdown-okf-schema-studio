---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-015
uuid: 99dbe9fc-8f0d-40ee-8cab-a8de41b14ed9
title: Unpaired or non-context tags stay visible as text
description: When a tag cannot be paired or is not a context tag, the extension
  SHALL keep it visible as literal text with its body.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-013; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-013
---

## Unpaired or non-context tags stay visible as text

### Normative behavior

When a tag cannot be paired or is not a context tag, the extension SHALL keep it visible as literal text with its body.

### Scenario: Nominal

- GIVEN a context tag with a missing or mismatched closing tag, with attributes, or self-closing
- WHEN the preview renders
- THEN the tag and its body show as literal text and no panel is made

### Scenario: Boundary or refusal

- GIVEN `div`, `details`, `summary`, `table`, `script`, inline XML or fenced `xml` code, or an upper-case or dotted tag
- WHEN the preview renders
- THEN they are never grouped into a panel

### Verification notes

- Method: Unit test "unsupported context boundaries stay literal and fenced XML stays code" in test/core/render/mystFeatures.test.ts
- Criteria: Only the pattern [a-z][a-z0-9_-]* with a matching closing tag becomes a panel.
