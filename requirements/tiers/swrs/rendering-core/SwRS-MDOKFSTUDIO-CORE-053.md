---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-053
uuid: 4702f746-8d74-49a6-a398-88810d05dccf
title: Transition colours once on theme change
description: When the theme changes, the extension SHALL transition the colours
  once.
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

## Transition colours once on theme change

### Normative behavior

When the theme changes, the extension SHALL transition the colours once.

### Scenario: Nominal transition colours once on theme change

- GIVEN a theme switch
- WHEN it occurs
- THEN the colours transition once

### Scenario: Boundary or refusal of transition colours once on theme change

- GIVEN no further switch
- WHEN the page idles
- THEN no transition repeats

### Verification notes

- Method: test
- Criteria: One colour transition per switch.
