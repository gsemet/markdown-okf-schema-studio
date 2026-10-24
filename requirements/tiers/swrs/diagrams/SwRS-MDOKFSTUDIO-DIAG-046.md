---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-046
uuid: 3a74fa1f-49b0-4383-b2f8-a131ab38faa9
title: Local includes are read through the extension
description: When a built-in diagram contains !include, !include_many,
  !include_once or !includesub of a local file, the page SHALL ask the extension
  host for the file with a previewPlantUmlInclude message and draw the diagram
  with the text returned, making no network request.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Local includes are read through the extension

### Normative behavior

When a built-in diagram contains !include, !include_many, !include_once or !includesub of a local file, the page SHALL ask the extension host for the file with a previewPlantUmlInclude message and draw the diagram with the text returned, making no network request.

### Scenario: Nested include

- GIVEN a diagram that includes a file which includes another file
- WHEN the diagram is drawn
- THEN the host is asked for the first file with from null and for the nested file with from equal to the id of the first, and the picture shows the nested content

### Scenario: Diagram file include

- GIVEN a {uml} diagram whose file includes a style file
- WHEN the diagram is drawn
- THEN the style file is asked with from equal to the id of the diagram file

### Verification notes

- Method: Unit tests of the diagram renderer; visual scenarios diagrams v15 and v16 (nested participant drawn).
- Criteria: Each file is requested once per render and drawn.
