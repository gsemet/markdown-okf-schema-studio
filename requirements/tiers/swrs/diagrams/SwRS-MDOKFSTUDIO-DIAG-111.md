---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-111
uuid: 8d00299f-5f19-4e1f-8a88-c9238c28c27b
title: "A working JAR draws a diagram as a loaded picture"
description: "When a PlantUML installation works, the extension SHALL draw a diagram
  as a loaded picture without an error and keep its expandable source."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-105; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-105
default_owner_email: gaetan@xeberon.net
---

## A working JAR draws a diagram as a loaded picture

### Normative behavior

When a PlantUML installation works, the extension SHALL draw a diagram as a loaded picture without an error and keep its expandable source.

### Scenario: Light theme

- GIVEN a working JAR or plantuml command and a PlantUML diagram
- WHEN the preview is shown in a light theme
- THEN a loaded picture without an error appears and the source disclosure is kept

### Scenario: Dark theme

- GIVEN the same working installation and a dark preview
- WHEN the preview is shown
- THEN the same kind of loaded picture appears; the pipeline asks for no dark variant

### Known issues

- Known issue: Environment dependent: the scenarios fail when plantuml is not on the PATH and are not routed through useJar.
- Known issue: The JAR and PATH pipeline draws the same SVG in the light and dark preview; only the built-in engine asks PlantUML for a dark variant.

### Verification notes

- Method: Visual scenarios diagrams v04 and v05.
- Criteria: A loaded image and no error message.
