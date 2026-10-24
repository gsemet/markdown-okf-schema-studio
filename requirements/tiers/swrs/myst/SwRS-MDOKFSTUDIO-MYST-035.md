---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-035
uuid: 16dfa995-5bb8-47aa-9027-a5a0c892a951
title: Figure alignment sets align classes and float
description: When a `{figure}` or `{image}` has `:align:` left, center or right,
  the extension SHALL give the figure and image an align class, floating left
  and right beside the text.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Figure alignment sets align classes and float

### Normative behavior

When a `{figure}` or `{image}` has `:align:` left, center or right, the extension SHALL give the figure and image an align class, floating left and right beside the text.

### Scenario: Nominal

- GIVEN `:align: right`
- WHEN the preview renders
- THEN the figure floats right, the next paragraph wraps beside it and top-level headings clear the float

### Scenario: Boundary or refusal

- GIVEN an unknown alignment
- WHEN the preview renders
- THEN it is ignored

### Verification notes

- Method: test
- Criteria: Centre is centred; left and right float.
