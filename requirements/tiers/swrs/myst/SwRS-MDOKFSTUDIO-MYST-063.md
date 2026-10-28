---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-063
uuid: d7e15e43-358b-4dc0-aa3c-59066557b982
title: "Table directives render as ordinary tables"
description: "When a document holds a `{list-table}`, `{csv-table}` or `{table}` directive,
  the extension SHALL render it as an ordinary table with the table styles, with its
  caption, header rows, widths and alignment as the directive options give them, and
  offer the table palette action."
project: markdown-okf-schema-studio
scope: myst
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/directives/tables.ts
- src/core/render/mystTables.ts
tested_in_files:
- test/core/directives/registry.test.ts
- test/core/render/mystFeatures.test.ts
- test/visual/scenarioDefinitions2.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-CORE-057
- SwRS-MDOKFSTUDIO-CORE-058
- SwRS-MDOKFSTUDIO-MYST-064
- SwRS-MDOKFSTUDIO-MYST-065
- SwRS-MDOKFSTUDIO-MYST-088
- SwRS-MDOKFSTUDIO-MYST-092
---

## Table directives render as ordinary tables

### Normative behavior

When a document holds a `{list-table}`, `{csv-table}` or `{table}` directive, the extension SHALL render it as an ordinary table with the table styles, with its caption, header rows, widths and alignment as the directive options give them, and offer the table palette action.

### Scenario (nominal): A list-table renders like a pipe table
- GIVEN a `{list-table}` with title, two header rows and widths `30 70`
- WHEN the preview renders
- THEN a caption, two header rows and 30/70 column proportions appear, with `:align:` and inline Markdown cells, as one source block with no overflow, and cell, header and border styles match a pipe table

### Scenario (boundary): List-table header rows
| Input | Outcome |
| --- | --- |
| `:header-rows: 1` | The first row is in `thead` with `th` |
| `:header-rows: 0` | No header cells are made |

### Scenario (refusal): Invalid list-table widths are ignored
| Input | Outcome |
| --- | --- |
| `:widths: auto` | No column group exists |
| `:widths: grid` | No column group exists |
| Non numeric widths | No column group exists |
| Three widths for two columns | No column group exists |
| Valid widths | Applied as percent |

### Scenario (nominal): A list-table is edited as one block
- GIVEN a `{list-table}` and a Markdown table
- WHEN a cell is clicked in edit mode
- THEN the whole list-table opens in one editor, because its cell paragraphs carry no source line, while a Markdown table opens its cell editor

### Scenario (nominal): The table directive keeps caption, id and alignment
- GIVEN a `{table}` with caption, `:label:` and `:align: center` around a pipe table with aligned columns
- WHEN the preview renders
- THEN a captioned table has the label as id, is aligned and keeps each column's GFM alignment on every cell; palette-written captioned tables render a caption

### Scenario (boundary): A table directive around a raw HTML table
- GIVEN a `{table}` with `:align:` around a raw HTML table
- WHEN the preview renders
- THEN the HTML table takes the alignment

### Scenario (nominal): The csv-table directive renders a table
| Input | Outcome |
| --- | --- |
| A `{csv-table}` with `:header:` and a quoted cell spanning two lines | The header row is made and the quoted cell holds both lines |
| A `{csv-table}` with a caption and `:align: right` and no `:header:` | The table has the caption and alignment and no header cells |

### Scenario (nominal): The table directive family shares the table styles and palette action
| Input | Outcome |
| --- | --- |
| A `{list-table}` | Table styles apply and the table palette action is offered |
| A `{csv-table}` | The same table styles |
| A `{table}` | The same table styles |

### Verification notes
- Method: test/core/render/mystFeatures.test.ts ("CR038: a list-table renders its title, header rows, widths and alignment as one editable block": list-table nominal, header rows, one block; "CR038: list-table widths that do not match the columns or are not numbers are ignored": widths; "MyST GFM and directive tables preserve captions, headers, and alignment": table directive, raw HTML table, csv-table)
- Method: test/core/directives/registry.test.ts ("every plug-in renders, styles the preview and names MyST palette actions that exist": family styles and palette action)
- Method: test/visual/scenarioDefinitions2.ts (`myst/v${27 + index}-list-table-full-${theme}-900`: list-table nominal, no overflow, pipe-table styles)
- Criteria: Caption, id, alignment, GFM column alignment, header, quoted multi-line cell and valid widths render; invalid widths are ignored.
