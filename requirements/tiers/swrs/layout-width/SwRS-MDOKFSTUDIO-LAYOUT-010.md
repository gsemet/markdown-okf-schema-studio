---
type: SwRS
id: SwRS-MDOKFSTUDIO-LAYOUT-010
uuid: a803d475-19ca-48de-92bc-3aa99b3669a3
title: The Start writing button starts 40 px below the top
description: When an empty document is shown in edit mode, the extension SHALL
  start the Start writing button 40 px below the top of the pane.
project: markdown-okf-schema-studio
scope: layout-width
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LAYOUT-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## The Start writing button starts 40 px below the top

### Normative behavior

When an empty document is shown in edit mode, the extension SHALL start the Start writing button 40 px below the top of the pane.

### Scenario: Button in each theme

- GIVEN an empty document, edit mode on, Margin width mode, light and dark themes
- WHEN the preview is rendered
- THEN the Start writing button starts 40 px (within 4 px) below the top

### Scenario: Other width modes

- GIVEN the same empty document in Auto and in Full width
- WHEN the preview is rendered
- THEN the button still starts 40 px (within 4 px) below the top

### Known issues

- Known issue: CHANGELOG entry 0.2.1 describes a 24 px margin for this button; the uniform 40 px replaces it.

### Verification notes

- Method: Visual scenarios v39 to v41, v54, v59 and v62 (first-element gap, empty state).
- Criteria: The measured top of the button is 40 px within 4 px in every case.
