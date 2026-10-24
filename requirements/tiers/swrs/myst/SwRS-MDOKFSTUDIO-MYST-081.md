---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-081
uuid: fa172f3f-7804-4283-8c0b-9b8e0ad6b125
title: A banner announces conf.py warnings
description: When a render succeeds with conf.py warnings, the extension SHALL
  show a one-line banner N MyST syntax warning(s) from conf.py with a warning
  icon, an Open Problems button and a Close the warning button, as a polite
  status after the status region in Tab order.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A banner announces conf.py warnings

### Normative behavior

When a render succeeds with conf.py warnings, the extension SHALL show a one-line banner N MyST syntax warning(s) from conf.py with a warning icon, an Open Problems button and a Close the warning button, as a polite status after the status region in Tab order.

### Scenario: Nominal

- GIVEN two warnings and a successful render
- WHEN the preview renders
- THEN the banner shows the count, the icon and both buttons

### Scenario: Boundary or refusal

- GIVEN an error, stale, recovery or pending status
- WHEN the preview renders
- THEN the status region shows the full list instead of the banner

### Verification notes

- Method: test
- Criteria: Visual family: light, dark, cream, 460 px.
