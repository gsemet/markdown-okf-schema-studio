---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-087
uuid: 378f3d2e-6912-4334-ae6a-420640065815
title: jarPath is read as a trimmed string
description: "When the extension reads markdownOkfSchemaStudio.plantuml.jarPath, it
  SHALL trim the value and read a value that is not a string as empty."
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-084; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-DIAG-084
default_owner_email: gaetan@xeberon.net
---

## jarPath is read as a trimmed string

### Normative behavior

When the extension reads markdownOkfSchemaStudio.plantuml.jarPath, it SHALL trim the value and read a value that is not a string as empty.

### Scenario: Padded value

- GIVEN a jarPath of two spaces, a path and a tab
- WHEN the setting is read
- THEN the result is the path without the padding

### Scenario: Non-string

- GIVEN a jarPath holding a number
- WHEN the setting is read
- THEN the result is the empty string

### Verification notes

- Method: Unit tests: reads and trims the configured PlantUML JAR path; uses an empty path for non-string configuration values.
- Criteria: Trim and empty fallback hold.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-DIAG-007](../../strs/diagrams/StRS-MDOKFSTUDIO-DIAG-007.md): A writer renders PlantUML with an own JAR or command, safely bounded
- Superseded by:
  - [SwRS-MDOKFSTUDIO-DIAG-084](SwRS-MDOKFSTUDIO-DIAG-084.md): The JAR pipeline runs java or plantuml once per diagram on stdin
<!-- okf:links:end -->
