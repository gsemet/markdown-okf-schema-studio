---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-035
uuid: 6141713c-27d1-4112-9cd9-6a6bca6d9c9e
title: A theme read from a folder is refused
description: When the built-in engine asks for a !theme read from a folder or a
  URL, the page SHALL refuse it even if the pre-scan did not catch the
  directive, and the diagram SHALL show the include failure message.
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

## A theme read from a folder is refused

### Normative behavior

When the built-in engine asks for a !theme read from a folder or a URL, the page SHALL refuse it even if the pre-scan did not catch the directive, and the diagram SHALL show the include failure message.

### Scenario: Theme from a folder

- GIVEN a loader request of kind theme
- WHEN the engine asks for the theme file
- THEN the loader answers with an error saying the theme is not available in the built-in PlantUML engine

### Scenario: Failure recorded

- GIVEN the same refusal during a render
- WHEN the render finishes
- THEN the diagram shows the failure reason as its message with state error and the result is not kept

### Verification notes

- Method: Unit test: a local theme folder is refused by the loader even past the pre-scan.
- Criteria: No theme file is read.
