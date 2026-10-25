---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-085
uuid: eec754df-7a52-491d-ab73-fd3b0154ca94
title: The banner returns when the warning set changes
description: When the set of warning texts changes after a dismissal, the
  extension SHALL show the banner again, but not when only line numbers or order
  change.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-081; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-081
---

## The banner returns when the warning set changes

### Normative behavior

When the set of warning texts changes after a dismissal, the extension SHALL show the banner again, but not when only line numbers or order change.

### Scenario: Nominal

- GIVEN a new warning text
- WHEN the preview renders
- THEN the banner shows again

### Scenario: Boundary or refusal

- GIVEN only line numbers or order change
- WHEN the preview renders
- THEN the banner stays closed

### Verification notes

- Method: Unit test "CR 050: the key names the warning set, whatever the order and the line of each warning" in test/page/modules/warningBanner.test.ts
- Criteria: The warnings stay in the status region.
