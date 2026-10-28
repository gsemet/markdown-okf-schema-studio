---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-003
uuid: dbca0a8b-baf6-4b93-881e-f81e9c2ae9fa
title: Mermaid diagrams are drawn as inert pictures
description: "When the page draws a Mermaid diagram, it SHALL replace the diagram
  text with one image whose alt text is \"Mermaid diagram\" and whose source is a
  data URI of the SVG drawn at the strict security level, and set data-render-state
  to rendered."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-001; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-001
default_owner_email: gaetan@xeberon.net
---

## Mermaid diagrams are drawn as inert pictures

### Normative behavior

When the page draws a Mermaid diagram, it SHALL replace the diagram text with one image whose alt text is "Mermaid diagram" and whose source is a data URI of the SVG drawn at the strict security level, and set data-render-state to rendered.

### Scenario: Valid flowchart

- GIVEN a valid Mermaid flowchart
- WHEN the page draws the diagram
- THEN the diagram element holds one image of class myst-mermaid-image with alt text "Mermaid diagram" and a src starting with data:image/svg+xml;charset=utf-8, and data-render-state is rendered

### Scenario: Line-break tags

- GIVEN Mermaid output whose SVG contains HTML line-break tags written without a closing slash
- WHEN the page builds the image source
- THEN the data URI holds the self-closing form of each line-break tag so the SVG loads as an image

### Known issues

- Known issue: Scripts and links inside the SVG are inert because the picture is an image with a data URI and Mermaid runs at the strict security level; this is not documented.
- Known issue: mermaidPreview.ts has no unit test.

### Verification notes

- Method: Visual scenarios diagrams v01 to v03 (loaded picture); no unit test of the browser entry point.
- Criteria: A loaded image replaces the text and carries the rendered state.
