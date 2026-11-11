---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-091
uuid: 0e330ac5-633d-4d79-a084-3bfcec9a7f51
title: The exported properties table opens on a click
description: When the exported page has frontmatter properties, the extension
  SHALL write the properties table as a closed details element that opens on a
  click and, when the schema was found, shows the Description column.
project: markdown-okf-schema-studio
scope: frontmatter-schema
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/export/exportContent.ts
tested_in_files:
- test/core/export/htmlExport.test.ts
- test/visual/capture_export_html.py
- test/visual/exportHtmlScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The exported properties table opens on a click

### Normative behavior

When the exported page has frontmatter properties, the extension SHALL write the properties table as a closed details element that opens on a click and, when the schema was found, shows the Description column.

### Scenario (nominal): A closed properties details

- GIVEN a page whose frontmatter has `type: swrs` and the schema is found
- WHEN the exported file is opened with JavaScript off
- THEN the properties are a `details` element that is closed, a click on its summary opens it, and the table shows a Description column

### Scenario (boundary): No schema

| Input | Outcome |
| --- | --- |
| The schema was not found | The table has no Description column |
| The properties table setting is off | The file has no properties element |

### Verification notes

- Method: test/core/export/htmlExport.test.ts (the details and its summary), test/visual/capture_export_html.py (the click opens the table and shows the Description column, scenarios toolbar-navigation/v41 and v42).
- Criteria: `details[data-okf-properties]` is not open on load and is open after one click on its summary.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-014](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-014.md): A writer shares one page as a self-contained HTML file
<!-- okf:links:end -->
