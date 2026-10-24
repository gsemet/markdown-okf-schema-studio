---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-018
uuid: 7594fe35-49be-4bf9-90c0-ed34b26d118d
title: The first-element clearance is measured again after layout events
description: When the window is resized, the column, toolbar or leading
  properties table changes size, the toolbar or column content mutates, a root
  attribute changes, a web font loads or the window loads, the extension SHALL
  measure the first-element clearance again.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The first-element clearance is measured again after layout events

### Normative behavior

When the window is resized, the column, toolbar or leading properties table changes size, the toolbar or column content mutates, a root attribute changes, a web font loads or the window loads, the extension SHALL measure the first-element clearance again.

### Scenario: Late load

- GIVEN a leading properties table whose Description toggle moves under the toolbar after the last measurement
- WHEN the window load event fires
- THEN the inset is measured again and published (192 px in the tested layout)

### Scenario: Replaced properties table

- GIVEN the properties section is replaced by a new one
- WHEN the next update runs
- THEN the new section is observed for size changes

### Known issues

- Known issue: This robustness behaviour is undocumented and comes from a continuous-integration regression (run 39916805010) described in the source comment; describe() is a diagnostic exposed as window.__studioDiagnostics.firstClearance.

### Verification notes

- Method: Unit tests a late load or font settlement measures again, and the leading properties table is observed itself, also after it is replaced.
- Criteria: After each event the published values equal a fresh measurement.
