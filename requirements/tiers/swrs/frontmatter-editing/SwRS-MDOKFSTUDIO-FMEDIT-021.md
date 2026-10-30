---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-021
uuid: 95d8c126-2370-4c3d-bbb3-1f1e09d7cee8
title: Turning edit mode off closes a field editor without saving
description: "When a writer turns edit mode off while a field editor is open, the
  extension SHALL close the editor without posting its value."
project: markdown-okf-schema-studio
scope: frontmatter-editing
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-FMEDIT-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-FMEDIT-019
default_owner_email: gaetan@xeberon.net
---

## Turning edit mode off closes a field editor without saving

### Normative behavior

When a writer turns edit mode off while a field editor is open, the extension SHALL close the editor without posting its value.

### Scenario: Nominal

- GIVEN a field editor with text typed and not saved
- WHEN the writer turns edit mode off
- THEN the editor closes, the cell shows the original value again and no save is posted

### Scenario: Boundary or refusal

- GIVEN an open block editor with unsaved changes
- WHEN the writer turns edit mode off
- THEN the block is saved, which is the difference with a field editor

### Known issues

- Known issue: leaving edit mode discards a typed but unsaved field value, while block editors save theirs.

### Verification notes

- Method: Unit test turning edit mode off closes a field editor without a save but saves a changed block editor in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: closeFrontmatterEditor is called without a save; the block editor path posts a final save.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-FMEDIT-001](../../strs/frontmatter-editing/StRS-MDOKFSTUDIO-FMEDIT-001.md): A writer edits metadata values in place with fitting controls
- Superseded by:
  - [SwRS-MDOKFSTUDIO-FMEDIT-019](SwRS-MDOKFSTUDIO-FMEDIT-019.md): A field editor saves a changed value and Escape cancels it
<!-- okf:links:end -->
