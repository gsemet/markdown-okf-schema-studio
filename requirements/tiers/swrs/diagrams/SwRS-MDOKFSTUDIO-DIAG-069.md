---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-069
uuid: b4934ee9-cbcb-4b73-87b8-d9b5ffe4434f
title: A diagram file is a dependency of the render
description: When a {uml} or body-less {plantuml} file is read, the extension
  SHALL record it as a dependency of the render so that a change of the file
  renders the preview again.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
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

## A diagram file is a dependency of the render

### Normative behavior

When a {uml} or body-less {plantuml} file is read, the extension SHALL record it as a dependency of the render so that a change of the file renders the preview again.

### Scenario: Dependency

- GIVEN a {uml} directive naming an existing file
- WHEN the preview is rendered
- THEN the file's real path is in the render dependencies

### Scenario: Inline body

- GIVEN a {plantuml} directive with a body
- WHEN the preview is rendered
- THEN no file dependency is recorded for it

### Verification notes

- Method: Unit test: {uml} path.puml renders the file, names it and depends on it.
- Criteria: Dependencies list exactly the files read.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-009](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-009.md): PlantUML diagrams use local include files and PUML files
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-068](SwRS-MDOKFSTUDIO-DIAG-068.md): A {uml} directive renders a PUML file as a render dependency
<!-- okf:links:end -->
