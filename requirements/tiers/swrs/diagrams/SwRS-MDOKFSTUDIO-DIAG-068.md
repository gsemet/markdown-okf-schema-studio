---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-068
uuid: c243155e-1061-4502-b5b2-cc12b3494d49
title: "A {uml} or body-less {plantuml} path renders the file"
description: "When a {uml} directive or a {plantuml} directive without a body names
  a file, the extension SHALL render the diagram stored in that file, using the file
  text as the diagram and as the expandable source and recording the file name on
  the diagram element."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A {uml} or body-less {plantuml} path renders the file

### Normative behavior

When a {uml} directive or a {plantuml} directive without a body names a file, the extension SHALL render the diagram stored in that file, using the file text as the diagram and as the expandable source and recording the file name on the diagram element.

### Scenario: File diagram

- GIVEN a {uml} directive and a {plantuml} directive without a body, both naming diagrams/flow.puml
- WHEN the preview is rendered
- THEN both figures hold the file text as diagram and source, with data-plantuml-file equal to diagrams/flow.puml and data-plantuml-base equal to the file's real path

### Scenario: Options only

- GIVEN a {plantuml} directive whose body holds only a :caption: option
- WHEN the preview is rendered
- THEN it is treated as body-less, the file is rendered and the caption is not shown

### Known issues

- Known issue: Directive options such as :caption: are accepted but not shown.

### Verification notes

- Method: Unit tests on the rendered HTML; visual scenarios diagrams v13 and v14 (two pictures, no network).
- Criteria: File text appears as diagram and source (with useJar the JAR receives the file text); an inline body keeps its own text.
