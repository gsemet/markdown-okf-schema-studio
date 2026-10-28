---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-012
uuid: b98648c2-1a8a-4fd4-a32a-c3000daa4511
title: Quarto callouts render as simple admonitions
description: 'When a document holds a Quarto callout div such as `::: {.callout-tip}`,
  the extension SHALL render a simple admonition of that kind with the leading heading
  as title.'
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
default_owner_email: gaetan@xeberon.net
---

## Quarto callouts render as simple admonitions

### Normative behavior

When a document holds a Quarto callout div such as `::: {.callout-tip}`, the extension SHALL render a simple admonition of that kind with the leading heading as title.

### Scenario: Nominal

- GIVEN a `.callout-tip` div with a leading heading
- WHEN the preview renders
- THEN a simple tip admonition titled with that heading

### Scenario: Boundary or refusal

- GIVEN a callout div without a heading
- WHEN the preview renders
- THEN the title is the kind's default title

### Verification notes

- Method: Unit test "Quarto callout classes render as semantic MyST admonitions" in test/core/render/mystFeatures.test.ts
- Criteria: Kind and title follow the callout class and heading.
