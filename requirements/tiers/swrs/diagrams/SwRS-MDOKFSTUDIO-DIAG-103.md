---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-103
uuid: b844416f-1ee3-4e4d-a4c2-0a00c0e90924
title: A render settles exactly once
description: When close, error and timeout events of a PlantUML process arrive
  together, the extension SHALL settle the render exactly once.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-097; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-097
default_owner_email: gaetan@xeberon.net
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

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-097](SwRS-MDOKFSTUDIO-DIAG-097.md): A JAR render is bounded in input, output, time, process lifetime and concurrency
<!-- okf:links:end -->
