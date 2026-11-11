---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-136
uuid: 02094b80-fbf2-4309-815a-0927d8883516
title: The exported file is self-contained and needs no script
description: When the extension writes the exported file, it SHALL embed the
  styles, the preview theme and width, the local images and, only for a page
  with math, the math fonts, and SHALL leave no script, external stylesheet or
  reference to the editor in the file.
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
- src/core/export/htmlExport.ts
- src/session/features/htmlExport.ts
tested_in_files:
- test/core/export/htmlExport.test.ts
- test/page/modules/exportSnapshot.test.ts
- test/session/htmlExport.test.ts
- test/visual/capture_export_html.py
- test/visual/exportHtmlScenarios.ts
default_owner_email: gaetan@xeberon.net
---

## The exported file is self-contained and needs no script

### Normative behavior

When the extension writes the exported file, it SHALL embed the styles, the preview theme and width, the local images and, only for a page with math, the math fonts, and SHALL leave no script, external stylesheet or reference to the editor in the file.

### Scenario (nominal): One file with no script

- GIVEN an exported page
- WHEN the file text is searched
- THEN it has no `<script`, no `<link`, no `@import`, no `javascript:`, no `on...=` attribute and no `vscode-` name

### Scenario (nominal): Theme, width and images travel with the file

- GIVEN a cream preview at the default content width, with a local PNG
- WHEN the file is opened in a browser with JavaScript off
- THEN the page background and the content column width equal the preview's, and the image `src` is a `data:` URI

### Scenario (boundary): Math, missing images and zoom

| Input | Outcome |
| --- | --- |
| A page with math | The KaTeX styles and fonts are embedded |
| A page without math | No KaTeX style is embedded |
| An image that cannot be read | It is left out and the closing message counts it |
| The preview zoomed to 150 % | The file is written at 100 % |

### Verification notes

- Method: test/core/export/htmlExport.test.ts (no script, embedded styles, tokens and width, KaTeX only with math, the images), test/session/htmlExport.test.ts (the file reads and the missing-image note), test/visual/capture_export_html.py (the file opened with JavaScript off, scenarios toolbar-navigation/v41 and v42).
- Criteria: the pattern `<script|<link|@import|vscode-|javascript:| on[a-z]+=` has no match in the file.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-014](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-014.md): A writer shares one page as a self-contained HTML file
<!-- okf:links:end -->
