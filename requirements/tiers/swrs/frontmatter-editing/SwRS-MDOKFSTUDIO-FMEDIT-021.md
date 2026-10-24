---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-021
uuid: 95d8c126-2370-4c3d-bbb3-1f1e09d7cee8
title: Turning edit mode off closes a field editor without saving
description: When a writer turns edit mode off while a field editor is open, the
  extension SHALL close the editor without posting its value.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Turning edit mode off closes a field editor without saving

### Normative behavior

When a writer turns edit mode off while a field editor is open, the extension SHALL close the editor without posting its value.

Known issue: leaving edit mode discards a typed but unsaved field value, while block editors save theirs.

### Scenario: Nominal

- GIVEN a field editor with text typed and not saved
- WHEN the writer turns edit mode off
- THEN the editor closes, the cell shows the original value again and no save is posted

### Scenario: Boundary or refusal

- GIVEN an open block editor with unsaved changes
- WHEN the writer turns edit mode off
- THEN the block is saved, which is the difference with a field editor

### Verification notes

- Method: Inspection of applyEditMode (src/page/features/editMode.ts) and unit test on the page runtime.
- Criteria: closeFrontmatterEditor is called without a save; the block editor path posts a final save.
