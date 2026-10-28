---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-236
uuid: 085ae453-f291-4315-aa2e-b9baff9f2064
title: "previewEditModeChanged carries a boolean edit mode"
description: "The host SHALL accept previewEditModeChanged only with a boolean editMode."
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-BLOCK-001
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
default_owner_email: gaetan@xeberon.net
---

## previewEditModeChanged carries a boolean edit mode

### Normative behavior

The host SHALL accept previewEditModeChanged only with a boolean editMode.

### Scenario (nominal): Boolean edit mode

- GIVEN a previewEditModeChanged message with editMode true
- WHEN it is validated
- THEN it is accepted

### Scenario (refusal): Edit mode that is not a boolean

- GIVEN a previewEditModeChanged message with editMode "yes" or no editMode
- WHEN it is validated
- THEN it is dropped

### Verification notes

- Method: Unit test `the page-state validators accept exactly what the frozen validator accepted` in test/core/protocol/pageStateMessages.test.ts (both scenarios).
- Criteria: The validator requires typeof editMode boolean.
