---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-037
uuid: 3d34d61f-90af-4c1e-bbe6-2b134c18a5ff
title: A built-in engine failure shows its reason
description: 'When the built-in engine reports an error or throws, the page SHALL
  show "The built-in PlantUML engine could not render this diagram: " followed by
  the reason as plain text without a leading Java-style class name and the useJar
  hint, show no picture, and set data-render-state to error.'
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-032; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-032
default_owner_email: gaetan@xeberon.net
---

## A built-in engine failure shows its reason

### Normative behavior

When the built-in engine reports an error or throws, the page SHALL show "The built-in PlantUML engine could not render this diagram: " followed by the reason as plain text without a leading Java-style class name and the useJar hint, show no picture, and set data-render-state to error.

### Scenario: Syntax error

- GIVEN a diagram the engine rejects with a reason
- WHEN the page draws it
- THEN the message reads The built-in PlantUML engine could not render this diagram, the reason as text and the useJar hint, state error, and the source is kept

### Scenario: Class prefix and empty reason

- GIVEN a reason beginning with java.lang.IllegalStateException followed by a colon, and an empty reason
- WHEN the page builds the message
- THEN the class prefix is removed from the first and the text unknown error is used for the empty one

### Known issues

- Known issue: No diagnostic reaches the status line; only the picture area shows the message.
- Known issue: A plain engine error without a refused include is kept by the result cache and shown again from memory (see the cache requirement).

### Verification notes

- Method: Unit test of an engine failure.
- Criteria: The reason is text, the prefix is stripped.
