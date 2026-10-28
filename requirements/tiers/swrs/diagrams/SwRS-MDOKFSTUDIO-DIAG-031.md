---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-031
uuid: 7100d8fe-f77d-4970-8699-260f9f8f49c1
title: The built-in engine needs nothing outside the extension
description: When the built-in engine draws a diagram that uses a bundled theme,
  an OpenIconic sprite or a class-like layout, the extension SHALL need no
  network access and no Graphviz installation, using PlantUML's own Smetana
  layout.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-024
default_owner_email: gaetan@xeberon.net
---

## The built-in engine needs nothing outside the extension

### Normative behavior

When the built-in engine draws a diagram that uses a bundled theme, an OpenIconic sprite or a class-like layout, the extension SHALL need no network access and no Graphviz installation, using PlantUML's own Smetana layout.

### Scenario: Theme and sprite

- GIVEN a diagram that selects a theme of the bundled library and uses an OpenIconic icon
- WHEN the built-in engine draws it
- THEN the picture is drawn and nothing is fetched

### Scenario: Class diagram without Graphviz

- GIVEN a class diagram on a machine without Graphviz
- WHEN the built-in engine draws it
- THEN the picture is drawn with the Smetana layout

### Known issues

- Known issue: Smetana layouts can differ from the JAR output produced with Graphviz.
- Known issue: Untested: the bundled themes and sprites are registered by imports in plantumlPreview.ts.

### Verification notes

- Method: No test draws a themed or icon diagram; to be checked by a visual scenario.
- Criteria: No request leaves the page and no Graphviz is used.
