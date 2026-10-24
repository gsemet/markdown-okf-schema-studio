---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-026
uuid: b75fb63b-04c0-42dc-824f-87bf1ebfad09
title: Cancel a superseded render
description: When a newer edit arrives during a render, the extension SHALL
  cancel that render and discard its late result with the message "The MyST
  render was canceled because a newer edit arrived."
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Cancel a superseded render

### Normative behavior

When a newer edit arrives during a render, the extension SHALL cancel that render and discard its late result with the message "The MyST render was canceled because a newer edit arrived."

### Scenario: Nominal cancel a superseded render

- GIVEN a render in progress
- WHEN a newer edit arrives
- THEN the old render is canceled and its result is not shown

### Scenario: Boundary or refusal of cancel a superseded render

- GIVEN a canceled render that completes late
- WHEN its result arrives
- THEN the page keeps the newer render

### Verification notes

- Method: test
- Criteria: A late result of a superseded render is never applied.
