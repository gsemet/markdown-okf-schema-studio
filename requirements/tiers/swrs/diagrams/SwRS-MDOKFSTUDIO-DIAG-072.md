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
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-068; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-068
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

### Verification notes

- Method: Unit test `after the include budget is exhausted every remaining diagram file shows the budget message, with one warning` in `test/core/render/diagReq.pipeline.requirements.test.ts`.
- Criteria: The budget message replaces the diagram.
