---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-073
uuid: 8b936266-64fe-4251-8b7f-e2cd96107140
title: At most 10 extension warnings are kept
description: When more than 10 extension warnings are detected, the extension
  SHALL keep at most 10.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## At most 10 extension warnings are kept

### Normative behavior

When more than 10 extension warnings are detected, the extension SHALL keep at most 10.

### Scenario: Nominal

- GIVEN 11 missing extensions
- WHEN the document is checked
- THEN 10 warnings are kept

### Scenario: Boundary or refusal

- GIVEN 10 or fewer missing
- WHEN the document is checked
- THEN all are kept

### Verification notes

- Method: test
- Criteria: MAX_EXTENSION_WARNINGS is 10; untested.
