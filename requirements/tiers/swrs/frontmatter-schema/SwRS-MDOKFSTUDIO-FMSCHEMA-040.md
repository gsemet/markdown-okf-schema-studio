---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-040
uuid: 993af2a1-6b6b-4619-9532-8f2f1006c751
title: The badge jumps to the first row with an issue
description: When a writer presses the title badge, the extension SHALL scroll
  the first row with an issue to the centre, focus its value cell and highlight
  it for 1.5 seconds.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-010
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-039
default_owner_email: gaetan@xeberon.net
---

## The badge jumps to the first row with an issue

### Normative behavior

When a writer presses the title badge, the extension SHALL scroll the first row with an issue to the centre, focus its value cell and highlight it for 1.5 seconds.

### Scenario: Jump to the issue

- GIVEN a long table whose third row has an error
- WHEN the writer presses the badge
- THEN the row is scrolled to the centre, its value cell has focus and the highlight attribute is removed after 1.5 s

### Scenario: Info rows only

- GIVEN a table whose only issue is the info row (no field row carries it)
- WHEN the writer presses the badge
- THEN nothing scrolls and nothing is highlighted

### Verification notes

- Method: Unit test of the page behaviour; real-input test.
- Criteria: The first row carrying an error, warning or info class is chosen, in table order; its value cell is focused when the row has an editable value cell, otherwise its name cell.
- Known issue: when only info rows carry issues the badge does nothing.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-010](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-010.md): Fields follow the schema and problems show on the field concerned
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-039](SwRS-MDOKFSTUDIO-FMSCHEMA-039.md): The title badge counts the issues and jumps to the first one
<!-- okf:links:end -->
