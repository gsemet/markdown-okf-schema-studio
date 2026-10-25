---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-112
uuid: 8d224e09-d76b-4f03-983c-3a2806769fb6
title: Unsupported directives never reach the engine or the host
description: "When a built-in diagram has a line starting with !includeurl, !includedef
  or !import, an include of a URL or of a library name in angle brackets, or a !theme
  with from, the page SHALL NOT run the engine or ask the host for a file."
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
---

## Unsupported directives never reach the engine or the host

### Normative behavior

When a built-in diagram has a line starting with !includeurl, !includedef or !import, an include of a URL or of a library name in angle brackets, or a !theme with from, the page SHALL NOT run the engine or ask the host for a file.

### Scenario: Directive found

- GIVEN a diagram with an include of a library name in angle brackets
- WHEN the page draws it
- THEN the engine is not run and no previewPlantUmlInclude message is sent

### Scenario: Local include

- GIVEN a diagram with an include of a local file only
- WHEN the page draws it
- THEN the file is asked of the host and the engine runs

### Verification notes

- Method: Unit test: a diagram with a standard-library include shows the useJar hint, keeps its source and never reaches the engine.
- Criteria: No engine call and no host request for an unsupported directive.
