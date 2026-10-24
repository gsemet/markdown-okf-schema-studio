---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-038
uuid: 8cf0970f-4bad-418e-b4cd-f00973949449
title: Render a very long document completely
description: When a document of about 6000 lines is rendered, the extension
  SHALL render every section and heading and keep the last paragraph reachable.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Render a very long document completely

### Normative behavior

When a document of about 6000 lines is rendered, the extension SHALL render every section and heading and keep the last paragraph reachable.

### Scenario: Nominal render a very long document completely

- GIVEN a document of 335 sections and 336 headings
- WHEN it is rendered
- THEN all headings appear

### Scenario: Boundary or refusal of render a very long document completely

- GIVEN the end of that page
- WHEN it is scrolled to
- THEN the last paragraph is visible

### Verification notes

- Method: test
- Criteria: All headings and the last paragraph are present.
