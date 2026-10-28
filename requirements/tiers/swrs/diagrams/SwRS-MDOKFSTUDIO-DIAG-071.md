---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-071
uuid: 7a057f12-d18e-40e7-9b6c-33b8d58868c7
title: A missing diagram file is reported and watched
description: When the file named by a {uml} or body-less {plantuml} directive
  does not exist inside the allowed folders, the extension SHALL show PlantUML
  file not found followed by the path in place of the diagram, report one
  warning, and watch the missing path so the diagram appears once the file is
  created.
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
default_owner_email: gaetan@xeberon.net
---

## A missing diagram file is reported and watched

### Normative behavior

When the file named by a {uml} or body-less {plantuml} directive does not exist inside the allowed folders, the extension SHALL show PlantUML file not found followed by the path in place of the diagram, report one warning, and watch the missing path so the diagram appears once the file is created.

### Scenario: Missing file

- GIVEN a {uml} directive naming diagrams/later.puml that does not exist
- WHEN the preview is rendered
- THEN the message PlantUML file not found: diagrams/later.puml. appears with a warning on line 1 and the missing path is a dependency

### Scenario: File created

- GIVEN the file is created afterwards
- WHEN the preview renders again
- THEN the diagram appears

### Verification notes

- Method: Unit test: a missing diagram file shows a clear message, is reported and is watched for its creation.
- Criteria: The message uses the PlantUML error style and the path is watched.
