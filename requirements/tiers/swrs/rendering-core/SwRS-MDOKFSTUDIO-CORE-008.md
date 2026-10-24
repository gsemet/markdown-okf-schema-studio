---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-008
uuid: 8c1fdb2b-3e5d-415e-9146-d9b1af764c4d
title: Fit images in the content column
description: When a document shows an image, the extension SHALL size it to at
  most the content column width and keep its aspect ratio.
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

## Fit images in the content column

### Normative behavior

When a document shows an image, the extension SHALL size it to at most the content column width and keep its aspect ratio.

### Scenario: Nominal fit images in the content column

- GIVEN an image wider than the content column
- WHEN it is rendered
- THEN its width equals the column width and its height scales

### Scenario: Boundary or refusal of fit images in the content column

- GIVEN an image narrower than the column
- WHEN it is rendered
- THEN it keeps its natural size

### Verification notes

- Method: test
- Criteria: The image style sets max width 100 percent and automatic height.
