---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-029
uuid: eb817d93-d5f6-40db-9527-e60dd40f0cd1
title: Built-in PlantUML diagrams are drawn as inert pictures
description: "When the built-in engine draws a diagram, the page SHALL replace the
  diagram text with one image whose alt text is \"PlantUML diagram\" and whose source
  is a data URI of the SVG, and set data-render-state to rendered."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-023; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-023
default_owner_email: gaetan@xeberon.net
---

## Built-in PlantUML diagrams are drawn as inert pictures

### Normative behavior

When the built-in engine draws a diagram, the page SHALL replace the diagram text with one image whose alt text is "PlantUML diagram" and whose source is a data URI of the SVG, and set data-render-state to rendered.

### Scenario: Valid diagram

- GIVEN a valid PlantUML sequence diagram
- WHEN the page draws it
- THEN the diagram element holds one image of class myst-plantuml-image with alt text "PlantUML diagram", a data:image/svg+xml source and data-render-state rendered; the source disclosure stays below

### Scenario: SVG with a script

- GIVEN engine output that contains a script element and a link
- WHEN the page shows it
- THEN the output is an image, so the script does not run and the link cannot be followed

### Verification notes

- Method: Unit test with a fake engine; visual scenarios diagrams v10 and v11.
- Criteria: A data-URI image with the rendered state replaces the text.
