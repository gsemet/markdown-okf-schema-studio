---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-014
uuid: f44ed6b3-fbc4-4996-9ec8-5e4146b33b5d
title: Show the file name of a code directive above its code
description: When a MyST code directive sets `:filename:`, the extension SHALL
  show the file name above the code in smaller muted text.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Show the file name of a code directive above its code

### Normative behavior

When a MyST code directive sets `:filename:`, the extension SHALL show the file name above the code in smaller muted text.

### Scenario: nominal behavior

- GIVEN a `{code-block}` with `:filename: example.py`
- WHEN the preview renders it
- THEN `example.py` appears above the code in smaller muted text

### Scenario: boundary or refusal behavior

- GIVEN a code directive without `:filename:`
- WHEN the preview renders it
- THEN no file name line is present

### Verification notes

- Method: Unit test on MyST rendering.
- Criteria: File-name element present only when the option is set.
