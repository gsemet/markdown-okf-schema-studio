---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-025
uuid: c1d0cde7-7b46-478e-85d1-247437358183
title: Checkbox clicks are refused during an open edit
description: When a block editor or the frontmatter editor is open, the
  extension SHALL refuse a checkbox click and show 'Save or cancel this edit
  before toggling a checkbox.' in the editor status.
project: markdown-okf-schema-studio
scope: gfm
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-003
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
---

## Checkbox clicks are refused during an open edit

### Normative behavior

When a block editor or the frontmatter editor is open, the extension SHALL refuse a checkbox click and show 'Save or cancel this edit before toggling a checkbox.' in the editor status.

### Scenario: Block editor open

- GIVEN an open block editor
- WHEN a checkbox is clicked
- THEN no message is sent and the status shows the reason

### Scenario: Frontmatter editor open

- GIVEN an open frontmatter editor
- WHEN a checkbox is clicked
- THEN the same refusal is shown

### Verification notes

- Method: Page unit test.
- Criteria: No toggle message is sent while an edit is open.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-GFM-003](../../strs/gfm/StRS-MDOKFSTUDIO-GFM-003.md): A writer toggles task checkboxes from the preview
- Superseded by:
  - [SwRS-MDOKFSTUDIO-BLOCK-041](../block-editing/SwRS-MDOKFSTUDIO-BLOCK-041.md): One edit at a time: an open editor blocks other edits, opens and refreshes
<!-- okf:links:end -->
