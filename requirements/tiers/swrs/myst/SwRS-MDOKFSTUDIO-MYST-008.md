---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-008
uuid: c52bc503-ab2f-4ea9-ac6a-7bfc2af33674
title: An admonition is one mapped block over its whole directive
description: When an admonition renders, the extension SHALL map it as one block
  from its opening line to its closing fence.
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

## An admonition is one mapped block over its whole directive

### Normative behavior

When an admonition renders, the extension SHALL map it as one block from its opening line to its closing fence.

### Scenario: Nominal

- GIVEN a three-line admonition at lines 5 to 7
- WHEN the preview renders
- THEN the panel carries data-line 5 and data-end-line 7

### Scenario: Boundary or refusal

- GIVEN an admonition nested in another
- WHEN the preview renders
- THEN the outer panel spans the whole outer directive

### Verification notes

- Method: test
- Criteria: data-line and data-end-line match the directive's source lines.
