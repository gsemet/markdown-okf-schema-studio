---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-003
uuid: 12211ba7-4a52-4182-8c12-a8612dcc1ba3
title: The maximum content width is rounded and capped at 2400
description: When the setting markdownOkfSchemaStudio.preview.maxContentWidth is
  read, the extension SHALL round it to a whole number of pixels and cut it to
  at most 2400.
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

## The maximum content width is rounded and capped at 2400

### Normative behavior

When the setting markdownOkfSchemaStudio.preview.maxContentWidth is read, the extension SHALL round it to a whole number of pixels and cut it to at most 2400.

### Scenario: Value above the maximum or fractional

- GIVEN maxContentWidth set to 2500 and, separately, to 1049.6
- WHEN the preview configuration is read
- THEN 2500 becomes 2400 and 1049.6 becomes 1050

### Scenario: Limits kept

- GIVEN maxContentWidth set to 2400 and, separately, to 0
- WHEN the preview configuration is read
- THEN 2400 stays 2400 and 0 stays 0 (0 is not cut or replaced)

### Known issues

- Known issue: The decimal rounding has no unit test.

### Verification notes

- Method: Unit test of the configuration reader (2500 gives 2400 and 0 gives 0 are asserted); the rule is the normalisation function.
- Criteria: The normalised value is an integer between 0 and 2400.
