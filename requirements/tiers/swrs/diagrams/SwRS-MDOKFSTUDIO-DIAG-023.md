---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-023
uuid: bdfc584b-8f53-4c21-8332-d4f0f4ec58cf
title: PlantUML fences and directives become diagram figures
description: When a document contains a plantuml fence, or a {plantuml} or {uml}
  directive with a body, the extension SHALL render a figure whose diagram
  element is labelled "PlantUML diagram" and holds the diagram text for the
  engine, with the same text in a collapsed "Diagram source" disclosure.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## PlantUML fences and directives become diagram figures

### Normative behavior

When a document contains a plantuml fence, or a {plantuml} or {uml} directive with a body, the extension SHALL render a figure whose diagram element is labelled "PlantUML diagram" and holds the diagram text for the engine, with the same text in a collapsed "Diagram source" disclosure.

### Scenario: Three forms

- GIVEN a plantuml fence, a {plantuml} directive and a {uml} directive, each with a body
- WHEN the preview is rendered
- THEN three PlantUML figures appear, each with a diagram element labelled "PlantUML diagram" holding the text and a collapsed "Diagram source" disclosure with the same text

### Scenario: Text kept as written

- GIVEN a body without an @startuml line
- WHEN the preview is rendered
- THEN the diagram text is exactly the body; the extension adds no wrapper

### Known issues

- Known issue: A PlantUML diagram with empty text is skipped by the engine and left blank, with no message (no test covers it).

### Verification notes

- Method: Unit test on the rendered HTML.
- Criteria: Every form gives the same figure structure and the text is unchanged.
