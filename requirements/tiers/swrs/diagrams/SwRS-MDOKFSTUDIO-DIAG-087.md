---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-087
uuid: 378f3d2e-6912-4334-ae6a-420640065815
title: jarPath is read as a trimmed string
description: When the extension reads markdownOkfSchemaStudio.plantuml.jarPath,
  it SHALL trim the value, and SHALL read a value that is not a string as empty.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-012
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## jarPath is read as a trimmed string

### Normative behavior

When the extension reads markdownOkfSchemaStudio.plantuml.jarPath, it SHALL trim the value, and SHALL read a value that is not a string as empty.

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
