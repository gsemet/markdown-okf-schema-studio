---
type: SwRS
id: SwRS-MDOKFSTUDIO-DIAG-097
uuid: bf193063-df1c-402e-99f8-b437900dcd45
title: Process error text is capped at 64 KiB
description: When a failed PlantUML process writes more than 64 KiB of error
  output, the extension SHALL keep the first 64 KiB and add [stderr truncated at
  64 KiB] to the message.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-DIAG-014
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Process error text is capped at 64 KiB

### Normative behavior

When a failed PlantUML process writes more than 64 KiB of error output, the extension SHALL keep the first 64 KiB and add [stderr truncated at 64 KiB] to the message.

### Scenario: Chatty process

- GIVEN a failing process that writes more than 64 KiB to its error output
- WHEN the diagram is rendered
- THEN the message holds at most 64 KiB of error text followed by the truncation note

### Scenario: Small output

- GIVEN a failing process with a short error output
- WHEN the diagram is rendered
- THEN the whole text is shown with no note

### Verification notes

- Method: Unit test: caps stderr at 64 KiB and notes the truncation.
- Criteria: Cap and note.
