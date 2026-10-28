---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-121
uuid: 2475ef35-1d7e-4278-886f-8b0a85a0b9a1
title: Vega-Lite and Vega fences become chart figures
description: When a document contains a vega-lite or vega fenced code block, the
  extension SHALL render it, in every palette mode, as a figure holding the
  chart specification and a collapsed Chart source section, without changing the
  document source.
project: MDOKFSTUDIO
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/render/chartData.ts
- src/core/render/mystNormalize.ts
tested_in_files:
- test/core/render/chartData.test.ts
- test/core/render/chartRendering.test.ts
- test/page/chartCsp.test.ts
---

## Vega-Lite and Vega fences become chart figures

### Normative behavior

When a document contains a vega-lite or vega fenced code block, the extension SHALL render it, in every palette mode, as a figure holding the chart specification and a collapsed Chart source section, without changing the document source.

### Scenario (nominal): A vega-lite fence

- GIVEN a document with a paragraph, a fenced block whose language is vega-lite holding a JSON specification, and a paragraph after it
- WHEN the preview renders in the Strict, GFM, MyST or Full palette mode
- THEN the block is one figure of the class myst-vega-figure holding a div myst-vega-diagram (aria-label Chart diagram, data-myst-chart-kind vega-lite, the specification as its text) and a collapsed details section titled Chart source with the same text, the figure carries the source line, and the document text is unchanged

### Scenario (nominal): A vega fence

- GIVEN a fenced block whose language is vega
- WHEN the preview renders
- THEN the block is the same figure with data-myst-chart-kind vega

### Scenario (boundary): Other fences and an unreadable specification

- GIVEN a mermaid fence, a json fence and a vega-lite fence whose text is not a specification
- WHEN the preview renders
- THEN the mermaid fence stays a Mermaid figure, the json fence a code block, and the broken fence is a chart figure like any other (the page shows the error in place of the chart, see SwRS-MDOKFSTUDIO-DIAG-123)

### Known issues

- Known issue: The fence is the only syntax; a MyST directive for charts does not exist.

### Verification notes

- Method: test/core/render/chartRendering.test.ts (the figure of a vega-lite and a vega fence, other fences, a broken specification); test/core/render/chartData.test.ts (the fence languages, JSON and YAML specifications)
- Method: test/page/chartCsp.test.ts (the figures of a real page become charts)
- Criteria: A vega-lite or vega fence renders as one chart figure with the specification text, its kind and a collapsed Chart source section, in every palette mode, and no other fence does.
