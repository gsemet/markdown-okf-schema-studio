---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-052
uuid: 044d4f67-dc57-4049-b6e4-ca97918db7d1
title: Fade a closed editor back to its block
description: When a block editor closes, the extension SHALL fade the rendered
  block back in.
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

- Method: test
- Criteria: The fade class is applied on close.
