---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-128
uuid: c103d896-1a92-4561-b510-5c4cdd3a814f
title: Exported diagrams are drawn in the theme of the file
description: When the exported page has Mermaid, PlantUML or Vega diagrams, the
  extension SHALL wait for the pending diagrams to draw, write each drawn
  Mermaid or PlantUML diagram as an image and each chart as inline SVG with its
  gradients referenced inside the file and no hover box or script, in the theme
  of the file, and write a diagram in error as its error box.
project: markdown-okf-schema-studio
scope: diagrams
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
- src/page/modules/exportSnapshot.ts
tested_in_files:
- test/integration/exportHtml.test.ts
- test/page/chartCsp.test.ts
- test/page/modules/exportSnapshot.test.ts
default_owner_email: gaetan@xeberon.net
---

## Exported diagrams are drawn in the theme of the file

### Normative behavior

When the exported page has Mermaid, PlantUML or Vega diagrams, the extension SHALL wait for the pending diagrams to draw, write each drawn Mermaid or PlantUML diagram as an image and each chart as the inline SVG of its live view, with every gradient reference local to the file (`url(#id)`) and no hover box and no script, in the theme of the file, and write a diagram in error as its error box.

### Scenario (nominal): Drawn diagrams are exported as drawn

- GIVEN a page with a Mermaid, a PlantUML and a Vega diagram still drawing when Export is pressed
- WHEN the diagrams settle
- THEN the snapshot is taken after they settled, and the file holds each diagram as the picture the preview shows in the theme of the file; a chart is its inline svg, and an area chart with a gradient fill keeps its gradient when the file is opened on its own

### Scenario (boundary): Slow and failed diagrams

| Input | Outcome |
| --- | --- |
| A diagram still pending after 10 seconds | The export goes on with the page as it shows |
| A diagram in error | It is written as its error box |

### Verification notes

- Method: test/page/modules/exportSnapshot.test.ts (the wait for pending diagrams and the time limit, the gradient references of a chart rewritten to local ones), test/integration/exportHtml.test.ts (a Mermaid diagram exported by the real host), test/page/chartCsp.test.ts (the snapshot of a real page with a gradient chart, built and opened on its own: inline svgs, local references defined in the file, the area painted with its gradient, no hover box, no script).
- Criteria: no diagram container with a pending render state is waited on past the limit; the exported Mermaid image is an SVG data image; no gradient reference of an exported chart keeps the URL of the page.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-014](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-014.md): A writer shares one page as a self-contained HTML file
<!-- okf:links:end -->
