---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-135
uuid: 197b8040-2c21-43bb-a297-aa64f361e7b5
title: Export removes links to other files after a warning
description: When the exported page has relative, wiki or blocked links, the
  extension SHALL list them in a modal warning before the save dialog, keep the
  external and anchor links, write the other links as plain text, and stop the
  export when the writer cancels the warning.
project: markdown-okf-schema-studio
scope: toolbar-navigation
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
- src/host-vscode/vscodeHost.ts
- src/session/features/htmlExport.ts
- src/session/pageMessages.ts
tested_in_files:
- test/core/export/htmlExport.test.ts
- test/integration/exportHtml.test.ts
- test/session/htmlExport.test.ts
- test/visual/capture_export_html.py
- test/visual/exportHtmlScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## Export removes links to other files after a warning

### Normative behavior

When the exported page has relative, wiki or blocked links, the extension SHALL list them in a modal warning before the save dialog, keep the external and anchor links, write the other links as plain text, and stop the export when the writer cancels the warning.

### Scenario (nominal): External and anchor links stay

- GIVEN a page with an `https:` link, a `mailto:` link and an `#anchor` link
- WHEN the page is exported
- THEN each of the three keeps its `href`

### Scenario (nominal): Other links become text after a warning

- GIVEN a page with the links `other.md`, `./sub/x.md#h`, `wiki:Page` and a blocked `file:` link
- WHEN the page is exported
- THEN a modal warning lists the four targets before the save dialog, and after the writer accepts, the file shows their text with no `a` element

### Scenario (boundary): Cancelling the warning

| Input | Outcome |
| --- | --- |
| The warning is cancelled | No save dialog opens and nothing is written |
| More than 20 removed links | The warning lists 20 and ends with "and N more" |
| No removed link | No warning is shown |

### Verification notes

- Method: test/core/export/htmlExport.test.ts (the link rules), test/session/htmlExport.test.ts (the warning, its list and Cancel), test/visual/capture_export_html.py (the external link keeps its address and the link to another file is text, scenarios toolbar-navigation/v41 and v42).
- Criteria: the removed targets are unique and in document order; `removedLinks` is empty when every link is external or an anchor.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-014](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-014.md): A writer shares one page as a self-contained HTML file
<!-- okf:links:end -->
