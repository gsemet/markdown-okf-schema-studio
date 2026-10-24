---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-040
uuid: 382b7ad1-6ebd-4d79-9c63-253839b1bc4e
title: Wrap an unbroken word in the column
description: When a word has no break opportunity and is longer than the column,
  the extension SHALL wrap it inside the column at 900 px and 460 px.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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

- Method: test
- Criteria: No horizontal overflow from an unbroken word.
