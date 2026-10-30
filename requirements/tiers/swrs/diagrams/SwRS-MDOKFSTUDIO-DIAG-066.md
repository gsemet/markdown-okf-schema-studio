---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-066
uuid: 2ff64eea-6ae9-44a0-bad4-660da45ba86e
title: The include watch holds at most 1024 files
description: When more than 1024 include files have been remembered, the host
  SHALL forget the oldest.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-053; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-053
default_owner_email: gaetan@xeberon.net
---

## The include watch holds at most 1024 files

### Normative behavior

When more than 1024 include files have been remembered, the host SHALL forget the oldest.

### Scenario: Over the limit

- GIVEN 1025 remembered files
- WHEN the last one is remembered
- THEN the set holds 1024 and the first is gone

### Scenario: Re-remembered file

- GIVEN an old file remembered again
- WHEN the limit is exceeded
- THEN an older untouched file is forgotten first

### Verification notes

- Method: Unit test: the include watch remembers a bounded set of files.
- Criteria: Size never exceeds 1024.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-053](SwRS-MDOKFSTUDIO-DIAG-053.md): Served include files are watched and redraw their diagrams
<!-- okf:links:end -->
