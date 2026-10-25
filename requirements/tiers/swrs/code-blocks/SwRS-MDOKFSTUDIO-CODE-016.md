---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-016
uuid: 916664ff-d92a-4831-bccf-4a34c6c02f84
title: Keep code backgrounds soft and readable in the forced white and cream
  themes
description: When the white or cream theme is forced, the extension SHALL give
  code blocks a soft background and readable text.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-007; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CODE-007
---

## Keep code backgrounds soft and readable in the forced white and cream themes

### Normative behavior

When the white or cream theme is forced, the extension SHALL give code blocks a soft background and readable text.

### Scenario: nominal behavior

- GIVEN the cream theme is forced and a Python block is shown
- WHEN the preview renders it
- THEN the block has a soft background and readable text

### Scenario: boundary or refusal behavior

- GIVEN the white theme is forced and a Python block is shown
- WHEN the preview renders it
- THEN its text stays readable on the soft background

### Verification notes

- Method: Stylesheet unit test.
- Criteria: Rules for white and cream set a soft background and readable text colour.
