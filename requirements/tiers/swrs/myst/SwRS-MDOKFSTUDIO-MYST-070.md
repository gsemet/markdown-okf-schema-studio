---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-070
uuid: 8cec198f-4230-4c70-bb20-3dec7b943a46
title: Uncertain conf.py lists suppress all warnings
description: When a list in conf.py uses a computed value, f-string, bytes or
  other prefixed string or `-=`, the extension SHALL treat the result as
  uncertain and show no warnings.
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

## Uncertain conf.py lists suppress all warnings

### Normative behavior

When a list in conf.py uses a computed value, f-string, bytes or other prefixed string or `-=`, the extension SHALL treat the result as uncertain and show no warnings.

### Scenario: Nominal

- GIVEN `extensions = load()`
- WHEN the file is read
- THEN the result is uncertain and no warning is shown

### Scenario: Boundary or refusal

- GIVEN an f-string element or `-=`
- WHEN the file is read
- THEN the same suppression applies

### Verification notes

- Method: test
- Criteria: Certainty is all or nothing.
