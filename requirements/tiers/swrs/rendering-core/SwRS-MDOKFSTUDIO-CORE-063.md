---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-063
uuid: a0971ef0-2fa8-4989-ac2e-f22400a97ae1
title: Keep figure width and alignment
description: When a MyST figure or image has a plain-length width or a left,
  center or right alignment, the extension SHALL keep them (the width as
  `data-okf-width`) and SHALL drop any other value.
project: markdown-okf-schema-studio
scope: rendering-core
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

## Keep figure width and alignment

### Normative behavior

When a MyST figure or image has a plain-length width or a left, center or right alignment, the extension SHALL keep them (the width as `data-okf-width`) and SHALL drop any other value.

### Scenario: Nominal keep figure width and alignment

- GIVEN a figure with width `50%` and align center
- WHEN it is rendered
- THEN both are kept

### Scenario: Boundary or refusal of keep figure width and alignment

- GIVEN a figure with width `calc(1px)`
- WHEN it is rendered
- THEN the width is dropped

### Verification notes

- Method: test
- Criteria: Only plain lengths and the three alignments survive.
