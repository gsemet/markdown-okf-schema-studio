---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-036
uuid: 2824f5f8-b36a-4598-a6a6-a088b0833b18
title: Show diff blocks as a full-width square panel
description: When a `diff` or `patch` block is shown, the extension SHALL
  display it as a full-width panel with square corners and no border.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-008; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-008
default_owner_email: gaetan@xeberon.net
---

## Show diff blocks as a full-width square panel

### Normative behavior

When a `diff` or `patch` block is shown, the extension SHALL display it as a full-width panel with square corners and no border.

### Scenario: nominal behavior

- GIVEN a `diff` block in a prose paragraph context
- WHEN the preview renders it
- THEN the panel spans the block width with square corners and no border

### Scenario: boundary or refusal behavior

- GIVEN a `diff` block nested in a list or admonition
- WHEN the preview renders it
- THEN the panel spans its container width with the same square, borderless look

### Verification notes

- Method: Stylesheet unit test and the diff visual scenarios.
- Criteria: Computed radius 0, border none, width equal to container.
