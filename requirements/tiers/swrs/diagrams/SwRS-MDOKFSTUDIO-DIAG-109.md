---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-109
uuid: d5a9a538-e723-45d8-9c4c-6d3063ddb046
title: Results of an older render stage are dropped
description: When JAR results belong to a render stage that is no longer the
  current one, the extension SHALL drop them.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Results of an older render stage are dropped

### Normative behavior

When JAR results belong to a render stage that is no longer the current one, the extension SHALL drop them.

### Scenario: Newer render

- GIVEN a render superseded while its diagrams were drawing
- WHEN the old results arrive
- THEN they are not applied

### Scenario: Current render

- GIVEN the current render
- WHEN its results arrive
- THEN they are applied

### Known issues

- Known issue: Untested.

### Verification notes

- Method: No session test.
- Criteria: Only the current stage is updated.
