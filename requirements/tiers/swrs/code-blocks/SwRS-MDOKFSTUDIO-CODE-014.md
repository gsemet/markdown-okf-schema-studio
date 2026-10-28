---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-014
uuid: f44ed6b3-fbc4-4996-9ec8-5e4146b33b5d
title: A code directive shows its file name or caption above the code
description: When a MyST code directive sets `:filename:` or `:caption:`, the
  extension SHALL show the file name above the code in smaller muted text, and
  render a caption with a `:label:` as a figure whose id is the label, joined to
  the block's top as a left-aligned monospace title bar.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
- src/core/render/highlight.ts
- src/core/render/mystNormalize.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/core/render/mystFeatures.test.ts
default_owner_email: gaetan@xeberon.net
---

## A code directive shows its file name or caption above the code

### Normative behavior

When a MyST code directive sets `:filename:` or `:caption:`, the extension SHALL show the file name above the code in smaller muted text, and render a caption with a `:label:` as a figure whose id is the label, joined to the block's top as a left-aligned monospace title bar.

### Scenario (nominal): A file name is shown above the code

- GIVEN a `{code-block}` with `:filename: example.py`
- WHEN the preview renders it
- THEN `example.py` appears above the code in smaller muted text

### Scenario (refusal): No file name option, no file name line

- GIVEN a code directive without `:filename:`
- WHEN the preview renders it
- THEN no file name line is present

### Scenario (nominal): A captioned directive is a figure with a reference target

- GIVEN a `{code-block}` with `:caption: Demo` and `:label: code:numbered`
- WHEN the preview renders it
- THEN a figure with id `code:numbered` shows the caption `Demo`, usable as a `{ref}` target

### Scenario (boundary): A caption without a label has no reference id

- GIVEN a code directive with a caption but no label
- WHEN the preview renders it
- THEN a captioned figure appears without a reference id

### Scenario (nominal): The caption is a title bar joined to the block

- GIVEN a `{code-block}` with `:caption:`, line numbers and an emphasized line
- WHEN the preview renders it
- THEN the code stays left-aligned, the caption is a left-aligned monospace title bar joined to the block's top with the same width and border and a square joint, and the numbers and emphasis are intact

### Scenario (boundary): The title bar matches the block in every theme

- GIVEN the light, dark and cream themes
- WHEN the same block is shown in each
- THEN the title bar matches the block's border and width in each theme

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-005: numbers and emphasizes the lines of a code directive

### Verification notes

- Method: test/core/render/mystFeatures.test.ts (file name present only when the option is set, figure id equals the label, caption without label)
- Method: test/core/preview/previewStyles.test.ts (title bar styles in all themes) and the three caption visual scenarios
- Criteria: the file-name element is present only when the option is set; figure id equals the label and the caption text is present; caption styles match the statement in all themes
