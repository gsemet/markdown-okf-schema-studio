---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-006
uuid: d02093c6-70d2-494a-bc0f-194a5342ee02
title: Admonitions nest inside each other
description: When an admonition directive contains another directive, the
  extension SHALL render the inner panel inside its parent panel.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Admonitions nest inside each other

### Normative behavior

When an admonition directive contains another directive, the extension SHALL render the inner panel inside its parent panel.

### Scenario: Nominal

- GIVEN `::::{note}` around `:::{tip}`
- WHEN the preview renders
- THEN the tip panel sits inside the note panel

### Scenario: Boundary or refusal

- GIVEN a palette-written warning around a note
- WHEN the preview renders
- THEN the note panel stays inside the warning panel

### Verification notes

- Method: test
- Criteria: The inner panel is a descendant of the outer panel.
