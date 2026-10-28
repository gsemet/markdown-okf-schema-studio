---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-068
uuid: e56bf264-b10d-41ad-aedc-5cd232c2e6cf
title: Disable soft appearance after a content patch
description: When a content patch replaces the content, the extension SHALL turn
  the soft appearance of editors, bars and menus off until the next pointer or
  key press.
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
superseded_by: SwRS-MDOKFSTUDIO-CORE-050
default_owner_email: gaetan@xeberon.net
---

## Disable soft appearance after a content patch

### Normative behavior

When a content patch replaces the content, the extension SHALL turn the soft appearance of editors, bars and menus off until the next pointer or key press.

### Scenario: Nominal

- GIVEN soft appearance is on after a pointer press
- WHEN a content patch is applied and an editor opens
- THEN it appears without animation

### Scenario: Boundary or refusal

- GIVEN a content patch followed by a key press
- WHEN an editor opens
- THEN it appears softly again

### Verification notes

- Method: Unit test "CR 046: editors and menus appear softly only after a pointer or key press, never after a patch" in test/page/modules/motion.test.ts
- Criteria: The motion attribute is removed by a content patch and set again by input.
