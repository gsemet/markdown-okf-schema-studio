---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-129
uuid: 2ffb20ef-e43f-400f-9231-502b0bc4e23d
title: A diagram renderer script loads only when the page holds a figure of its
  engine
description: When the rendered content holds a diagram or chart figure, the
  extension SHALL add the script of that engine to the page once, with the page
  nonce, and SHALL add no script of an engine whose figure the page does not
  hold.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/webview.ts
tested_in_files:
- test/session/diagReq.chart.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A diagram renderer script loads only when the page holds a figure of its engine

### Normative behavior

When the rendered content holds a diagram or chart figure, the extension SHALL add the script of that engine to the page once, with the page nonce, and SHALL add no script of an engine whose figure the page does not hold.

### Scenario (nominal): The script of an engine follows its figure

| Rendered content | Outcome |
| --- | --- |
| a Mermaid figure (class myst-mermaid-figure) | the page HTML holds one script tag with the page nonce, the bundle URL of mermaidPreview.js and the attribute data-sphinx-preview-mermaid |
| a PlantUML figure, with the built-in engine | one script tag with the page nonce, the bundle URL of plantumlPreview.js and the attribute data-sphinx-preview-plantuml |
| a chart figure (class myst-vega-figure) | one script tag with the page nonce, the source vegaPreview.js of the extension bundle and the attribute data-sphinx-preview-vega |
| several figures of one engine | the script of that engine appears once |
| figures of two engines | each of the two scripts appears once |
| a figure of one engine and none of another | the page holds no script tag of the other engine |

### Scenario (boundary): A figure appearing or leaving changes the page shell

- GIVEN a page with a Mermaid figure or a chart
- WHEN a content update adds a figure of another engine, or removes the only figure of an engine
- THEN the shell key differs, so the page is loaded again with the scripts that its content needs instead of being patched in place

### Scenario (nominal): The Mermaid renderer loads the diagram types it needs

- GIVEN a document with a Mermaid figure
- WHEN the page loads the renderer
- THEN the script tag is `type="module"` and its entry file is small
- AND each diagram type and the layout engine are chunks fetched when a diagram needs them

### Related requirements

- SwRS-MDOKFSTUDIO-DIAG-023: with the JAR pipeline the page holds no built-in engine script
- SwRS-MDOKFSTUDIO-DIAG-124: the chart runtime needs no eval

### Verification notes

- Method: test/core/preview/contentPatch.test.ts (the renderer script loads only with a Mermaid figure, the shell key differs when a figure appears or disappears)
- Method: test/session/diagReq.chart.requirements.test.ts (the chart script is added once with the nonce and only with a chart)
- Method: test/session/diagReq.webview.requirements.test.ts (the built-in PlantUML script is added once with the page nonce, only for the built-in engine and a figure)
- Method: test/integration/projectFeatures.test.ts (script tag and bundle folder resource root exist)
- Method: test/build/bundleSplit.test.ts (the Mermaid renderer entry is small and the rest is split into chunks)
- Criteria: The script tag of an engine appears once and only with a figure of that engine; the shell key follows the set of engines on the page.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-001](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-001.md): A writer reads and inserts Mermaid diagrams that follow the theme
<!-- okf:links:end -->
