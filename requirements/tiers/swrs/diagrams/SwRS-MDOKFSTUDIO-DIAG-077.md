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
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
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
