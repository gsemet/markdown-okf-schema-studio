---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-071
uuid: 5a6a39d2-94c3-4614-b562-07f40e4e6777
title: conf.py lookups are cached and invalidated
description: When the extension looks up a conf.py, the extension SHALL trust a
  folder's result and a file's parse for 2 s, re-check by modification time and
  size afterwards, and drop all caches when any conf.py is created, changed or
  deleted.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## conf.py lookups are cached and invalidated

### Normative behavior

When the extension looks up a conf.py, the extension SHALL trust a folder's result and a file's parse for 2 s, re-check by modification time and size afterwards, and drop all caches when any conf.py is created, changed or deleted.

### Scenario: Nominal

- GIVEN two checks within 2 s
- WHEN a document is typed in
- THEN the disk is not touched

### Scenario: Boundary or refusal

- GIVEN a conf.py created, changed or deleted
- WHEN the event arrives
- THEN all caches are dropped

### Verification notes

- Method: test
- Criteria: Typing never reads the disk.
