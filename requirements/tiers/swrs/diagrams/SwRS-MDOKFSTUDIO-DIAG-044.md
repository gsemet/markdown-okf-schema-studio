---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-044
uuid: ca1105f6-bbdc-4640-a418-66daeb1eeee4
title: A content patch draws only new built-in diagrams
description: "When the preview content is patched in place, the page SHALL draw the
  built-in diagrams that have no render state and leave the others untouched."
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-006
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-DIAG-039; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-DIAG-039
---

## A content patch draws only new built-in diagrams

### Normative behavior

When the preview content is patched in place, the page SHALL draw the built-in diagrams that have no render state and leave the others untouched.

### Scenario: New diagram

- GIVEN a patch that adds a PlantUML diagram next to a drawn one
- WHEN the page signals the replaced content
- THEN only the new diagram is drawn

### Scenario: Same source

- GIVEN a patch that replaces a node with the same source and variant
- WHEN the page draws it
- THEN the kept result is shown and the engine is not run

### Known issues

- Known issue: The event wiring in plantumlPreview.ts is covered by the visual run only.

### Verification notes

- Method: Unit tests that page events reach the diagram renderers; visual scenarios diagrams v15 and v16.
- Criteria: Only diagrams without a render state are drawn.
