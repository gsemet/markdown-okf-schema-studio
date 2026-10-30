---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-077
uuid: 94232527-8158-40f1-b28b-8707d64aa6df
title: The jarPath setting is contributed with an explanation
description: When the extension is installed, it SHALL contribute the string
  setting markdownOkfSchemaStudio.plantuml.jarPath with an empty default, order
  80 and a description saying it is used only when useJar is on, relative to the
  workspace folder, and empty for the plantuml command.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-024
default_owner_email: gaetan@xeberon.net
---

## The jarPath setting is contributed with an explanation

### Normative behavior

When the extension is installed, it SHALL contribute the string setting markdownOkfSchemaStudio.plantuml.jarPath with an empty default, order 80 and a description saying it is used only when useJar is on, relative to the workspace folder, and empty for the plantuml command.

### Scenario: Contribution

- GIVEN the extension manifest
- WHEN the setting is read
- THEN it is a string with default empty and order 80 and a description naming useJar, the workspace folder and the PATH command

### Scenario: Description limit

- GIVEN the description text
- WHEN its length is checked
- THEN it is at most 700 characters

### Verification notes

- Method: Unit test: every contributed setting is explained with a unique order.
- Criteria: Type, default, order and description hold.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-024](SwRS-MDOKFSTUDIO-DIAG-024.md): The useJar and jarPath settings choose the PlantUML engine
<!-- okf:links:end -->
