---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-029
uuid: fdf00406-3205-461e-9399-3cfa2132c1dc
title: Long display equations scroll inside their box
description: When a display equation is wider than the pane, the extension SHALL
  scroll it sideways inside its own box and not widen the page.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-024
---

## Long display equations scroll inside their box

### Normative behavior

When a display equation is wider than the pane, the extension SHALL scroll it sideways inside its own box and not widen the page.

### Scenario: Nominal

- GIVEN a very long display equation
- WHEN the preview renders
- THEN its box has overflow-x auto and the page has no horizontal overflow

### Scenario: Boundary or refusal

- GIVEN the long chapter scrolled to its display equation
- WHEN the scroll lands
- THEN the equation block stays in the frame

### Verification notes

- Method: Visual scenario chapter-dark-half in test/visual/scenarioDefinitions1.ts
- Criteria: Overflow is local.
