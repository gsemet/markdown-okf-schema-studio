---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-040
uuid: 382b7ad1-6ebd-4d79-9c63-253839b1bc4e
title: Wrap an unbroken word in the column
description: When a word has no break opportunity and is longer than the column,
  the extension SHALL wrap it inside the column at 900 px and 460 px.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-034; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-034
---

## Wrap an unbroken word in the column

### Normative behavior

When a word has no break opportunity and is longer than the column, the extension SHALL wrap it inside the column at 900 px and 460 px.

### Scenario: Nominal wrap an unbroken word in the column

- GIVEN a 120-character word at 900 px
- WHEN it is shown
- THEN it wraps inside the column

### Scenario: Boundary or refusal of wrap an unbroken word in the column

- GIVEN the same word at 460 px
- WHEN it is shown
- THEN it wraps inside the column

### Verification notes

- Method: Unit test "K1: long words and bare URLs wrap inside text blocks, links and table cells" in test/core/preview/previewStyles.test.ts
- Criteria: No horizontal overflow from an unbroken word.
