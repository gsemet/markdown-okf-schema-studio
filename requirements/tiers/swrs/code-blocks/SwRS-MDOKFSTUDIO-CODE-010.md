---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-010
uuid: d1f06da5-ff14-49b6-b5c7-d9e544e7378c
title: Use system colours for diff lines in forced-colours mode
description: When the page runs in forced-colours mode, the extension SHALL
  colour diff additions with the system Mark colour and deletions with the
  system Highlight colour.
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
superseded_by: SwRS-MDOKFSTUDIO-CODE-008
---

## Use system colours for diff lines in forced-colours mode

### Normative behavior

When the page runs in forced-colours mode, the extension SHALL colour diff additions with the system Mark colour and deletions with the system Highlight colour.

### Scenario: nominal behavior

- GIVEN forced-colours mode is active and a diff block is shown
- WHEN the preview renders it
- THEN additions use the Mark colours and deletions the Highlight colours

### Scenario: boundary or refusal behavior

- GIVEN forced-colours mode is inactive
- WHEN the preview renders the same block
- THEN the theme-aware addition and deletion colours apply instead

### Verification notes

- Method: Inspection of the forced-colours media rules or a forced-colours browser run.
- Criteria: The rules exist inside the forced-colours media query for both line classes.
