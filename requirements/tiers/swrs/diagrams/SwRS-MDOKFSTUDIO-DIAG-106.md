---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-106
uuid: 4db93eb8-88db-4744-a361-34e29e9273c5
title: JAR results replace the diagrams in the open preview
description: When the JAR pipeline finishes a diagram, the extension SHALL
  replace the content of its diagram element with an image of alt text "PlantUML
  diagram" and a data URI of the SVG and state rendered, or with a paragraph of
  class myst-plantuml-error holding the message and the state error or
  unavailable.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-105; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-105
default_owner_email: gaetan@xeberon.net
---

## JAR results replace the diagrams in the open preview

### Normative behavior

When the JAR pipeline finishes a diagram, the extension SHALL replace the content of its diagram element with an image of alt text "PlantUML diagram" and a data URI of the SVG and state rendered, or with a paragraph of class myst-plantuml-error holding the message and the state error or unavailable.

### Scenario: Rendered

- GIVEN a successful result
- WHEN it is injected
- THEN the diagram element holds the image and data-render-state rendered

### Scenario: Failure

- GIVEN a failed result
- WHEN it is injected
- THEN the diagram element holds the message paragraph and the failure's state

### Verification notes

- Method: Unit test: renders PlantUML through the configured external JAR and injects an image.
- Criteria: Image or message plus state.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-105](SwRS-MDOKFSTUDIO-DIAG-105.md): JAR results replace the diagrams of the current render in order
<!-- okf:links:end -->
