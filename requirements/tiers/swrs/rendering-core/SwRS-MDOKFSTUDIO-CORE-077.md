---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-077
uuid: d1e0f9bc-844d-4cc1-bc90-c22b8d67db3f
title: A table tints its heading, its even rows and the hovered row
description: When the page shows a table other than the frontmatter properties
  table, the preview SHALL tint its heading with the focus border colour at 24%,
  its even body rows with the editor foreground at 3% and the body row under the
  pointer with the focus border colour at 12%, with translucent colours that
  stay below the table handles and let the overflow shading show through.
project: MDOKFSTUDIO
scope: rendering-core
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/tableStyles.ts
tested_in_files:
- test/visual/capture_table_row_colours.py
- test/visual/tableRowColourScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## A table tints its heading, its even rows and the hovered row

### Normative behavior

When the page shows a table other than the frontmatter properties table, the preview SHALL tint its heading with the focus border colour at 24%, its even body rows with the editor foreground at 3% and the body row under the pointer with the focus border colour at 12%, with translucent colours that stay below the table handles and let the overflow shading show through.

### Scenario (nominal): A table in the page

- GIVEN a page with a table of five body rows, in the Cream, White or Dark theme
- WHEN the pointer is away from the table
- THEN the heading cells have the focus border colour at 24%, the even body rows the editor foreground at 3%, the odd body rows no background, and the heading text keeps a contrast of at least 4.5 with the tinted heading on the page background

### Scenario (nominal): The pointer on a row

- GIVEN the same table
- WHEN the pointer moves over an odd or an even body row
- THEN that row has the focus border colour at 12%, in place of its even tint

### Scenario (boundary): Tables that keep their own look

| Input | Outcome |
| --- | --- |
| the frontmatter properties table, with the pointer on a row | its body rows and cells keep no background |
| a table that scrolls sideways | its overflow shading stays, and the translucent tints let it show through |
| edit mode, the pointer on a row | the row handles stay above the tint and still take the press |

### Verification notes

- Method: visual scenarios with a real pointer, `test/visual/capture_table_row_colours.py`.
- Criteria: the computed colours equal the theme tokens at the stated percentages, within 0.01 per channel.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
<!-- okf:links:end -->
