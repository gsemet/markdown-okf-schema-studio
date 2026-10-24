---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-072
uuid: 193b6767-636e-4c17-b388-41cd6910e689
title: "An exhausted include budget stops diagram files"
description: "When the include budget of a render is exhausted, the extension SHALL
  show that the file was not read because the include budget of this render is exhausted
  in place of each remaining {uml} or body-less {plantuml} diagram, with one budget
  warning for the render."
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

## An exhausted include budget stops diagram files

### Normative behavior

When the include budget of a render is exhausted, the extension SHALL show that the file was not read because the include budget of this render is exhausted in place of each remaining {uml} or body-less {plantuml} diagram, with one budget warning for the render.

### Scenario: Budget exhausted

- GIVEN a render whose include budget is used up and a {uml} directive after it
- WHEN the preview is rendered
- THEN the diagram is replaced by the budget message and one budget warning is reported for the render

### Scenario: Several diagrams

- GIVEN two such directives
- WHEN the preview is rendered
- THEN both show the message and only one warning exists

### Known issues

- Known issue: No test in this scope triggers this message.

### Verification notes

- Method: No test in this scope triggers it; the budget itself is covered by the myst scope.
- Criteria: The budget message replaces the diagram.
