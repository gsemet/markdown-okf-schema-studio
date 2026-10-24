---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-023
uuid: c8683b18-9d80-46cf-adb0-350559459b90
title: Notebook output references show a note and a warning
description: When a document holds a notebook output reference such as `#tbl:`
  or an unexecuted `{code-cell}` output, the extension SHALL show a note and a
  warning.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-005
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Notebook output references show a note and a warning

### Normative behavior

When a document holds a notebook output reference such as `#tbl:` or an unexecuted `{code-cell}` output, the extension SHALL show a note and a warning.

### Scenario: Nominal

- GIVEN an unexecuted `{code-cell}` output
- WHEN the preview renders
- THEN a note and a warning are shown

### Scenario: Boundary or refusal

- GIVEN a `#tbl:` notebook output reference
- WHEN the preview renders
- THEN a note and a warning are shown

### Verification notes

- Method: test
- Criteria: Both cases are warned.
