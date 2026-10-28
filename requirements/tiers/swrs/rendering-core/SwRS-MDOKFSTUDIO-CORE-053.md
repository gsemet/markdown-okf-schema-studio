---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-053
uuid: 4702f746-8d74-49a6-a398-88810d05dccf
title: Transition colours once on theme change
description: When the theme changes, the extension SHALL transition the colours
  once.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-050; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-050
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "CR 046: a theme switch transitions the colours once, until the body background has changed" in test/page/modules/motion.test.ts
- Criteria: One colour transition per switch.
