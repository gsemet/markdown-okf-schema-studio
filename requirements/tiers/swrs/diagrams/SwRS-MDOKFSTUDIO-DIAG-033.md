---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-033
uuid: cb33b4e6-2f1f-4075-ac47-d5b1224efcb9
title: The library loaders of the built-in engine refuse every request
description: When the built-in engine asks for a standard-library bundle or an
  optional script such as emoji, the page SHALL refuse the request with an error
  and SHALL NOT add a script tag or fetch anything.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The library loaders of the built-in engine refuse every request

### Normative behavior

When the built-in engine asks for a standard-library bundle or an optional script such as emoji, the page SHALL refuse the request with an error and SHALL NOT add a script tag or fetch anything.

### Scenario: Library bundle

- GIVEN the loaders installed for the engine
- WHEN the engine asks for a library URL
- THEN the loader answers with an error saying it is not available in the built-in PlantUML engine

### Scenario: No remote base

- GIVEN the engine globals after installation
- WHEN they are inspected
- THEN no standard-library base address is set, so no remote server is named

### Known issues

- Known issue: A refused emoji script surfaces as the generic engine failure message.

### Verification notes

- Method: Unit test of the installed loaders.
- Criteria: Every library request ends in an error and nothing is loaded.
