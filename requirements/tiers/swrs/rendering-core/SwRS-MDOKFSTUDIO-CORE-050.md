---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-050
uuid: 26a83b6b-f5a1-4613-b6ac-db9a0f89fa96
title: Honour reduced motion
description: When the user prefers reduced motion, the extension SHALL apply no
  preview motion.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Honour reduced motion

### Normative behavior

When the user prefers reduced motion, the extension SHALL apply no preview motion.

### Scenario: Nominal honour reduced motion

- GIVEN `prefers-reduced-motion: reduce`
- WHEN a block changes
- THEN no glow, fade or transition runs

### Scenario: Boundary or refusal of honour reduced motion

- GIVEN no such preference
- WHEN a block changes
- THEN the glow runs

### Verification notes

- Method: test
- Criteria: Motion styles are disabled under the preference.
