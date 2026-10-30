---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-052
uuid: 044d4f67-dc57-4049-b6e4-ca97918db7d1
title: Fade a closed editor back to its block
description: When a block editor closes, the extension SHALL fade the rendered
  block back in.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
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

## Fade a closed editor back to its block

### Normative behavior

When a block editor closes, the extension SHALL fade the rendered block back in.

### Scenario: Nominal fade a closed editor back to its block

- GIVEN an open block editor
- WHEN it closes
- THEN the rendered block fades in

### Scenario: Boundary or refusal of fade a closed editor back to its block

- GIVEN reduced motion
- WHEN it closes
- THEN the block appears without fade

### Verification notes

- Method: Unit test "CR 046: editors and menus appear softly only after a pointer or key press, never after a patch" in test/page/modules/motion.test.ts
- Criteria: The fade class is applied on close.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-050](SwRS-MDOKFSTUDIO-CORE-050.md): Soft appearance and colour transitions honour reduced motion
<!-- okf:links:end -->
