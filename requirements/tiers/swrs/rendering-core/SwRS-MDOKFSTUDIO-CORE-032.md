---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-032
uuid: a7f2c0bd-b57a-4c39-a1af-ba10fc209b6c
title: Keep inline code readable inside links
description: When inline code sits inside a link, the extension SHALL use the
  link colour, and in forced white and cream themes SHALL use it on a
  translucent tint with a contrast of at least 4.5:1.
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

## Keep inline code readable inside links

### Normative behavior

When inline code sits inside a link, the extension SHALL use the link colour, and in forced white and cream themes SHALL use it on a translucent tint with a contrast of at least 4.5:1.

### Scenario: Nominal keep inline code readable inside links

- GIVEN inline code inside a link
- WHEN it is shown
- THEN its colour is the link colour

### Scenario: Boundary or refusal of keep inline code readable inside links

- GIVEN the cream theme
- WHEN it is shown
- THEN the contrast ratio is at least 4.5:1

### Verification notes

- Method: test
- Criteria: Link-colour code meets 4.5:1 in white and cream.
