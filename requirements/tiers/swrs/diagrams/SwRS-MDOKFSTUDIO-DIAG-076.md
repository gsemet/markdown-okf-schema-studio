---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-076
uuid: ad90d60d-7164-4897-a897-9a439c33151d
title: The useJar setting is contributed with an explanation
description: When the extension is installed, it SHALL contribute the boolean
  setting markdownOkfSchemaStudio.plantuml.useJar with default false, order 79
  and a Markdown description of the engine choice.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-024; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-024
---

## The useJar setting is contributed with an explanation

### Normative behavior

When the extension is installed, it SHALL contribute the boolean setting markdownOkfSchemaStudio.plantuml.useJar with default false, order 79 and a Markdown description of the engine choice.

### Scenario: Contribution

- GIVEN the extension manifest
- WHEN the setting is read
- THEN it is a boolean with default false and order 79, with a description of at most 700 characters

### Scenario: Unique order

- GIVEN the other contributed settings
- WHEN their orders are compared
- THEN no other setting has order 79

### Known issues

- Known issue: The description still says the JAR is needed for !include files, although local includes now work in the built-in engine (the description is stale).

### Verification notes

- Method: Unit tests: every contributed setting is explained with a unique order; the built-in engine ships pinned and the JAR is an explicit opt-in.
- Criteria: Type, default, order and description limit hold.
