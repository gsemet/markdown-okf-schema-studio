---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-121
uuid: 2475ef35-1d7e-4278-886f-8b0a85a0b9a1
title: Vega-Lite and Vega fences become chart figures
description: When a document contains a vega-lite or vega fenced code block, the
  extension SHALL render it, in every palette mode, as a figure holding the
  chart specification and a collapsed Chart source section that the preview
  hides and the HTML export shows, without changing the document source.
project: MDOKFSTUDIO
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-015
scenarios:
- id: S1
  title: A vega-lite fence
- id: S2
  title: A vega fence
- id: S3
  title: Other fences and an unreadable specification
- id: S4
  title: The preview hides the Chart source and the export shows it
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/export/exportStyles.ts
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/chartData.ts
- src/core/render/mystNormalize.ts
- src/page/modules/findIndex.ts
tested_in_files:
- test/core/render/chartData.test.ts
- test/core/render/chartRendering.test.ts
- test/page/chartCsp.test.ts
- test/page/modules/chartError.test.ts
- test/page/modules/findIndex.test.ts
default_owner_email: gaetan@xeberon.net
---

## Vega-Lite and Vega fences become chart figures

### Normative behavior

When a document contains a vega-lite or vega fenced code block, the extension SHALL render it, in every palette mode, as a figure holding the chart specification and a collapsed Chart source section that the preview hides and the HTML export shows, without changing the document source.

### Scenario S1 (nominal): A vega-lite fence

- GIVEN a document with a paragraph, a fenced block whose language is vega-lite holding a JSON specification, and a paragraph after it
- WHEN the preview renders in the Strict, GFM, MyST or Full palette mode
- THEN the block is one figure of the class myst-vega-figure holding a div myst-vega-diagram (aria-label Chart diagram, data-myst-chart-kind vega-lite, the specification as its text) and a collapsed details section titled Chart source with the same text, the figure carries the source line, and the document text is unchanged

### Scenario S2 (nominal): A vega fence

- GIVEN a fenced block whose language is vega
- WHEN the preview renders
- THEN the block is the same figure with data-myst-chart-kind vega

### Scenario S3 (boundary): Other fences and an unreadable specification

- GIVEN a mermaid fence, a json fence and a vega-lite fence whose text is not a specification
- WHEN the preview renders
- THEN the mermaid fence stays a Mermaid figure, the json fence a code block, and the broken fence is a chart figure like any other (the page shows the error in place of the chart, see SwRS-MDOKFSTUDIO-DIAG-123)

### Scenario S4 (nominal): The preview hides the Chart source and the export shows it

- GIVEN a page with a drawn chart and a chart in error, in reading mode and in edit mode
- WHEN the page is shown, and when the document is exported to HTML
- THEN in the preview each details myst-vega-source has display none and the find bar does not match its text, and in the exported file each one has display block and stays closed

### Known issues

- Known issue: The fence is the only syntax; a MyST directive for charts does not exist.

### Verification notes

- Method: test/core/render/chartRendering.test.ts (the figure of a vega-lite and a vega fence, other fences, a broken specification); test/core/render/chartData.test.ts (the fence languages, JSON and YAML specifications)
- Method: test/page/chartCsp.test.ts (the figures of a real page become charts; the Chart source is hidden in reading and edit mode; the HTML export shows it, closed)
- Method: test/page/modules/chartError.test.ts (the preview sheet hides the section, the export sheet shows it); test/page/modules/findIndex.test.ts (the find bar skips it)
- Criteria: A vega-lite or vega fence renders as one chart figure with the specification text, its kind and a collapsed Chart source section, in every palette mode, and no other fence does; the preview hides the section and the HTML export shows it, closed.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-015](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-015.md): A writer reads charts and drawings in the page
<!-- okf:links:end -->
