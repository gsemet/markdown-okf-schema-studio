---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-073
uuid: 78d64147-f26b-4847-bdb0-7c8deba12437
title: The figure editor and the Start writing Enter shortcut ignore input while
  a field editor is open
description: While a field editor is open, the extension SHALL ignore the Edit
  figure button and the document-wide Enter shortcut of the empty-document Start
  writing insert point.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The figure editor and the Start writing Enter shortcut ignore input while a field editor is open

### Normative behavior

While a field editor is open, the extension SHALL ignore the Edit figure button and the document-wide Enter shortcut of the empty-document Start writing insert point.

Known issue: clicking a plus insert point still opens a block editor while a field editor is open (see SwRS-MDOKFSTUDIO-FMEDIT-002).

### Scenario: Nominal

- GIVEN a field editor open in edit mode
- WHEN the writer presses Edit figure on a figure
- THEN no figure editor opens

### Scenario: Boundary or refusal

- GIVEN an empty document in edit mode with a field editor open
- WHEN the writer presses Enter
- THEN no block editor opens from the Start writing insert point

### Verification notes

- Method: Inspection of openFigureEditor (src/page/features/editorChrome.ts) and the Enter key handler bound by bindKeys (src/page/features/insertPoints.ts).
- Criteria: Both return when activeFrontmatterEdit is set.
