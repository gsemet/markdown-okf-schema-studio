---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-045
uuid: 75936e60-1469-4f21-b56e-846e2cec51bb
title: The host refuses a rename when the label line changed
description: When the line of a rename is no longer exactly `(old)=`, the
  extension SHALL change nothing and answer The label is no longer on that line.
  Refresh the preview, without searching other lines.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-010
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The host refuses a rename when the label line changed

### Normative behavior

When the line of a rename is no longer exactly `(old)=`, the extension SHALL change nothing and answer The label is no longer on that line. Refresh the preview, without searching other lines.

### Scenario: Nominal

- GIVEN the line edited to something else
- WHEN a rename request arrives
- THEN the refusal is returned and nothing changes

### Scenario: Boundary or refusal

- GIVEN the same label present on another line
- WHEN a rename request arrives
- THEN that other line is not touched

### Verification notes

- Method: test
- Criteria: Only the stated line is checked.
