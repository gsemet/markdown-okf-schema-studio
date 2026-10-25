---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-036
uuid: 726e42fd-7339-461c-a848-f97f61e8175c
title: A negative or non-numeric width falls back to 960
description: When the setting maxContentWidth is negative or not a finite
  number, the extension SHALL use the default width of 960 pixels.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-LAYOUT-002; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-LAYOUT-002
---

## A negative or non-numeric width falls back to 960

### Normative behavior

When the setting maxContentWidth is negative or not a finite number, the extension SHALL use the default width of 960 pixels.

### Scenario: Negative value

- GIVEN maxContentWidth set to -1
- WHEN the preview configuration is read
- THEN the value is 960, the default

### Scenario: Non-numeric value

- GIVEN maxContentWidth set to the text wide, or to NaN
- WHEN the preview configuration is read
- THEN the value is 960, the default

### Known issues

- Known issue: The negative value has no unit test.

### Verification notes

- Method: Unit test of the configuration reader (NaN is asserted); the other inputs follow from the normalisation function.
- Criteria: The normalised value is 960 for every input that is negative, not a number or not finite.
