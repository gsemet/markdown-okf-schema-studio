---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-066
uuid: 974dbc48-1687-4f66-b5e9-e4b34dc126b3
title: Links are resolved about 150 ms after the render
description: When a table with pending links has been shown, the extension SHALL
  resolve the links about 150 ms later and replace the table in place, waiting
  while a block or field editor is open and dropping results that became stale.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMSCHEMA-063; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMSCHEMA-063
default_owner_email: gaetan@xeberon.net
---

## Links are resolved about 150 ms after the render

### Normative behavior

When a table with pending links has been shown, the extension SHALL resolve the links about 150 ms later and replace the table in place, waiting while a block or field editor is open and dropping results that became stale.

### Scenario: Resolved after render

- GIVEN a rendered table with pending links
- WHEN 150 ms pass
- THEN the table is swapped in place and no spinner is left

### Scenario: Document changed meanwhile

- GIVEN the document, the render or the panel changed before the timer fired
- WHEN the timer fires
- THEN the result is dropped and nothing is patched

### Verification notes

- Method: Unit test of the frontmatter controller; visual scenario.
- Criteria: A new request restarts the timer.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMSCHEMA-014](../../strs/frontmatter-schema/StRS-MDOKFSTUDIO-FMSCHEMA-014.md): Frontmatter link fields resolve, show their status and can be followed
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMSCHEMA-063](SwRS-MDOKFSTUDIO-FMSCHEMA-063.md): Each link value shows whether it resolves
<!-- okf:links:end -->
