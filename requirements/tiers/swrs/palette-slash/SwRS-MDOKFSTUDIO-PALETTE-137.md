---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-137
uuid: 8bc02fa8-265d-4ee7-b70a-51a490798360
title: Dropdown writes a note admonition with the dropdown class
description: "When the writer presses Dropdown, the extension SHALL write a note admonition
  with the title Title and the option `:class: dropdown` around the touched lines,
  or around the sample Content, with Title selected."
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-001
depends_on:
- SwRS-MDOKFSTUDIO-PALETTE-127
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/blockEditActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
---

## Dropdown writes a note admonition with the dropdown class

### Normative behavior

When the writer presses Dropdown, the extension SHALL write a note admonition with the title Title and the option `:class: dropdown` around the touched lines, or around the sample Content, with Title selected.

### Scenario (nominal): Sample

- GIVEN the caret after intro
- WHEN Dropdown is pressed
- THEN a note admonition with the dropdown class and the content Content follows intro after a blank line, with Title selected

### Scenario (boundary): Nested fence

- GIVEN a selection that is a tip fence of three colons
- WHEN Dropdown is pressed
- THEN the outer fence has four colons

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-127: the colon fence of an admonition is one colon longer than any fence inside.

### Verification notes

- Method: test/page/modules/editActions.test.ts, through test/page/modules/editActions.test.ts (unit test "dropdown inserts a note with :class: dropdown or wraps the touched lines": scenarios Sample and Nested fence)
- Criteria: The fence is one colon longer than any fence inside.
