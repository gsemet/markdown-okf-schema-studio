---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-020
uuid: 2f861c2d-576a-47be-a88e-b3ae5c5a39c6
title: Confirm a copy with a Copied state for 1.5 seconds
description: When the reader clicks the copy button, the extension SHALL label
  the button Copied with a check mark and restore Copy code after 1.5 s.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Confirm a copy with a Copied state for 1.5 seconds

### Normative behavior

When the reader clicks the copy button, the extension SHALL label the button Copied with a check mark and restore Copy code after 1.5 s.

### Scenario: nominal behavior

- GIVEN the reader has clicked Copy code
- WHEN 1.5 s pass
- THEN the button returns to Copy code without the check mark

### Scenario: boundary or refusal behavior

- GIVEN the reader clicks the button twice within 1.5 s
- WHEN the second click happens
- THEN the Copied state lasts 1.5 s from the second click

### Verification notes

- Method: Unit test with fake timers.
- Criteria: Label and icon change at click and reset 1500 ms after the last click.
