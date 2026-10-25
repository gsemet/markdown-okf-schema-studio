---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-028
uuid: 2533c9b7-b593-4b8a-b019-b6f4a7999a04
title: Join a code caption to its block as a title bar
description: When a MyST code-block has a caption, the extension SHALL keep the
  code left-aligned and show the caption as a left-aligned monospace title bar
  joined to the block's top with the same width and border and a square joint.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-014; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CODE-014
---

## Join a code caption to its block as a title bar

### Normative behavior

When a MyST code-block has a caption, the extension SHALL keep the code left-aligned and show the caption as a left-aligned monospace title bar joined to the block's top with the same width and border and a square joint.

### Scenario: nominal behavior

- GIVEN a `{code-block}` with `:caption:`, line numbers and an emphasized line
- WHEN the preview renders it
- THEN the caption is a title bar joined to the top and the numbers and emphasis are intact

### Scenario: boundary or refusal behavior

- GIVEN the light, dark and cream themes
- WHEN the same block is shown in each
- THEN the title bar matches the block's border and width in each theme

### Verification notes

- Method: Stylesheet unit test and the three caption visual scenarios.
- Criteria: Caption styles match the statement in all themes.
