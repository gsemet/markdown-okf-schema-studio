---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-103
uuid: b844416f-1ee3-4e4d-a4c2-0a00c0e90924
title: A render settles exactly once
description: When close, error and timeout events of a PlantUML process arrive
  together, the extension SHALL settle the render exactly once.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A render settles exactly once

### Normative behavior

When close, error and timeout events of a PlantUML process arrive together, the extension SHALL settle the render exactly once.

### Scenario: Race

- GIVEN close, error and the timeout firing in the same tick
- WHEN the events are handled
- THEN the render has one result and later events are ignored

### Scenario: Abort after settle

- GIVEN a render that already settled
- WHEN the abort signal fires
- THEN nothing happens

### Verification notes

- Method: Unit test: settles exactly once when close, error and timeout race.
- Criteria: One result per render.
