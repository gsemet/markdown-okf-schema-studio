---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-051
uuid: f4a51517-4da2-4380-b7dd-d5556945a578
title: Enable soft appearance after the first input
description: When the user presses a pointer button or a key for the first time,
  the extension SHALL turn on the soft appearance of editors, bars and menus.
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
---

## Enable soft appearance after the first input

### Normative behavior

When the user presses a pointer button or a key for the first time, the extension SHALL turn on the soft appearance of editors, bars and menus.

### Scenario: Nominal

- GIVEN a fresh page with no input yet
- WHEN an editor opens
- THEN it appears without animation

### Scenario: Boundary or refusal

- GIVEN a first pointer press, then an editor opens
- WHEN the editor opens
- THEN it appears softly

### Verification notes

- Method: Unit test "CR 046: editors and menus appear softly only after a pointer or key press, never after a patch" in test/page/modules/motion.test.ts
- Criteria: Soft appearance is on only after the first pointer or key press.
