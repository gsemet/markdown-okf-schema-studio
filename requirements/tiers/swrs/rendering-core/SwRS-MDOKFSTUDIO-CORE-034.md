---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-034
uuid: 1fe02d1c-773a-4ec9-9067-767cfdd7228b
title: Wrap a long identifier at narrow width
description: When a long identifier in inline code exceeds the available width
  at 460 px, the extension SHALL wrap it inside the viewport.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
- StRS-MDOKFSTUDIO-CORE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Wrap a long identifier at narrow width

### Normative behavior

When a long identifier in inline code exceeds the available width at 460 px, the extension SHALL wrap it inside the viewport.

### Scenario: Nominal

- GIVEN a long identifier at 460 px
- WHEN it is shown
- THEN it wraps inside the viewport

### Scenario: Boundary or refusal

- GIVEN an identifier exactly as wide as the viewport
- WHEN it is shown
- THEN it neither overflows nor wraps needlessly

### Verification notes

- Method: test
- Criteria: No horizontal overflow from a long identifier at 460 px.
