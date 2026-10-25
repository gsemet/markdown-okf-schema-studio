---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-126
uuid: 82824622-7a78-4ed3-aa0b-ae67541adb27
title: "The host accepts only a boolean anchor mode"
description: "When previewAnchorModeChanged reaches the host, the extension SHALL
  accept it only when anchorToEditor is a boolean."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
---

## The host accepts only a boolean anchor mode

### Normative behavior

When previewAnchorModeChanged reaches the host, the extension SHALL accept it only when anchorToEditor is a boolean.

### Scenario (nominal): Boolean

- GIVEN anchorToEditor true and false
- WHEN the validator runs
- THEN both are accepted

### Scenario (refusal): Not a boolean

- GIVEN the string true, the number 1 and a missing field
- WHEN the validator runs
- THEN all are refused

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-120: what the host does with an accepted anchor mode

### Verification notes

- Method: test/core/protocol/pageStateMessages.test.ts (both scenarios: the page-state validators accept exactly what the frozen validator accepted)
- Criteria: typeof anchorToEditor === boolean.
