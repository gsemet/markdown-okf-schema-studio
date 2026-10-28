---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-073
uuid: 78d64147-f26b-4847-bdb0-7c8deba12437
title: The figure editor and the Start writing Enter shortcut ignore input while
  a field editor is open
description: "While a field editor is open, the extension SHALL ignore the Edit figure
  button and the document-wide Enter shortcut of the empty-document Start writing
  insert point."
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-BLOCK-041; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-BLOCK-041
default_owner_email: gaetan@xeberon.net
---

## The figure editor and the Start writing Enter shortcut ignore input while a field editor is open

### Normative behavior

While a field editor is open, the extension SHALL ignore the Edit figure button and the document-wide Enter shortcut of the empty-document Start writing insert point.

### Scenario: Nominal

- GIVEN a field editor open in edit mode
- WHEN the writer presses Edit figure on a figure
- THEN no figure editor opens

### Scenario: Boundary or refusal

- GIVEN an empty document in edit mode with a field editor open
- WHEN the writer presses Enter
- THEN no block editor opens from the Start writing insert point

### Verification notes

- Method: Unit test the Edit figure button and the Start writing Enter shortcut ignore input while a field editor is open in test/page/fmtableReqFrontmatter.requirements.test.ts.
- Criteria: Both return when activeFrontmatterEdit is set.
