---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-024
uuid: d5466ea6-31bd-4913-9d02-8cc7b94ddf59
title: List diagnostics with file, line and severity
description: 'When a render yields diagnostics, the extension SHALL list each in the
  status region as a file, a line and a message with a severity.'
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## List diagnostics with file, line and severity

### Normative behavior

When a render yields diagnostics, the extension SHALL list each in the status region as a file, a line and a message with a severity.

### Scenario: Nominal list diagnostics with file, line and severity

- GIVEN a render with one warning on line 3
- WHEN it is displayed
- THEN the status region shows the file, line 3 and the message with the warning severity

### Scenario: Boundary or refusal of list diagnostics with file, line and severity

- GIVEN a render without diagnostics
- WHEN it is displayed
- THEN the diagnostic list is empty

### Verification notes

- Method: test
- Criteria: Each listed item shows file, line, message and severity.
