---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-074
uuid: 295a809d-9a39-4650-bfdc-80397a03f350
title: Nested diagrams resolve includes next to their own file
description: When a PlantUML diagram comes from an included document or from a
  {uml} file, the extension SHALL mark it with data-plantuml-base so its
  !include lines resolve next to that file and not next to the previewed
  document.
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
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-068
default_owner_email: gaetan@xeberon.net
---

## Nested diagrams resolve includes next to their own file

### Normative behavior

When a PlantUML diagram comes from an included document or from a {uml} file, the extension SHALL mark it with data-plantuml-base so its !include lines resolve next to that file and not next to the previewed document.

### Scenario: Included document

- GIVEN a document included by {include} that holds a plantuml fence and a {uml} directive
- WHEN the preview is rendered
- THEN the fence has data-plantuml-base equal to the included document and the {uml} diagram equal to its own file

### Scenario: Top-level document

- GIVEN a plantuml fence in the previewed document itself
- WHEN the preview is rendered
- THEN the figure has no data-plantuml-base and includes resolve next to the document

### Verification notes

- Method: Unit tests on the rendered HTML and on the diagram renderer.
- Criteria: The base attribute names the right file.
