---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-014
uuid: a0036c49-972b-4db6-b861-62234ba772b0
title: Nested context tags render as nested panels
description: When context tag pairs are nested, the extension SHALL render each
  pair as its own panel, the inner one inside the outer, each with its own
  source range.
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
superseded_by:
- SwRS-MDOKFSTUDIO-MYST-013
default_owner_email: gaetan@xeberon.net
---

## Nested context tags render as nested panels

### Normative behavior

When context tag pairs are nested, the extension SHALL render each pair as its own panel, the inner one inside the outer, each with its own source range.

### Scenario: Nominal

- GIVEN an outer tag pair around an inner one
- WHEN the preview renders
- THEN two panels are shown, nested, with distinct source ranges

### Scenario: Boundary or refusal

- GIVEN an inner pair with a missing closing tag
- WHEN the preview renders
- THEN the inner tag stays literal text inside the outer panel

### Verification notes

- Method: Unit test "nested context tags preserve each wrapper range" in test/core/render/mystFeatures.test.ts
- Criteria: Each pair maps to its own lines.
