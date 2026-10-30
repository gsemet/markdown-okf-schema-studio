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
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Archived. Not an observable behaviour; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "typing does not touch the disk: results are cached until the interval or an invalidation" in test/core/myst/confLocator.test.ts
- Criteria: Typing never reads the disk.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-007](../../strs/myst/StRS-MDOKFSTUDIO-MYST-007.md): Sphinx configuration gaps are reported before building
<!-- okf:links:end -->
