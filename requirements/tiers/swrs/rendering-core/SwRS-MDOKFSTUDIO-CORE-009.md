---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-009
uuid: 0d7b12f3-1d2b-4e4f-945f-b6f8dbe322ed
title: Keep an image whose file is missing
description: When an image points to a local file that does not exist, the
  extension SHALL keep the image element and its alt text in document order and
  remove its source.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Keep an image whose file is missing

### Normative behavior

When an image points to a local file that does not exist, the extension SHALL keep the image element and its alt text in document order and remove its source.

### Scenario: Nominal keep an image whose file is missing

- GIVEN an image whose local file is absent
- WHEN it is rendered
- THEN the element and alt text stay in place and the page shows no broken-image overflow

### Scenario: Boundary or refusal of keep an image whose file is missing

- GIVEN the same image with a file that exists
- WHEN it is rendered
- THEN the image loads normally

### Verification notes

- Method: test
- Criteria: The missing-file image keeps its alt text without a `src` attribute.
