---
type: SwRS
id: SwRS-MDOKFSTUDIO-TABLE-076
uuid: 62988d92-a31b-4858-a1c0-eb319c823018
title: A conversion that would lose content is refused with a reason
description: When a conversion between a pipe table, a {list-table} and a simple
  HTML table would lose content or finds the table already in the target form,
  the extension SHALL change nothing and give a refusal reason, and text that is
  no table gets neither a conversion nor a reason.
project: markdown-okf-schema-studio
scope: table-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TABLE-011
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/tableConversion.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/modules/fmtableReqTable.requirements.test.ts
- test/page/modules/listTable.test.ts
default_owner_email: gaetan@xeberon.net
---

## A conversion that would lose content is refused with a reason

### Normative behavior

When a conversion between a pipe table, a {list-table} and a simple HTML table would lose content or finds the table already in the target form, the extension SHALL change nothing and give a refusal reason, and text that is no table gets neither a conversion nor a reason.

### Scenario (refusal): List-table that would lose content
| Input ({list-table} converted to a pipe table) | Outcome |
| --- | --- |
| A title | No edit; reason "The list-table title would be lost in a pipe table. Nothing was changed." |
| YAML options | No edit; reason "A list-table with YAML options cannot be converted. Nothing was changed." |
| A :name: label | No edit; reason "The list-table label (:name:) would be lost in a pipe table. Nothing was changed." |
| :header-rows: set to a word | No edit; reason "The :header-rows: option is not a number. Nothing was changed." |
| A cell that continues on an indented line (multi-line or block cell) | No edit; reason "A list-table cell with several lines or block content cannot be a pipe table cell. Nothing was changed." |
| Rows of 2 and 3 cells | No edit; reason "The rows do not all have the same number of cells. Nothing was changed." |
| No rows | No edit; reason "The list-table has no rows. Nothing was changed." |

### Scenario (refusal): HTML table that would lose content
| Input (HTML table converted by List table or Pipe table) | Outcome |
| --- | --- |
| A colspan, a class on a row, or other attributes (spans, classes, styles) | No edit; reason "This HTML table has X; only a simple table converts. Nothing was changed." where X names what the table has |
| A nested em element in a cell (markup inside a cell) | Same reason form, X names what the table has |
| Text between rows (text outside its cells) | Same reason form, X names what the table has |
| An element other than table, thead, tbody, tr, th and td | Same reason form, X names the element |
| Rows of different lengths | No edit; reason "The rows do not all have the same number of cells. Nothing was changed." |

### Scenario (refusal): Several header rows
- GIVEN a {list-table} (or an HTML table) with :header-rows: 2
- WHEN Pipe table is run
- THEN no edit is produced and the reason is "A pipe table has one header row; this table has 2. Nothing was changed."

### Scenario (refusal): Table already in the target form
- GIVEN a pipe table converted to a pipe table, and a list-table converted to a list-table (directly through the conversion function)
- WHEN the conversion is requested
- THEN the result is a refusal with the sentence "This is already a pipe table." or "This is already a list-table."

### Scenario (boundary): Text that is no table
| Input | Outcome |
| --- | --- |
| A paragraph of text | The result is neither a conversion nor a reason (undefined) |
| An empty string | The result is neither a conversion nor a reason (undefined) |

### Scenario (nominal): Tables that convert
| Input | Outcome |
| --- | --- |
| A {list-table} of equal rows, with or without :header-rows: and a :widths: option | The conversion to a pipe table succeeds |
| A simple HTML table whose cells carry only align="left", "center" or "right" | The conversion succeeds |
| The same list-table with :header-rows: 1 | The conversion to a pipe table succeeds |
| A list-table converted to a pipe table (the other form) | The conversion is done |

### Related requirements
- SwRS-MDOKFSTUDIO-TABLE-073: the List table action that runs the conversion.
- SwRS-MDOKFSTUDIO-TABLE-074: the Pipe table action that runs the conversion.
- SwRS-MDOKFSTUDIO-TABLE-080: what a successful conversion writes.

### Verification notes
- Method: test/page/modules/listTable.test.ts, unit tests a list-table that would lose content is refused with a reason and nothing is produced ("List-table that would lose content", "Tables that convert"), an HTML table with spans, markup or no body cells in a row is refused ("HTML table that would lose content", first group and the reason form), a table already in the target form is refused and text that is no table is not recognised ("Table already in the target form", the paragraph case of "Text that is no table"). The empty-text boundary is read from detectTable and has no test.
- Method: test/page/modules/editActions.test.ts, unit test CR038: a conversion that would lose content changes nothing and says why ("List-table that would lose content"). The display of the reason belongs to the palette-slash scope.
- Method: test/page/modules/fmtableReqTable.requirements.test.ts, unit test a list-table with several header rows is refused as a pipe table with the header-row count ("Several header rows").
- Method: test/page/modules/editActions.test.ts holds the markers of the editActions.test.ts checks above.
- Criteria: A refusal reason with the suffix "Nothing was changed." for each lossy form and a successful conversion for the plain form; the reason text with the header-row count; the refusal sentences of the already-in-form case (in the palette the actions are not offered for these cases, see SwRS-MDOKFSTUDIO-TABLE-073 and SwRS-MDOKFSTUDIO-TABLE-074); an undefined result for text that is no table.
